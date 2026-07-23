# Weekly ZIP workflow for Codex and Socio

This is the shortest safe weekly routine for ChezaHub or JengaSites content.

## What the user does

Attach one ZIP to Codex and say:

> Fully review this weekly Socio pack. Fix only safe packaging issues, show me
> every post and warning, then stage it in Socio. Do not create drafts or schedule
> anything until I approve.

The ZIP may be either:

1. A canonical Socio pack with `manifest.json` at the root; or
2. A human-prepared ZIP containing posters plus the captions and weekly plan in
   clearly named text, CSV, spreadsheet, Word, or PDF files.

The user does not need to edit JSON. Codex creates or repairs the canonical pack
from the supplied plan when necessary.

## What Codex must do

### 1. Preserve and inventory

- Keep the original ZIP unchanged.
- Work in a temporary directory outside the repository.
- Reject unsafe archive paths, encrypted archives, executables, and unexpected
  nested archives.
- Inventory every supplied file and identify the authoritative caption/schedule
  source.
- If different supplied files disagree, stop and show the conflict. Do not guess.

### 2. Review every poster

Codex must visually inspect every image at readable resolution, not merely trust
filenames or OCR. For each post, verify:

- correct brand and legible artwork;
- caption matches the poster and offer;
- displayed product name and price match the supplied plan/catalogue;
- ChezaHub uses `chezahub.co.ke` and `+254 113 033 475`;
- no cropped text, corrupt image, obvious typo, duplicate poster, or wrong slide;
- carousel slides are in the intended order;
- platform suitability and 1–10 slides per post;
- intended date and time are explicit in `Africa/Nairobi`.

Uncertain artwork, prices, contacts, or schedule mappings are blockers, not
assumptions.

### 3. Normalize

Create a canonical working directory containing:

```text
manifest.json
Monday/...
Tuesday/...
...
Sunday/...
```

Every post must have a stable unique `reference`, title, caption, ordered media,
platforms, QA status, and intended EAT schedule. Use:

- `.codex/skills/socio-content-publisher/schemas/content-pack.schema.json`
- `.codex/skills/socio-content-publisher/examples/manifest.example.json`

Run the canonical builder:

```powershell
node .codex/skills/socio-content-publisher/scripts/build-pack.mjs <working-directory> <reviewed-pack.zip>
```

Then generate the deterministic preflight report:

```powershell
node .codex/skills/socio-content-publisher/scripts/review-pack.mjs <reviewed-pack.zip> --json <review.json> --markdown <review.md>
```

### 4. Show the review before staging

Report:

- original filename and reviewed pack SHA-256;
- total posts and slides;
- ready, warning, and blocked counts;
- one row per post with title, format, slide count, platforms, and EAT slot;
- all warnings and hard blockers;
- every safe normalization Codex made;
- anything Codex could not verify.

Do not stage while hard blockers remain.

### 5. Stage only

After the pack passes local and visual review, upload it through the Socio import
API. Staging must create only an import batch. Read the import back and report its
ID, version, checks, entry counts, and carousel order.

Staging is not approval and must never create drafts, schedules, workflow runs, or
external posts.

### 6. Require two visible checkpoints

Checkpoint A comes after the staged-import review. The user explicitly approves
the selected entries and authorizes draft creation. Codex then:

1. calls `approve` with the current version;
2. refreshes the import;
3. calls `commit` using `create_drafts_only`;
4. verifies that no target is scheduled or published.

Checkpoint B comes after Codex shows the exact final calendar. The user explicitly
authorizes scheduling. Codex then schedules with the current version, normally
using `roll_forward`, and verifies every resulting post and target.

## Suggested ZIP naming

Use a predictable filename such as:

```text
ChezaHub_2026-07-27_to_2026-08-02.zip
```

## Final completion report

Codex must finish with:

- pack hash and Socio import ID;
- current batch version and status;
- counts by import/post/target state;
- exact scheduled EAT slots;
- workflows started;
- all warnings or failures;
- whether any external content was actually published.

Uploading a weekly ZIP should normally require only two short replies from the
user: one to approve the reviewed entries as drafts, and one to schedule the exact
calendar.
