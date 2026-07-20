# Socio Publisher release checklist

## Implemented

- Approval-first import staging separate from live posts.
- Manifest 1.0 and legacy Week 1 ZIP parsing.
- Image signature, archive, size, duplicate, phone-number, QA-hold, and declared-price checks.
- Explicit review, approval, draft-only commit, schedule, and cancel APIs.
- Web interface, skill endpoints, MCP endpoint, OpenAPI schema, Codex skill, migration, and tests.

## Production checks

- [ ] Preview build and tests pass.
- [ ] Merge to `main`.
- [ ] Production deployment Ready on `socio.jengasites.com`.
- [ ] `/imports` requires Socio login.
- [ ] OpenAPI schema returns 200.
- [ ] MCP rejects missing authorization.
- [ ] Upload creates staging only; draft commit starts no workflow.
- [ ] Schedule requires confirmation and a current publisher session.

Set `SOCIO_SKILL_API_KEY` in Vercel to activate remote MCP/OpenAPI/Codex tools. The web importer uses the normal Socio login.
