# CaptionMagic - AI Caption Generator Context Guide

## Project Overview
🚀 **CaptionMagic** is an AI-powered social media caption generator that helps users create engaging content for multiple platforms using cost-efficient LLMs.

## Key Features
- Platform-specific caption generation (Instagram, Twitter, etc.)
- Tone customization (Casual, Professional, etc.)
- AI model cost optimization
- Caption history storage
- Responsive UI with loading states

---

## Technology Stack
| Component          | Technology               |
|---------------------|--------------------------|
| Frontend           | Next.js 14 (App Router)  |
| Styling            | Tailwind CSS             |
| Database           | Supabase PostgreSQL      |
| AI Engine          | Phi-3-mini (via Replicate) |
| Hosting            | Vercel (Recommended)     |
| Rate Limiting      | Vercel KV Store          |

---

## File Structure
```bash
/
├── app/
│   ├── api/
│   │   └── generate/
│   │       └── route.js     # AI caption generation endpoint
│   └── page.jsx             # Main UI
├── lib/
│   └── supabase.js          # Supabase client config
├── public/                  # Static assets
└── styles/
    └── globals.css          # Tailwind directives
```

## Core Implementation

### AI Generation Endpoint (`app/api/generate/route.js`)
```javascript
import Replicate from 'replicate'

export const dynamic = 'force-dynamic' // Required for edge runtime

export async function POST(request) {
  const { prompt } = await request.json()
  
  // Initialize Replicate with API key
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_KEY,
  })

  try {
    // Phi-3-mini generation call
    const output = await replicate.run(
      "microsoft/phi-3-mini-4k-instruct:8b9a816f3a9adf5c97a30a6d3d277b2f16785abf65e4e02d00d4a1e9f32a5e3a",
      {
        input: {
          prompt: `[INST] Generate ${prompt.platform} caption in ${prompt.tone} tone about: ${prompt.topic} [/INST]`,
          max_new_tokens: 175,
          temperature: 0.65,
        }
      }
    )

    return Response.json({ 
      caption: output.join('').replace(/<\/?s>/g, '') // Clean output
    })
    
  } catch (error) {
    console.error('[AI_ERROR]', error)
    return Response.json(
      { error: "Caption generation failed. Please try again." },
      { status: 500 }
    )
  }
}
```

## Cost Management

### Pricing Model (Phi-3-mini)
| Operation        | Cost            |
|------------------|-----------------|
| Generation Request | $0.0004/req     |
| Storage (Supabase) | $0.023/GB/mo    |

### Optimization Strategies

#### Request Caching
```javascript
// Example: Redis caching implementation
import { kv } from '@vercel/kv'

// Assuming promptHash is a unique identifier for the prompt object
const cached = await kv.get(`caption:${promptHash}`)
if (cached) return cached
// Assuming 'result' holds the generated caption
await kv.set(`caption:${promptHash}`, result, { ex: 3600 }) // 1hr cache
```

#### Cold Start Prevention
- Add Vercel cron job to ping API every 5 minutes.

#### Payload Compression
- Use compression middleware in Next.js config.

---

## Local Development

Install dependencies:
```bash
npm install
```

Start dev server:
```bash
npm run dev
```

Test endpoint:
```bash
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": {"topic":"summer sale","platform":"instagram","tone":"energetic"}}'
```

---

## Deployment Checklist

- Set Vercel environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `REPLICATE_API_KEY`
  - `KV_URL` (for Vercel KV)
  - `KV_REST_API_URL` (for Vercel KV)
  - `KV_REST_API_TOKEN` (for Vercel KV)
  - `KV_REST_API_READ_ONLY_TOKEN` (for Vercel KV)

- Enable Auto-Scaling in Replicate dashboard.

- Configure Supabase Row Level Security:
  ```sql
  create policy "User access" on captions
    for select using (auth.uid() = user_id);
  
  create policy "User insert" on captions
    for insert with check (auth.uid() = user_id);
  ```

---

## Monitoring

Recommended metrics to track:
```text
1. API Latency Percentiles (p95, p99)
2. Tokens Generated/Request
3. Cache Hit Ratio
4. Error Rate by User Segment
5. Cost Per 1000 Captions
6. Vercel KV Read/Write Units
```

---

## Troubleshooting Guide

| Symptom           | Solution                                            |
|-------------------|-----------------------------------------------------|
| 504 Timeout Errors | Reduce `max_new_tokens` < 200, Check Replicate load |
| Empty Captions    | Check Replicate API status page, Verify input prompt |
| Stale Responses   | Clear KV cache (use Vercel CLI or dashboard)        |
| High Supabase Costs | Add query cost limits, Optimize Supabase indices  |
| KV Rate Limiting  | Upgrade Vercel KV plan, Implement backoff logic     | 