# Codex Handoff — Socio Weekly Content Scheduler

## Mission

Redesign and complete **Socio** as a minimal, production-focused weekly social publishing tool for ChezaHub.

The urgent workflow is:

1. Upload pre-created poster images.
2. Add or edit the Instagram/Facebook caption.
3. Group one or more ordered images into a single post/carousel.
4. Select ChezaHub, target platform(s), date and East Africa Time.
5. Save as draft or schedule.
6. Automatically publish when the scheduled time arrives.
7. Show `Draft`, `Scheduled`, `Publishing`, `Published`, `Partially Published` or `Failed`.
8. Retry only failed targets without creating duplicate posts.

Do not expand the product with more demo modules. Replace the broad demo dashboard with a focused publishing workflow.

## Repositories and deployments

### Socio

- Repository: `ryanair000/socio`
- Branch: `main`
- Current latest documented commit at handoff: `8754ad5d6344962c4cd97d3e706d21a2a59b5b03`
- Production: `https://socio-beryl.vercel.app`
- Vercel project ID: `prj_Pn0fsgnopxanHeOMrywFm2q3nSy4`

### SMMPRO publishing backend

- Repository: `ryanair000/SMMPRO`
- Production: `https://smmpro.lokimax.top`
- Vercel project: `fb-poster`
- Socio currently bridges authentication, caption generation and Meta publishing through SMMPRO.
- Preserve all Meta/OpenAI/Telegram credentials server-side. Never expose, log, copy or commit secret values.

### Content source pack

- Google Drive week folder: `https://drive.google.com/drive/folders/1eRO92SqBWhzRd8obze2Bc0yD9i2u_3M9`
- The folder contains 70 ordered final posters, day-by-day captions, master publishing schedule, QA notes, previous versions and brand assets.

## Current production truth

Socio currently has:

- Secure SMMPRO administrator login bridge.
- Image-aware caption generation.
- Immediate single-image publishing to Facebook and Instagram.
- A seven-day AI planner stored in browser state/localStorage.
- A visual publishing-status page that can read the most recent immediate publish result.

Socio currently does **not** have:

- Persistent posts or schedules.
- Multi-image carousel upload.
- Date/time scheduling controls.
- A production job queue.
- A cron-triggered automatic publisher.
- Persistent media storage.
- Cross-device drafts.
- A real calendar driven by database records.
- Reliable overdue-post handling.

## Product scope for this milestone

Keep only four primary areas:

1. **Calendar** — weekly schedule and status overview.
2. **New Post / Edit Post** — upload images, caption, platform and schedule.
3. **Publishing** — queue, live results, retry and logs.
4. **Connections** — SMMPRO/Meta connection health.

Hide or remove unrelated demo screens from primary navigation, including broad campaigns, engagement, analytics, automations, products and team management until they have real user stories.

## Required user stories

### Create a post

As the operator, I can:

- Upload 1–10 images.
- Reorder images using drag-and-drop and keyboard controls.
- Preview the square carousel in order.
- Paste or edit one caption.
- Select brand `chezahub`.
- Select Facebook, Instagram or both.
- Select date and time in `Africa/Nairobi`.
- Save as draft or schedule.

### Weekly calendar

As the operator, I can:

- See Monday–Sunday in EAT.
- See every scheduled item at its exact time.
- Open, edit, duplicate, cancel or publish a calendar item.
- Filter by status and platform.
- See overdue items clearly.

### Automatic publishing

As the system, Socio:

- Claims due jobs atomically.
- Calls the existing SMMPRO publishing endpoint.
- Records each platform result independently.
- Marks partial success correctly.
- Retries failed targets only.
- Uses an idempotency key so retries never duplicate a successful Facebook or Instagram post.

### Overdue content

As the operator, I can:

- Select overdue, QA-approved posts.
- Choose `Publish overdue now`.
- See a final confirmation listing the exact posts and targets.
- Publish them immediately through the queue.

Never publish a `HOLD` asset automatically.

## Database and storage

Use persistent server-side storage. Supabase/Postgres is preferred.

Recommended tables:

### `social_posts`

- `id uuid primary key`
- `brand_id text`
- `title text`
- `caption text`
- `timezone text default 'Africa/Nairobi'`
- `scheduled_at timestamptz`
- `status text`
- `created_by text`
- `created_at timestamptz`
- `updated_at timestamptz`
- `approved_at timestamptz null`
- `published_at timestamptz null`
- `failure_message text null`
- `source_week text null`

### `social_post_media`

- `id uuid primary key`
- `post_id uuid references social_posts`
- `storage_path text`
- `public_or_signed_url text`
- `position int`
- `mime_type text`
- `width int null`
- `height int null`
- unique `(post_id, position)`

### `social_post_targets`

- `id uuid primary key`
- `post_id uuid references social_posts`
- `platform text`
- `status text`
- `attempt_count int default 0`
- `provider_post_id text null`
- `provider_permalink text null`
- `idempotency_key text unique`
- `last_error text null`
- `published_at timestamptz null`

### `publishing_attempts`

- `id uuid primary key`
- `post_target_id uuid references social_post_targets`
- `started_at timestamptz`
- `finished_at timestamptz null`
- `request_summary jsonb`
- `response_summary jsonb`
- `status text`
- Do not persist provider secrets or raw access tokens.

### Storage

Create a private bucket such as `socio-post-media`.

- Accept PNG, JPG and WEBP.
- Validate type and file size server-side.
- Preserve ordered media.
- Generate time-limited signed URLs when the publishing backend requires public fetch access.
- Delete orphaned media after cancelled drafts are permanently removed.

Do not modify existing ChezaHub catalog tables unless a reviewed migration explicitly requires it.

## API contract

Implement server routes approximately as follows:

- `POST /api/posts` — create draft/scheduled post and media records.
- `GET /api/posts?from=&to=&status=` — calendar data.
- `GET /api/posts/:id` — full post.
- `PATCH /api/posts/:id` — update caption, schedule, targets or media order.
- `DELETE /api/posts/:id` — cancel/delete eligible post.
- `POST /api/posts/:id/schedule` — validate and schedule.
- `POST /api/posts/:id/publish-now` — enqueue immediately.
- `POST /api/posts/:id/retry` — enqueue failed targets only.
- `POST /api/cron/publish-due` — protected scheduler endpoint.

Use authenticated server routes. Validate every payload with a schema validator.

## Queue and cron requirements

- Add a Vercel Cron job that runs every minute if supported; otherwise use the shortest practical supported interval and document it.
- Protect the cron endpoint using `CRON_SECRET` or Vercel’s cron authorization.
- Claim due posts using a transaction/row lock or atomic update.
- State transition: `scheduled -> publishing -> published/partially_published/failed`.
- A worker crash must leave the post recoverable.
- Add a stale-lock recovery rule.
- Retry network and provider 5xx errors with bounded exponential backoff.
- Do not blindly retry validation, authentication or unsupported-media errors.

## Carousel publishing

The current SMMPRO route is primarily single-image. Extend the backend safely for ordered multi-image publishing.

- Facebook: publish a native multi-photo post when supported by the existing page integration.
- Instagram: use the Graph API carousel-container workflow for 2–10 supported images.
- Record child container IDs and final media ID in attempt summaries.
- A one-image post should continue to use the existing path.
- Do not simulate a carousel by publishing ten independent feed posts unless the operator explicitly chooses that mode.

## Import Week 1 content

Build an authenticated import workflow that reads a manifest or accepts a ZIP/Drive download and creates the Week 1 drafts.

Expected schedule in `Africa/Nairobi`:

- 08:00 — two-slide carousel
- 10:30 — one image
- 13:00 — three-slide carousel
- 16:30 — one image
- 19:30 — three-slide carousel
- Sunday final slot — 19:00

The Drive pack contains ordered files `01`–`10` for each day and day-specific captions.

Import rules:

- `READY` may be scheduled after basic validation.
- `READY AFTER QA` must remain draft until corrected/verified.
- `HOLD` must remain blocked and visually labelled with the hold reason.
- Offer expiry and regional price checks must happen close to publishing time.

## Critical QA holds

Do not publish these unchanged:

1. Monday Fortnite carousel — availability rotates; verify live shop and rights-safe artwork.
2. Friday `new_game_or_setup_upgrade.png` — fictional “Uncharted: Legacy Awakens” cover.
3. Sunday `featured_football_gaming_offers_this_week.png` — invented products/prices.
4. Sunday `xbox_gift_card_top_up_promotion.png` — protected Xbox logo must be removed; live catalog snapshot showed USA $20 at KSh 3,140.
5. Sunday `join_the_community_moment.png` — invented metrics/comments.
6. Sunday controller poster — use exact verified product wording or generic wording and remove protected logos.
7. Remove every random/unverified phone number from artwork. Use `chezahub.co.ke` as the default CTA.

## Immediate Monday backlog

At the time of the content review, Monday’s 08:00, 10:30 and 13:00 slots had passed.

Once the scheduler is working:

- Surface these as overdue.
- Require an operator confirmation.
- Publish only the posts whose deals are still active and whose art passes QA.
- Do not publish the Fortnite group without live availability verification.

## UX direction

Minimal and functional:

- White background.
- Hub Navy headings.
- Energy Red primary actions and statuses requiring attention.
- One primary action per screen.
- No fake analytics, demo metrics or placeholder jobs.
- Mobile-first calendar and upload form.
- Clear empty, loading, validation, publishing and failure states.
- Accessible keyboard operation, focus states, labels and status announcements.

## Tests

Add automated tests for:

- Single image draft.
- Ordered ten-image carousel.
- Schedule validation in Africa/Nairobi.
- DST-independent EAT conversion.
- Due-job claiming by one worker only.
- Idempotent retries.
- Partial Facebook/Instagram success.
- Failed-target-only retry.
- Expired/unsupported offer hold.
- Unsupported file type and oversized file.
- Authentication and cron-secret rejection.
- Calendar editing and cancellation.
- Week 1 manifest import.

Run:

- Unit/integration tests.
- Strict TypeScript.
- Production build.
- Route tests.
- Accessibility smoke tests.
- Production smoke tests after deployment.

## Deployment acceptance criteria

The milestone is complete only when:

1. A user can upload a 3-image carousel and caption.
2. The post survives refresh and appears on another authenticated device.
3. The user can schedule it in EAT.
4. The queue automatically processes it at the due time.
5. Facebook and Instagram results are stored separately.
6. A partial failure can retry only the failed platform.
7. Successful targets are never duplicated.
8. The weekly calendar shows real persisted state.
9. Week 1 assets can be imported with their QA statuses.
10. The updated `main` branch is tested and deployed to the existing Socio Vercel project.

## Security rules

- Never expose or print Meta, OpenAI, Telegram, administrator or Vercel secret values.
- Never put secrets in client code, localStorage, logs, Git history or Drive files.
- Keep SMMPRO provider credentials server-side.
- Sanitize provider errors before returning them to the browser.
- Rate-limit login, upload, AI and publishing endpoints.

## Deliverables

- Minimal redesigned Socio UI.
- Database migrations and storage setup.
- Multi-image upload and carousel ordering.
- Persistent weekly calendar.
- Automatic queue and cron publisher.
- SMMPRO carousel extension.
- Week 1 import tool.
- Automated tests.
- Updated README and operational runbook.
- GitHub push and production deployment.
- Final report listing commit SHA, deployment ID, tested routes and known limitations.
