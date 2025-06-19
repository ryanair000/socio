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
    // --- Parse Request Data Early ---
    let requestData;
    let inputType;
    try {
      requestData = await request.json();
      inputType = requestData.type;
      if (!inputType || (inputType !== 'text' && inputType !== 'image')) {
        throw new Error("Invalid input type specified. Must be 'text' or 'image'.");
      }
    } catch (e) {
      console.error('[REQUEST_PARSE_ERROR]', e);
      return Response.json({ error: `Invalid request body: ${e.message}` }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const ip = request.ip ?? '127.0.0.1';

    let usageNeedsUpdate = false;
    let updates = {};
    let monthly_text_generations_used = 0;
    let monthly_image_generations_used = 0;

    // --- Authorize and Check Limits ---
    if (user) {
      // --- AUTHENTICATED USER FLOW ---
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, monthly_text_generations_used, monthly_image_generations_used, usage_reset_date')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return Response.json({ error: 'Could not retrieve user profile.' }, { status: 500 });
      }

      let { plan, usage_reset_date } = profile;
      monthly_text_generations_used = profile.monthly_text_generations_used;
      monthly_image_generations_used = profile.monthly_image_generations_used;
      plan = plan || 'free';
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

      const today = new Date();
      if (!usage_reset_date || new Date(usage_reset_date) <= today) {
        const nextReset = new Date();
        nextReset.setDate(today.getDate() + 30);
        updates = { monthly_text_generations_used: 0, monthly_image_generations_used: 0, usage_reset_date: nextReset.toISOString().split('T')[0] };
        usageNeedsUpdate = true;
      }

      const usage = inputType === 'text' ? monthly_text_generations_used : monthly_image_generations_used;
      const limit = inputType === 'text' ? limits.text : limits.image;

      if (usage >= limit) {
        return Response.json({ error: `Monthly ${inputType} generation limit reached. Please upgrade.` }, { status: 429 });
      }
    } else {
      // --- ANONYMOUS USER (TRIAL) FLOW ---
      const TRIAL_LIMIT = 5; // 5 free generations per day
      const usageKey = `trial_usage:${ip}`;
      const currentUsage = await kv.get(usageKey) || 0;

      if (currentUsage >= TRIAL_LIMIT) {
        return Response.json({ error: `You have reached the trial limit of ${TRIAL_LIMIT} free generations. Please create an account to continue.` }, { status: 429 });
      }
    }

    // --- Proceed with Generation ---
    if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key not configured.");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let generatedCaption = "";

    if (inputType === 'text') {
      const { topic, platform, tone } = requestData.prompt;
      let textPrompt = `Generate a ${platform} caption in a ${tone} tone about the following topic: ${topic}.`;
      if (requestData.kenyanize) textPrompt += ' Kenyanize the caption.';
      const completion = await openai.chat.completions.create({
        model: OPENAI_TEXT_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that writes catchy social media captions.' },
          { role: 'user', content: textPrompt },
        ],
        max_tokens: 175,
        temperature: 0.65,
      });
      generatedCaption = completion.choices[0]?.message?.content?.trim() || '';
    } else {
      throw new Error('Image captioning is not yet supported.');
    }

    if (!generatedCaption) throw new Error("AI returned an empty caption.");

    // --- SUCCESS: Increment Usage Count ---
    if (user) {
      const incrementColumn = inputType === 'text' ? 'monthly_text_generations_used' : 'monthly_image_generations_used';
      const currentCount = inputType === 'text' ? monthly_text_generations_used : monthly_image_generations_used;
      updates[incrementColumn] = (usageNeedsUpdate ? 0 : currentCount) + 1;
      updates.updated_at = new Date();
      await supabase.from('profiles').update(updates).eq('id', user.id);
    } else {
      const usageKey = `trial_usage:${ip}`;
      await kv.incr(usageKey);
      await kv.expire(usageKey, 60 * 60 * 24); // 24-hour expiry
    }

    return Response.json({ caption: generatedCaption });

  } catch (error) {
    console.error('[API_ROUTE_ERROR]', error);
    const errorMessage = error.message || 'An unexpected error occurred.';
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}