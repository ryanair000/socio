---
name: socio-content-publisher
description: Build, validate, stage, review, draft, schedule, cancel, and verify Socio poster packs for ChezaHub or JengaSites.
---

# Socio Content Publisher

Use this skill whenever the task involves poster ZIPs, carousel grouping, captions, content QA, Socio imports, weekly scheduling, overdue handling, retries, or cancellation.

## Safety boundary

1. Never write directly to `posts`, `post_media`, `post_targets`, `publish_attempts`, or import tables.
2. Always use Socio web/API/MCP actions.
3. Uploading or staging a pack must never create a schedule or publish.
4. Approval, draft creation, and scheduling are separate confirmed actions.
5. Never bulk-publish overdue content. Default to `roll_forward` and show the proposed result.
6. Treat a wrong ChezaHub number, unresolved price mismatch, corrupt image, missing media, or QA hold as a hard block.
7. Never retry a platform target already marked published.
8. Never claim external deletion succeeded unless the provider confirms it.
9. Never place production API keys, session cookies, Meta credentials, or OpenAI keys in files, logs, commits, or prompts.
10. After any write, read the import or posts again and report exact counts and failures.

## Brand constants

For ChezaHub, verify:

- Website: `chezahub.co.ke`
- WhatsApp: `+254 113 033 475`
- Time zone: `Africa/Nairobi`

## Standard workflow

### 0. Codex ZIP attachment intake

When the user attaches a weekly ZIP and asks Codex to plug it into Socio, follow
`../../../docs/CODEX_WEEKLY_ZIP_WORKFLOW.md`.

- Accept either a canonical pack or a human-prepared ZIP containing posters and
  its caption/schedule plan.
- Preserve the original ZIP and normalize only a working copy.
- Inventory all files and visually inspect every poster at readable resolution.
- Use supplied plan/catalogue facts as authoritative. Never invent missing
  captions, prices, dates, times, platforms, or carousel groupings.
- If no `manifest.json` exists, create it for the user from the supplied plan.
- Run both `build-pack.mjs` and `review-pack.mjs` before staging.
- Show the complete local review before the Socio upload.
- Do not stage while any hard blocker remains.

### 1. Prepare

- Put `manifest.json` at the ZIP root.
- Include 1–70 posts and no more than 10 ordered images per post.
- Use `format: "story"` for Instagram Stories. A Story entry must contain
  exactly one image and target only `instagram`.
- Use PNG, JPEG, or WEBP with valid file signatures.
- Keep the compressed ZIP at or below 25 MB and expanded content at or below 80 MB.
- Give every post a unique stable `reference`.
- Put captions, platforms, QA status, and intended EAT date/time in the manifest.
- Use `.codex/skills/socio-content-publisher/schemas/content-pack.schema.json`.

### 2. Validate locally

Run:

```bash
node .codex/skills/socio-content-publisher/scripts/build-pack.mjs <source-directory> <output.zip>
node .codex/skills/socio-content-publisher/scripts/review-pack.mjs <output.zip>
```

The builder validates the manifest, referenced files, image signatures, size
limits, duplicate references, and archive paths before writing the ZIP. The
reviewer produces the post-by-post preflight summary and blocker counts. Automated
validation supplements, but never replaces, Codex's visual inspection.

### 3. Stage

Preferred API:

```bash
curl -fsS -H "Authorization: Bearer $SOCIO_SKILL_API_KEY" \
  -F "pack=@output.zip" \
  https://socio.jengasites.com/api/skill/imports
```

Staging creates only an import batch. Record the returned `import.id` and `import.version`.

### 4. Inspect

```bash
curl -fsS -H "Authorization: Bearer $SOCIO_SKILL_API_KEY" \
  https://socio.jengasites.com/api/skill/imports/<IMPORT_ID>
```

Report:

- total posts and slides;
- ready, warning, and blocked counts;
- carousel order;
- caption and schedule gaps;
- Story entries that target a feed platform or contain multiple images;
- every unresolved error;
- the current batch version.

Do not continue while hard blockers remain.

### 5. Approve

Call action `approve` with:

```json
{
  "expectedVersion": 1,
  "confirmation": "approve_selected_entries",
  "confirmQa": true
}
```

Use `entryIds` when only selected entries are approved. Refresh the import afterward because its version changes.

### 6. Create drafts

Call action `commit` with:

```json
{
  "expectedVersion": 2,
  "confirmation": "create_drafts_only"
}
```

This must create drafts only. Verify that no workflow run started and no target is scheduled or published.

### 7. Schedule

Show the exact proposed count, target platforms, policy, dates, and times before scheduling. Then call action `schedule` with:

```json
{
  "expectedVersion": 3,
  "confirmation": "schedule_approved_drafts",
  "policy": "roll_forward",
  "staggerMinutes": 120
}
```

Available overdue policies:

- `roll_forward` — default; move past slots forward while preserving order.
- `stagger_from_now` — queue overdue posts from now at the chosen spacing.
- `keep_draft` — leave overdue items unscheduled.
- `skip_expired` — leave past items unscheduled for manual review.

### 8. Verify

Read the import and Socio posts again. Confirm:

- batch version and status;
- exact draft/scheduled counts;
- one workflow run per scheduled post;
- target-level states;
- no duplicate source references;
- no published target was reset.

### 9. Cancel

Use action `cancel` only after explicit confirmation:

```json
{
  "expectedVersion": 4,
  "confirmation": "cancel_import_and_future_schedules"
}
```

Cancellation invalidates future draft/scheduled work. It does not promise deletion of already-published Facebook or Instagram content.

## MCP app

Remote MCP endpoint:

`https://socio.jengasites.com/api/mcp`

Authenticate with `Authorization: Bearer <SOCIO_SKILL_API_KEY>`. Write tools require `confirmed: true` and the current batch version.

## OpenAPI action

Schema:

`https://socio.jengasites.com/socio-publisher.openapi.json`

## Completion report

Always finish with:

- pack hash or import ID;
- batch version;
- counts by state;
- exact scheduled EAT slots;
- workflows started;
- warnings or failures;
- whether any external post was actually published.
