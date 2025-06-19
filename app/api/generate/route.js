import OpenAI from "openai";
import { kv } from '@vercel/kv';
import { Ratelimit } from '@upstash/ratelimit'; // Optional: Add rate limiting
import { createClient } from '../../../lib/supabase/server'; // <-- Add Supabase server client import
import { NextResponse } from 'next/server'; // <-- Add NextResponse import

export const dynamic = 'force-dynamic'; // Ensures the route is always dynamic

// Optional: Initialize Rate Limiter (e.g., 5 requests per minute)
const ratelimit = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per 1 minute
      analytics: true,
      prefix: '@upstash/ratelimit',
    })
  : null;

// --- OpenAI Model IDs ---
const OPENAI_TEXT_MODEL = "gpt-4o"; // or "gpt-4-turbo" for cheaper/faster
// const OPENAI_IMAGE_MODEL = "dall-e-3"; // For future image support

// --- Plan Limits --- 
const PLAN_LIMITS = {
  free: {
    text: 10,
    image: 5,
  },
  basic: {
    text: 100,
    image: 50,
  },
  pro: {
    text: Infinity, // Unlimited text
    image: 200,
  },
  business: {
    text: Infinity, // Unlimited text
    image: 500,
  },
  // Add pay-as-you-go if needed, though limits might not apply directly
};

export async function POST(request) {
  // Optional: Rate Limiting Check
  if (ratelimit) {
    const identifier = request.ip ?? '127.0.0.1';
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);
    if (!success) {
      return Response.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: { 'X-RateLimit-Limit': limit.toString(), 'X-RateLimit-Remaining': remaining.toString(), 'X-RateLimit-Reset': reset.toString() } }
      );
    }
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // --- Parse Request Body (common to all users) ---
  let requestData;
  let inputType;
  try {
    requestData = await request.json();
    inputType = requestData.type;
    if (!inputType || (inputType !== 'text' && inputType !== 'image')) {
      throw new Error("Invalid input type specified. Must be 'text' or 'image'.");
    }
    if (inputType === 'text' && (!requestData.prompt || !requestData.prompt.topic || !requestData.prompt.platform || !requestData.prompt.tone)) {
      throw new Error("Missing required fields for text input: prompt.{topic, platform, tone}");
    }
    if (inputType === 'image' && (!requestData.imageData || !requestData.prompt || !requestData.prompt.platform || !requestData.prompt.tone || !requestData.prompt.category)) {
      throw new Error("Missing required fields for image input: imageData, prompt.{platform, tone, category}");
    }
  } catch (e) {
    console.error('[REQUEST_PARSE_ERROR]', e);
    return Response.json({ error: `Invalid request body: ${e.message}` }, { status: 400 });
  }

  let usageUpdatePayload = {};
  let usageNeedsDbUpdate = false;

  // --- AUTHENTICATED USER FLOW ---
  if (user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan, monthly_text_generations_used, monthly_image_generations_used, usage_reset_date')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error(`[USAGE_CHECK_ERROR] User: ${user.id}, Error fetching profile:`, profileError);
      return Response.json({ error: 'Could not retrieve user profile information.' }, { status: 500 });
    }

    let { plan, monthly_text_generations_used, monthly_image_generations_used, usage_reset_date } = profile;
    plan = plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    const today = new Date();
    if (!usage_reset_date || new Date(usage_reset_date) <= today) {
      console.log(`[USAGE_RESET] User: ${user.id}, Plan: ${plan}. Resetting usage counts.`);
      const nextReset = new Date(today); nextReset.setDate(today.getDate() + 30);
      monthly_text_generations_used = 0;
      monthly_image_generations_used = 0;
      usage_reset_date = nextReset.toISOString().split('T')[0];
      usageUpdatePayload = { monthly_text_generations_used: 0, monthly_image_generations_used: 0, usage_reset_date: usage_reset_date };
      usageNeedsDbUpdate = true;
    }

    let overLimit = (inputType === 'text' && monthly_text_generations_used >= limits.text) ||
                    (inputType === 'image' && monthly_image_generations_used >= limits.image);

    if (overLimit) {
      console.warn(`[USAGE_LIMIT_REACHED] User: ${user.id}, Plan: ${plan}, Type: ${inputType}`);
      if (usageNeedsDbUpdate) {
        await supabase.from('profiles').update({ ...usageUpdatePayload, updated_at: new Date() }).eq('id', user.id);
      }
      return Response.json(
        { error: `Monthly ${inputType} generation limit (${limits[inputType]}) reached for your ${plan} plan. Please upgrade or wait until ${usage_reset_date}.` },
        { status: 429 }
      );
    }

    // Prepare to increment usage count on success
    const incrementColumn = inputType === 'text' ? 'monthly_text_generations_used' : 'monthly_image_generations_used';
    const currentUsage = inputType === 'text' ? monthly_text_generations_used : monthly_image_generations_used;
    usageUpdatePayload[incrementColumn] = currentUsage + 1;
    usageNeedsDbUpdate = true;
  }
  // --- END AUTHENTICATED FLOW (Trial users skip this block) ---

  // --- GENERATION LOGIC (for all users) ---
  try {
    if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key is not configured.");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let generatedCaption = "";

    if (inputType === 'text') {
      const { topic, platform, tone } = requestData.prompt;
      let textPrompt = `Generate a ${platform} caption in a ${tone} tone about the following topic: ${topic}. Keep it concise and engaging.`;
      if (requestData.kenyanize) textPrompt += ' Kenyanize the caption: use Kenyan slang, references, and local style.';
      const completion = await openai.chat.completions.create({
        model: OPENAI_TEXT_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that writes catchy and concise social media captions.' },
          { role: 'user', content: textPrompt },
        ],
        max_tokens: 175, temperature: 0.65,
      });
      generatedCaption = completion.choices[0]?.message?.content?.trim() || '';
    } else if (inputType === 'image') {
      // Image generation logic remains unchanged, currently returns error
      throw new Error('Image captioning is not yet supported with OpenAI backend.');
    }

    if (!generatedCaption) throw new Error("AI returned an empty caption.");

    // --- SUCCESS: Update DB only for authenticated users ---
    if (user && usageNeedsDbUpdate) {
      usageUpdatePayload.updated_at = new Date();
      const { error: updateError } = await supabase.from('profiles').update(usageUpdatePayload).eq('id', user.id);
      if (updateError) {
        console.error(`[USAGE_UPDATE_ERROR] User: ${user.id}, Failed to update usage:`, updateError);
      }
    }

    return Response.json({ caption: generatedCaption });

  } catch (error) {
    console.error('[AI_ERROR]', error);
    return Response.json({ error: error.message || "Caption generation failed." }, { status: 500 });
  }
}