# Socio Publisher release checklist

## Implemented

- Approval-first import staging separate from live posts.
- Manifest 1.0 and legacy Week 1 ZIP parsing.
- Image signature, archive, size, duplicate, phone-number, QA-hold, and declared-price checks.
- Explicit review, approval, draft-only commit, schedule, and cancel APIs.
- Version checks and per-target publishing idempotency.
- Web importer at `/imports`.
- API-key skill endpoints, remote MCP endpoint, and OpenAPI action schema.
- Codex skill, pack builder, schema, example manifest, migrations, and parser/policy tests.

## Production verification

- [x] Preview build succeeds.
- [x] Pull request merges to `main`.
- [ ] Production deployment is Ready at `socio.jengasites.com`.
- [ ] `/imports` redirects an unauthenticated visitor to login.
- [ ] `/socio-publisher.openapi.json` returns 200.
- [ ] `/api/mcp` rejects missing authorization for tool calls.
- [ ] Pack upload creates staging records only.
- [ ] Draft creation starts no workflow.
- [ ] Scheduling requires exact confirmation and a current publisher session.

Production was retriggered from the clean `main` branch after Vercel's temporary build-rate limit cleared.

A documentation-only production retrigger was issued on 20 July 2026; no social content was created or modified.

The remote API uses `SOCIO_SKILL_API_KEY` when configured. Otherwise Socio derives an isolated key from the existing `CRON_SECRET`; an authenticated administrator can read the connection details through `/api/skill-key`.
