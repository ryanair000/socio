import Replicate from 'replicate';
import { kv } from '@vercel/kv';
import { Ratelimit } from '@upstash/ratelimit'; // Optional: Add rate limiting

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
    let promptForLlava = ''; // Only used for image model

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
      const { platform, tone, category } = requestData.prompt;
      const { imageData } = requestData; // imageData is expected to be a Data URI (e.g., "data:image/jpeg;base64,...")
      modelToRun = IMAGE_MODEL_ID;
      // Construct a suitable prompt for the image model
      promptForLlava = `Generate a ${platform} caption for this image, which is related to ${category}, in a ${tone} tone. Focus on the main subject and action. Keep it concise.`;
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