# Socio scheduler operations

## Release setup

1. Pull the Vercel Development environment into `.env.local`.
2. Set `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `SESSION_ENCRYPTION_KEY`, `SMMPRO_BASE_URL`, and a strong `CRON_SECRET` in every deployed environment.
3. Run `npm run db:migrate` before deploying application code.
4. Run `npm run check`.
5. Deploy to the existing Socio project and verify `/api/cron/publish-due` returns `401` without `Authorization: Bearer <CRON_SECRET>`.

The migration may be rerun. It backfills stable target idempotency keys and adds QA, source-pack, claim, partial-publication, cancellation, and published-at fields.

## Week 1 import

Use the seven small day ZIPs in the organized Drive folder; the split full backup is not accepted by the web importer.

1. Open **New Post**.
2. Select one `Monday_Posters_and_Captions.zip` through `Sunday_Posters_and_Captions.zip` file.
3. Import and inspect the five resulting calendar slots.
4. READY entries remain drafts until the operator schedules or publishes them.
5. READY AFTER QA entries require the artwork correction and **Confirm QA complete**.
6. HOLD entries remain blocked. Editing their caption does not remove the hold.

The importer enforces a 25 MB compressed limit, an 80 MB expanded limit, ten supported images, five schedule sections, ordered filenames, and duplicate source references.

## Overdue publishing

Calendar marks past draft/scheduled items as overdue. **Publish overdue now** presents the exact title and target platforms. Confirm only after checking current deal price, expiry, stock, region, artwork rights, and the QA status. Published targets are never reset.

The Monday Fortnite group and every other HOLD item must not be published unchanged.

## Queue and recovery

- A Vercel Workflow sleeps until the EAT schedule converted to UTC.
- The post claim is an atomic `scheduled -> publishing` update and requires `qa_status = ready`.
- Each target has a stable `<post-id>:<platform>` idempotency key.
- Network, 429, and provider 5xx failures retry with bounded backoff.
- AWS EventBridge rule `socio-publish-due-every-5-minutes` in `eu-west-1` calls the protected endpoint every five minutes to start overdue workflows and reset publishing claims older than ten minutes; a daily Vercel cron is the fallback.
- The rule targets API destination `socio-publish-due` through connection `socio-cron-connection` and IAM role `SocioEventBridgeApiDestinationRole` with three retries.
- When rotating `CRON_SECRET`, deploy the new Vercel value before updating the EventBridge connection so the connection remains authorized.
- A mixed target result becomes `partially_published`; retry selects only failed targets.

## SMMPRO acceptance check

Before production carousel publishing, verify the deployed SMMPRO `/api/post` route accepts repeated `imageUrls` form fields and `idempotencyKey`, creates one native Facebook multi-photo post or Instagram carousel, and returns one platform result containing the final provider media ID. Socio continues to send the legacy first `imageUrl` for one-image compatibility.

If the deployed SMMPRO version does not yet implement those fields, keep carousel posts as drafts; do not treat independent image posts as a carousel substitute.

## Production smoke test

1. Sign in through the SMMPRO bridge.
2. Create a one-image draft and refresh the page.
3. Create a three-image carousel, confirm order, and schedule it at least two minutes ahead.
4. Verify the cron and Workflow run claim it once.
5. Confirm Facebook and Instagram target rows are independent.
6. Force one target failure in a non-production account, then retry and verify the successful target is unchanged.
7. Import one Week 1 day pack and verify READY AFTER QA and HOLD labels.
