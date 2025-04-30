import Replicate from 'replicate';
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

// --- Model IDs ---
const TEXT_MODEL_ID = "microsoft/phi-3-mini-4k-instruct:e17386e6ae2e351f63783fa89f427fd0ed415524a7b3d8c122f6ac80ad0166b1";
// Trying the version hash from Replicate docs example
const IMAGE_MODEL_ID = "yorickvp/llava-13b:01359160a4cff57c6b7d4dc625d0019d390c7c46f553714069f114b392f4a726"; 

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
    // Initialize Replicate
    if (!process.env.REPLICATE_API_KEY) {
       throw new Error("Replicate API key is not configured.");
    }
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_KEY,
    });

    let replicateInput = {};
    let modelToRun = TEXT_MODEL_ID;
    let promptForLlava = '';

    if (inputType === 'text') {
      const { topic, platform, tone } = requestData.prompt;
      const textPrompt = `[INST] Generate a ${platform} caption in a ${tone} tone about the following topic: ${topic}. Keep it concise and engaging. [/INST]`;
      console.log(`[TEXT_MODE] Prompt: ${textPrompt}`);
      replicateInput = {
        prompt: textPrompt,
        max_new_tokens: 175,
        temperature: 0.65,
      };
    } else { // inputType === 'image'
      const { platform, tone, category, keywords, name } = requestData.prompt;
      const { imageData } = requestData; // imageData is expected to be a Data URI (e.g., "data:image/jpeg;base64,...")
      modelToRun = IMAGE_MODEL_ID;
      // ---> Conditionally add keywords and name to the prompt
      let keywordInstruction = keywords ? ` Include keywords: ${keywords}.` : '';
      let nameInstruction = name ? ` The subject's name is ${name}.` : ''; // Add name instruction
      promptForLlava = `Generate a ${platform} caption for this image, which is related to ${category}, in a ${tone} tone.${nameInstruction}${keywordInstruction} Focus on the main subject and action. Keep it concise.`;
      console.log(`[IMAGE_MODE] Prompt: ${promptForLlava}`);
      replicateInput = {
        image: imageData,
        prompt: promptForLlava, 
        max_tokens: 100, // LLaVA uses max_tokens, adjust as needed
        temperature: 0.2 // LLaVA examples often use lower temperature
      };
    }

    console.log(`[REPLICATE_CALL] Model: ${modelToRun}`);

    // Call Replicate API
    const output = await replicate.run(modelToRun, { input: replicateInput });

    // Process output (LLaVA returns an array of strings)
    const generatedCaption = Array.isArray(output) ? output.join('').trim() : String(output).trim();
    console.log(`[REPLICATE_SUCCESS] Caption: ${generatedCaption}`);

    if (!generatedCaption) {
        throw new Error("AI returned an empty caption.");
    }

    // --- SUCCESS: Increment Usage Count --- 
    console.log(`[USAGE_INCREMENT] User: ${user.id}, Plan: ${plan}, Type: ${inputType}`);
    let incrementColumn = inputType === 'text' ? 'monthly_text_generations_used' : 'monthly_image_generations_used';
    
    // Merge increments with potential reset updates
    updates[incrementColumn] = (inputType === 'text' ? monthly_text_generations_used : monthly_image_generations_used) + 1;
    updates.updated_at = new Date(); // Ensure updated_at is set

    // Use the existing supabase client
    const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

    if (updateError) {
        // Log error but still return caption as generation succeeded
        console.error(`[USAGE_UPDATE_ERROR] User: ${user.id}, Failed to increment ${incrementColumn}:`, updateError);
    }
    // --- End Increment Usage Count ---

    return Response.json({ caption: generatedCaption });

  } catch (error) {
    console.error('[AI_ERROR]', error);
    const errorMessage = error.response?.data?.detail || error.message || "Caption generation failed. Please try again.";
    
    // Check for specific Replicate model errors if needed
    // if (errorMessage.includes(...)) { ... }

    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 