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
  try {
  if (ratelimit) {
    const identifier = request.ip ?? '127.0.0.1'; // Use IP address or a user ID if available
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

    if (!success) {
      return Response.json(
        { error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }
  }

  // --- Authentication and Usage Limit Check ---
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // Fetch user profile to check plan and usage
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('plan, monthly_text_generations_used, monthly_image_generations_used, usage_reset_date')
    .eq('id', user.id)
    .single(); // Use single() as each user should have one profile

  if (profileError || !profile) {
    console.error(`[USAGE_CHECK_ERROR] User: ${user.id}, Error fetching profile:`, profileError);
    return Response.json({ error: 'Could not retrieve user profile information.' }, { status: 500 });
  }

  let { plan, monthly_text_generations_used, monthly_image_generations_used, usage_reset_date } = profile;
  plan = plan || 'free'; // Default to free plan if null for some reason

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free; // Fallback to free limits if plan unknown

  // --- Check if Usage Needs Resetting ---
  const today = new Date();
  let usageNeedsUpdate = false;
  let updates = {};

  if (!usage_reset_date || new Date(usage_reset_date) <= today) {
    console.log(`[USAGE_RESET] User: ${user.id}, Plan: ${plan}. Resetting usage counts.`);
    // Calculate next reset date (e.g., first day of next month, or 30 days from now)
    // Simple approach: 30 days from today
    const nextReset = new Date(today);
    nextReset.setDate(today.getDate() + 30);
    
    monthly_text_generations_used = 0; // Reset counters
    monthly_image_generations_used = 0;
    usage_reset_date = nextReset.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    updates = {
        monthly_text_generations_used: 0,
        monthly_image_generations_used: 0,
        usage_reset_date: usage_reset_date,
        updated_at: new Date()
    };
    usageNeedsUpdate = true;
  }

  // --- Parse Request and Check Limits ---
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

  // Check limits based on input type
  let overLimit = false;
  if (inputType === 'text') {
    if (monthly_text_generations_used >= limits.text) {
        overLimit = true;
    }
  } else if (inputType === 'image') {
     if (monthly_image_generations_used >= limits.image) {
        overLimit = true;
    }
  }

  if (overLimit) {
    console.warn(`[USAGE_LIMIT_REACHED] User: ${user.id}, Plan: ${plan}, Type: ${inputType}`);
    // Update reset date if it was recalculated
     if (usageNeedsUpdate) {
        const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', user.id);
        if (updateError) console.error(`[USAGE_UPDATE_ERROR] User: ${user.id}, Failed to update reset date on limit check:`, updateError);
     }
    return Response.json(
      { error: `Monthly ${inputType} generation limit (${limits[inputType]}) reached for your ${plan} plan. Please upgrade or wait until ${usage_reset_date}.` },
      { status: 429 } // 429 Too Many Requests
    );
  }

    // --- Proceed with Generation (Limit check passed) ---
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key is not configured.");
      }
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      let generatedCaption = "";
      if (inputType === 'text') {
        const { topic, platform, tone } = requestData.prompt;
        let textPrompt = `Generate a ${platform} caption in a ${tone} tone about the following topic: ${topic}. Keep it concise and engaging.`;
        if (requestData.kenyanize) {
          textPrompt += ' Kenyanize the caption: use Kenyan slang, references, and local style.';
        }
        console.log(`[OPENAI_TEXT] Prompt: ${textPrompt}`);
        const completion = await openai.chat.completions.create({
          model: OPENAI_TEXT_MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful assistant that writes catchy and concise social media captions.' },
            { role: 'user', content: textPrompt },
          ],
          max_tokens: 175,
          temperature: 0.65,
        });
        generatedCaption = completion.choices[0]?.message?.content?.trim() || '';
      } else if (inputType === 'image') {
        // For future: add Kenyanize logic to image prompt
        const { platform, tone, category, keywords, name } = requestData.prompt;
        const { imageData } = requestData;
        let keywordInstruction = keywords ? ` Include keywords: ${keywords}.` : '';
        let nameInstruction = name ? ` The subject's name is ${name}.` : '';
        let kenyanizeInstruction = requestData.kenyanize ? ' Kenyanize the caption: use Kenyan slang, references, and local style.' : '';
        let promptForImage = `Generate a ${platform} caption for this image, which is related to ${category}, in a ${tone} tone.${nameInstruction}${keywordInstruction}${kenyanizeInstruction} Focus on the main subject and action. Keep it concise.`;
        // Image captioning not yet supported, but prompt is ready for future
        throw new Error('Image captioning is not yet supported with OpenAI backend.');
      }
      if (!generatedCaption) {
        throw new Error("AI returned an empty caption.");
      }
      // --- SUCCESS: Increment Usage Count --- 
      let incrementColumn = inputType === 'text' ? 'monthly_text_generations_used' : 'monthly_image_generations_used';
      updates[incrementColumn] = (inputType === 'text' ? monthly_text_generations_used : monthly_image_generations_used) + 1;
      updates.updated_at = new Date();
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (updateError) {
        console.error(`[USAGE_UPDATE_ERROR] User: ${user.id}, Failed to increment ${incrementColumn}:`, updateError);
      }
      return Response.json({ caption: generatedCaption });
    } catch (error) {
      console.error('[AI_ERROR]', error);
      const errorMessage = error.response?.data?.detail || error.message || "Caption generation failed. Please try again.";
      return Response.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API_ROUTE_ERROR]', error);
    return Response.json(
      { error: 'An unexpected error occurred. Please ensure you are logged in and try again.' },
      { status: 500 }
    );
  }
}