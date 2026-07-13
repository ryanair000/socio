# Socio

Socio is a focused weekly social scheduler for ChezaHub and JengaSites:

> Upload finished posters → generate complete captions → choose independent posts or a carousel → schedule → auto-publish through SMMPRO.

Production: https://socio-beryl.vercel.app

## What the app does

- Uploads up to 10 PNG, JPG, or WEBP posters in one batch.
- Automatically generates a ready-to-edit Instagram caption from each poster with OpenAI vision.
- Creates one independent post per image or combines 2–10 ordered slides into one carousel.
- Gives independent posts their own date/time and gives a carousel one shared date/time, all in EAT.
- Saves drafts and schedules in Neon Postgres, across devices and browser sessions.
- Stores public, immutable poster URLs in Vercel Blob for the Meta Graph API.
- Uses Vercel Workflow to sleep until the exact scheduled instant and resume durably.
- Publishes Facebook and Instagram single-image posts and native carousels as separate targets through SMMPRO.
- Tracks `draft`, `scheduled`, `publishing`, `published`, and `failed` states.
- Tracks `partially_published` when one platform succeeds and another fails.
- Records target-level attempt counts, provider post IDs, and errors.
- Retries failed targets without reposting targets already marked published.
- Invalidates stale workflows when a scheduled post is rescheduled or returned to draft.
- Recovers due jobs and stale publishing claims through a protected five-minute GitHub Actions job with a daily Vercel fallback.
- Imports each organized Week 1 day ZIP into five EAT slots while preserving READY, READY AFTER QA, and HOLD gates.
- Supports explicit publish-now, duplicate, cancel, and QA approval actions.

The old campaign, analytics, automation, product-feed, approval, and engagement demos were removed from the production navigation. The active product surface is now only Calendar, New Post, Publishing, and Connections.

## Security boundary

SMMPRO remains the owner of Facebook, Instagram, and OpenAI credentials. Socio never copies those secrets into its database or browser. Caption previews are reduced in the browser, sent through Socio's authenticated route, and proxied to SMMPRO's authenticated OpenAI endpoint.

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

The migration is idempotent and creates posts, ordered post media, QA/source metadata, stable per-target idempotency keys, publishing attempts, sessions, and encrypted publisher credentials. Run it after pulling this version.

## Local development

```bash
npm run dev
```

## Quality checks

```bash
npm run check
```

The full check runs formatting, unit and interaction tests, strict TypeScript, the production Workflow/Next.js build, and focused route verification.

## Publishing formats

- **Independent:** every selected image becomes its own draft or scheduled post, with its own generated caption and time.
- **Carousel:** 2–10 images remain in selection order and publish as one Facebook/Instagram carousel with one generated caption and time.

Socio's Workflow still waits until the selected instant. At publish time it sends the ordered public Blob URLs to SMMPRO, which creates the native Meta carousel containers and records the platform-level result.

## Week 1 import and operations

Open **New Post**, select one Monday–Sunday `*_Posters_and_Captions.zip` pack, and import it. Every import is saved as a draft first. READY items can be scheduled or published after review; READY AFTER QA requires an explicit QA confirmation; HOLD remains blocked.

See [docs/OPERATIONS.md](docs/OPERATIONS.md) for migration, cron, overdue publishing, recovery, and upstream SMMPRO acceptance checks.
