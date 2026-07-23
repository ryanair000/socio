# Socio

Socio is a focused weekly social scheduler for ChezaHub and JengaSites:

> Upload finished posters → generate complete captions → choose independent posts, a carousel, or Instagram Stories → schedule → auto-publish through SMMPRO.

Posts published directly in SMMPro (including its Telegram publisher) are also imported into the Socio calendar through the authenticated `/api/integrations/smmpro/posts` endpoint. Replayed sync events are deduplicated, and Socio-originated publishing requests are marked so they are not imported twice.

Production: https://socio.jengasites.com

## What the app does

- Uploads up to 10 PNG, JPG, or WEBP posters in one batch.
- Automatically generates a ready-to-edit Instagram caption from each poster with OpenAI vision.
- Creates one independent post per image or combines 2–10 ordered slides into one carousel.
- Creates Instagram-only image Stories with one image and one EAT schedule per
  Story. Native stickers such as polls, links, questions, and sliders still
  need to be added in Instagram.
- Gives independent posts their own date/time and gives a carousel one shared date/time, all in EAT.
- Saves drafts and schedules in Neon Postgres, across devices and browser sessions.
- Stores public, immutable poster URLs in Vercel Blob for the Meta Graph API.
- Uses Vercel Workflow to sleep until the exact scheduled instant and resume durably.
- Publishes Facebook and Instagram single-image posts, native carousels, and
  Instagram image Stories through SMMPRO.
- Tracks `draft`, `scheduled`, `publishing`, `published`, and `failed` states.
- Tracks `partially_published` when one platform succeeds and another fails.
- Records target-level attempt counts, provider post IDs, and errors.
- Retries failed targets without reposting targets already marked published.
- Invalidates stale workflows when a scheduled post is rescheduled or returned to draft.
- Recovers due jobs and stale publishing claims through protected AWS EventBridge calls every five minutes, with a daily Vercel fallback.
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

## Easiest weekly workflow with Codex

Attach the complete weekly ZIP to Codex and ask it to fully review and stage the
pack. The ZIP can already contain a root `manifest.json`, or it can contain the
posters plus a clearly labelled caption/schedule plan for Codex to normalize.

Codex inventories the source, visually checks every poster, builds a canonical
pack, produces a deterministic preflight report, and stages it through the Socio
import API. Staging never schedules or publishes. Draft creation and scheduling
remain separate, explicit checkpoints.

See
[docs/CODEX_WEEKLY_ZIP_WORKFLOW.md](docs/CODEX_WEEKLY_ZIP_WORKFLOW.md) for the
one-message intake prompt and the complete review contract.
