import type { NextApiRequest, NextApiResponse } from "next";
import { requireSession } from "../../../lib/smmpro";

type AiPost = {
  day: string;
  date: string;
  title: string;
  objective: string;
  pillar: string;
  time: string;
  format: string;
  headline: string;
  caption: string;
  story: string;
  cta: string;
  hashtags: string[];
  platforms: string[];
  status: string;
};

const allowedObjectives = [
  "Discovery",
  "Engagement",
  "Sales",
  "Education",
  "Trust",
];

function extractText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const items = Array.isArray(payload?.output) ? payload.output : [];
  return items
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .filter((item: any) => item?.type === "output_text")
    .map((item: any) => item.text || "")
    .join("\n")
    .trim();
}

function parsePlan(text: string): AiPost[] {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  const posts = Array.isArray(parsed) ? parsed : parsed?.posts;
  if (!Array.isArray(posts) || posts.length !== 7) {
    throw new Error("AI did not return exactly seven posts.");
  }
  return posts.map((post: any, index: number) => ({
    day: String(
      post.day || ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][index],
    ),
    date: String(post.date || ""),
    title: String(post.title || "Untitled post"),
    objective: allowedObjectives.includes(post.objective)
      ? post.objective
      : "Discovery",
    pillar: String(post.pillar || "Weekly Content"),
    time: String(post.time || (index === 5 ? "12:30 PM" : "7:30 PM")),
    format: String(post.format || "Instagram 4:5"),
    headline: String(post.headline || post.title || ""),
    caption: String(post.caption || ""),
    story: String(post.story || ""),
    cta: String(post.cta || "Shop at chezahub.co.ke"),
    hashtags: Array.isArray(post.hashtags)
      ? post.hashtags.slice(0, 8).map(String)
      : [],
    platforms: Array.isArray(post.platforms)
      ? post.platforms.slice(0, 4).map(String)
      : ["Instagram", "Facebook"],
    status: "AI Draft",
  }));
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireSession(req, res)) return;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({
      error: "OPENAI_API_KEY is not configured in the Socio Vercel project.",
    });
  }

  const brand = String(req.body?.brand || "ChezaHub").slice(0, 60);
  const weekStart = String(req.body?.weekStart || "2026-07-13").slice(0, 20);
  const notes = String(req.body?.notes || "").slice(0, 2000);
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const prompt = `Create a complete seven-day organic social-media content plan for ${brand}, starting ${weekStart}.

Brand context:
- ChezaHub is a Kenyan gaming store selling digital games, regional wallet top-ups, Fortnite products, disk games, consoles and gaming accessories.
- Website: chezahub.co.ke
- Audience: Kenyan console and PC gamers.
- Tone: professional, energetic, helpful, price-smart and locally relevant.
- Goals: increase comments, saves, shares, website visits, WhatsApp enquiries and sales.
- Weekly balance: Monday discovery, Tuesday engagement, Wednesday sales, Thursday education, Friday sales, Saturday engagement, Sunday trust/social proof.
- Do not invent a specific price, discount, stock quantity, review or expiry unless it is supplied in the notes.
- When exact product facts are unavailable, use a placeholder such as "Insert current product" or "Use latest verified deal".
- Captions must be natural, concise and ready for Instagram and Facebook.
- Saturday should publish at 12:30 PM EAT. Other main feed posts should publish at 7:30 PM EAT.
- Return JSON only. No markdown or commentary.

Additional notes:
${notes || "No additional product facts supplied."}

Return an object with a single key named posts. posts must contain exactly seven objects with these keys:
day, date, title, objective, pillar, time, format, headline, caption, story, cta, hashtags, platforms.
Use objective values only from: Discovery, Engagement, Sales, Education, Trust.
hashtags and platforms must be arrays of strings.`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions:
          "You are Socio's senior social media strategist. Return valid JSON only and follow all factuality constraints.",
        input: prompt,
        max_output_tokens: 5000,
        store: false,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.error?.message || "OpenAI could not generate the week.",
      });
    }

    const text = extractText(payload);
    const posts = parsePlan(text);
    return res.status(200).json({ posts, model });
  } catch (error) {
    return res.status(502).json({
      error:
        error instanceof Error
          ? error.message
          : "AI weekly planning is temporarily unavailable.",
    });
  }
}
