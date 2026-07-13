# Socio

Socio is a focused weekly social scheduler for ChezaHub and JengaSites:

> Upload finished posters and captions → place them on the week → auto-publish through SMMPRO → inspect each platform result → retry only failed targets.

Production: https://socio-beryl.vercel.app

## What the app does

- Uploads up to 10 PNG, JPG, or WEBP posters in one batch.
- Creates one independent post per image so high-volume schedules remain clear.
- Saves drafts and schedules in Neon Postgres, across devices and browser sessions.
- Stores public, immutable poster URLs in Vercel Blob for the Meta Graph API.
- Uses Vercel Workflow to sleep until the exact scheduled instant and resume durably.
- Publishes Facebook and Instagram as separate targets through SMMPRO.
- Tracks `draft`, `scheduled`, `publishing`, `published`, and `failed` states.
- Records target-level attempt counts, provider post IDs, and errors.
- Retries failed targets without reposting targets already marked published.
- Invalidates stale workflows when a scheduled post is rescheduled or returned to draft.

The old campaign, analytics, automation, product-feed, approval, and engagement demos were removed from the production navigation. The active product surface is now only Calendar, Posts, Publishing, and Connections.

## Security boundary

SMMPRO remains the owner of Facebook and Instagram credentials. Socio never copies Meta tokens into its database or browser.

When an administrator signs in:

1. SMMPRO validates the existing administrator email and password.
2. Socio stores its own random session token as a SHA-256 hash.
3. The short-lived SMMPRO session is encrypted with AES-256-GCM for background publishing.
4. Workflow steps decrypt it only on the server when a post is due.

SMMPRO sessions last seven days. Socio blocks schedules beyond the active publisher session. Signing in again refreshes the publisher session without changing any Meta credential.

## Production infrastructure

- Next.js 16 App Router
- Neon Postgres
- Vercel Blob (public media store)
- Vercel Workflow
- Existing SMMPRO deployment at `https://smmpro.lokimax.top`

The required Socio variables are documented in `.env.example` and are provisioned in Vercel. Never commit their values.

## Database setup

After linking the Vercel project and pulling Development variables:

```bash
vercel link --yes --project socio
vercel env pull .env.local --yes
npm install
npm run db:migrate
```

The migration is idempotent and creates posts, per-platform targets, publishing attempts, sessions, and encrypted publisher credentials.

## Local development

```bash
npm run dev
```

## Quality checks

```bash
npm run check
```

The full check runs formatting, unit and interaction tests, strict TypeScript, the production Workflow/Next.js build, and focused route verification.

## Current publishing scope

Each calendar item contains one image. Bulk selection creates multiple independent posts. Native multi-image carousels are intentionally not presented as functional because the current SMMPRO `/api/post` contract accepts one image per publishing request.
