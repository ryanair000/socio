# Socio

Socio is a responsive social-media operations platform for planning, creating, approving, publishing and measuring content across managed brands.

## Live release

- Production: https://socio-beryl.vercel.app
- Figma: https://www.figma.com/design/EGJFVPismQhDS33thnk7I1

## Included

- Command Centre and weekly planner
- Campaign and content-board workflows
- Product-aware Creative Studio
- Approvals and safe publishing retries
- Assets, product feed and engagement inbox
- Analytics and social-sales attribution
- Automations, team roles and settings
- Responsive desktop, tablet and mobile layouts
- Accessible navigation, dialogs, form guardrails and status feedback

## Local development

```bash
npm install
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

The suite covers component interactions, form guardrails, accessibility, independent workflow controls, static-route generation and internal-link integrity.

## Release scope

The current public release uses realistic demo data and browser-local interactions. Production Meta publishing, OpenAI generation, durable database records, asset storage and ChezaHub order attribution require protected backend credentials and are intentionally not embedded in the public repository.
