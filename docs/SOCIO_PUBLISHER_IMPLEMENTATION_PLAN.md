# Socio Publisher — Phased Implementation Plan

## Goal

Turn Socio into an approval-first content-pack importer and scheduler that can be used from:

1. the Socio web app;
2. a reusable Codex skill; and
3. a documented API/OpenAPI integration for ChatGPT Actions or a future MCP app.

The system must never bulk-publish merely because a pack was uploaded. AI prepares and validates; the operator approves; Socio commits and publishes.

## Non-negotiable safety rules

- Importing never creates live posts directly.
- Every pack is staged and reviewed before drafts are created.
- Creating drafts and scheduling are separate actions.
- Publishing now is always explicit and post-selective.
- Wrong ChezaHub phone numbers and unresolved QA holds are hard blocks.
- Price mismatches are surfaced before scheduling.
- Duplicate packs and duplicate post content are detected.
- Overdue content defaults to roll-forward, not bulk publish.
- Successful platform targets are never reposted when retrying failed targets.
- Published-content deletion is never described as guaranteed unless provider deletion succeeds.

---

## Phase 0 — Architecture and contracts

### Deliverables

- This plan.
- Versioned content-pack manifest schema.
- Stable import-state and QA-state vocabulary.
- Audit and idempotency model.

### Acceptance criteria

- A pack can be described without relying on filename guessing.
- Independent posts and 2–10 slide carousels are represented.
- EAT schedules are explicit.
- Each post has a stable source reference.

---

## Phase 1 — Import staging database

### New tables

- `import_batches`
- `import_assets`
- `import_entries`
- `import_checks`
- `import_events`

### Core states

`uploaded -> analysing -> needs_review -> approved -> committed -> scheduled -> completed`

Failure/terminal states:

`invalid`, `blocked`, `cancelled`, `failed`

### Acceptance criteria

- Imports are isolated from the existing `posts` table.
- Deleting an import cascades only through staging records.
- Re-importing the same pack returns the existing batch.
- Every mutation creates an import event.

---

## Phase 2 — General content-pack parser and validation

### Supported inputs

- ZIP containing `manifest.json` and images.
- Legacy Week 1 day ZIPs.

### Technical validation

- compressed size <= 25 MB;
- expanded size <= 80 MB;
- at most 70 images per general pack;
- at most 10 images per post;
- supported real file signatures: PNG, JPEG, WEBP;
- archive traversal and absolute paths rejected;
- duplicate asset hashes detected;
- missing manifest media rejected;
- caption <= 2,200 characters;
- title <= 120 characters;
- dates interpreted in `Africa/Nairobi` by default.

### Brand validation

For ChezaHub:

- expected website: `chezahub.co.ke`;
- expected phone: `+254 113 033 475`;
- visible wrong phone number becomes a blocking check when supplied in manifest metadata or operator QA.

### Acceptance criteria

- A valid pack creates one staged batch.
- Invalid packs create no Blob uploads and no post records.
- Legacy day packs are converted into the same normalized manifest model.

---

## Phase 3 — Import API and preview workflow

### Endpoints

- `POST /api/imports` — upload and stage.
- `GET /api/imports` — list imports.
- `GET /api/imports/:id` — detailed preview.
- `PATCH /api/imports/:id` — edit staged metadata/schedule.
- `POST /api/imports/:id/approve` — approve selected entries.
- `POST /api/imports/:id/commit` — create Socio drafts only.
- `POST /api/imports/:id/schedule` — schedule already committed drafts.
- `POST /api/imports/:id/cancel` — cancel staging/schedules safely.

### Acceptance criteria

- Upload response reports exact ready/warning/blocked counts.
- Commit creates drafts only.
- Schedule requires an approved batch and an active publisher credential.
- Version checks reject stale approvals.

---

## Phase 4 — Socio web import wizard

### New Post choices

- Upload images.
- Import content pack.

### Wizard steps

1. Source
2. Posters
3. Captions
4. Schedule
5. Final approval

### Required review information

- image/slide order;
- post format;
- caption;
- target platforms;
- intended EAT time;
- QA status and reasons;
- duplicate and price warnings;
- exact counts for draft/schedule/publish actions.

### Acceptance criteria

- No write beyond staging occurs before confirmation.
- Blocked entries cannot be approved or scheduled.
- Operator can create drafts without scheduling.
- UI works on desktop and mobile.

---

## Phase 5 — Approval-first scheduling and overdue policy

### Policies

- `keep_draft`
- `roll_forward`
- `skip_expired`
- `stagger_from_now`
- `publish_selected_now`

Default: `roll_forward`.

### Acceptance criteria

- Past times never silently publish.
- Roll-forward preserves post order and spacing.
- Scheduling is atomic per batch.
- A failure leaves unscheduled entries as drafts.

---

## Phase 6 — Reusable Codex skill

### Location

`.codex/skills/socio-content-publisher/`

### Responsibilities

- build a manifest from numbered images and caption CSV/Markdown;
- validate filenames and image signatures;
- compute asset and pack hashes;
- call Socio preview endpoints;
- create drafts only unless the user explicitly approves scheduling;
- verify resulting Socio records;
- produce a human-readable report.

### Acceptance criteria

- `SKILL.md` contains hard safety rules.
- Scripts run without embedding production credentials.
- Example manifest and eval fixtures are included.

---

## Phase 7 — Plugin/Action contract

### Deliverables

- OpenAPI 3.1 schema for read and write operations.
- API-key authentication contract using `SOCIO_SKILL_API_KEY`.
- Read tools separated from write tools.
- Write operations require batch version and explicit operation type.

### Acceptance criteria

- External clients can inspect an import without a browser.
- External clients cannot publish by uploading alone.
- API key is never committed.

---

## Phase 8 — Tests, deployment, and production verification

### Automated tests

- valid manifest pack;
- legacy pack conversion;
- archive traversal rejection;
- corrupt image signature;
- duplicate pack;
- duplicate asset;
- missing media;
- wrong phone hard block;
- QA hold block;
- stale version conflict;
- draft-only commit;
- overdue roll-forward;
- failed-target-only retry behavior remains intact.

### Production smoke test

1. Upload a two-post test pack.
2. Confirm staging records only.
3. Create drafts.
4. Confirm no Workflow was started.
5. Schedule one post at least two minutes ahead.
6. Confirm exactly one Workflow run.
7. Cancel the other draft.
8. Confirm audit events.

### Release criteria

- `npm run check` passes.
- Vercel production build is Ready.
- Existing calendar, composer, publishing, connection and retry flows remain functional.
- Importing a pack cannot publish without a later explicit action.

---

## Definition of complete

Socio Publisher is complete when a user can upload a manifest-based or legacy ZIP, review a normalized preview, resolve blockers, create drafts, explicitly schedule approved entries, and use the same workflow through the Codex skill/API contract—without any hidden seed route, direct database bypass, or automatic bulk publishing.
