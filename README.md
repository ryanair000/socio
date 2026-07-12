# Socio

Socio is a responsive social-media operations platform for planning, creating, approving, publishing and measuring content across managed brands.

## Live release

- Production: https://socio-beryl.vercel.app
- Figma: https://www.figma.com/design/EGJFVPismQhDS33thnk7I1

## SMMPRO integration

Socio uses the existing SMMPRO deployment as a protected publishing backend. Meta, OpenAI and Telegram credentials remain in the `fb-poster` Vercel project and are never copied into the browser or committed to this repository.

Configure only the backend URL in Socio:

```env
SMMPRO_BASE_URL=https://smmpro.lokimax.top
```

After signing in with the administrator account configured in SMMPRO, Socio can:

- Read live connection health for ChezaHub and JengaSites
- Generate image-aware captions through the existing OpenAI key
- Publish to Facebook Pages and Instagram through the existing Meta tokens
- Preserve the existing Telegram webhook workflow in SMMPRO

## Included

- Command Centre and weekly planner
- Campaign and content-board workflows
- Product-aware Creative Studio
- Real caption generation and publishing through SMMPRO
- Seven-day AI content planning
- Approvals and safe publishing retries
- Assets, product feed and engagement inbox
- Analytics and social-sales attribution
- Automations, team roles and settings
- Responsive desktop, tablet and mobile layouts
- Accessible navigation, dialogs, form guardrails and status feedback

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Quality checks

```bash
npm run test
npm run typecheck
npm run build
npm run test:routes
npm run format:check
```

Run the complete review suite with:

```bash
npm run check
```

The public repository contains no Meta, OpenAI, Telegram or administrator secret values.

## Socio AI

Socio can generate a complete seven-day ChezaHub content plan with headlines, captions, Story copy, CTAs, hashtags and platform recommendations using the OpenAI Responses API.

Add these environment variables to the Socio Vercel project:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_MODEL` is optional. The API key is used only inside the server route and is never sent to the browser.
