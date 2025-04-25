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

  let promptData;
  try {
    const body = await request.json();
    promptData = body.prompt; // Expecting { prompt: { topic, platform, tone } }
    if (!promptData || !promptData.topic || !promptData.platform || !promptData.tone) {
      throw new Error("Missing required prompt fields: topic, platform, tone");
    }
  } catch (e) {
     console.error('[REQUEST_PARSE_ERROR]', e);
     return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { topic, platform, tone } = promptData;
  const promptHash = `caption:${platform}:${tone}:${topic.toLowerCase().replace(/\s+/g, '-')}`; // Simple hash for caching

  try {
    // Check cache first
    const cachedCaption = await kv.get(promptHash);
    if (cachedCaption) {
      console.log(`[CACHE_HIT] ${promptHash}`);
      return Response.json({ caption: cachedCaption });
    }
     console.log(`[CACHE_MISS] ${promptHash}`);

    // Initialize Replicate
    if (!process.env.REPLICATE_API_KEY) {
       throw new Error("Replicate API key is not configured.");
    }
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_KEY,
    });

    // Construct the prompt for Phi-3-mini
    const fullPrompt = `[INST] Generate a ${platform} caption in a ${tone} tone about the following topic: ${topic}. Keep it concise and engaging. [/INST]`;

    console.log(`[REPLICATE_CALL] Prompt: ${fullPrompt}`);

    // Call Replicate API
    const output = await replicate.run(
      "microsoft/phi-3-mini-4k-instruct:e17386e6ae2e351f63783fa89f427fd0ed415524a7b3d8c122f6ac80ad0166b1",
      {
        input: {
          prompt: fullPrompt,
          max_new_tokens: 175, // As per original context
          temperature: 0.65,   // As per original context
          // Add other parameters if needed, like top_p, repetition_penalty
        }
      }
    );

    // Clean and process the output
    const generatedCaption = output.join('').replace(/<\/?s>/g, '').trim(); // Clean output and remove <s> tags
     console.log(`[REPLICATE_SUCCESS] Caption: ${generatedCaption}`);


    if (!generatedCaption) {
        throw new Error("AI returned an empty caption.");
    }

    // Store in cache (e.g., for 1 hour)
    await kv.set(promptHash, generatedCaption, { ex: 3600 });
    console.log(`[CACHE_SET] ${promptHash}`);


    return Response.json({ caption: generatedCaption });

  } catch (error) {
    console.error('[AI_ERROR]', error);
    // Provide a more specific error if possible
    const errorMessage = error.message.includes("empty caption")
        ? "AI returned an empty caption. Try rephrasing your topic."
        : "Caption generation failed. Please try again.";

    return Response.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 