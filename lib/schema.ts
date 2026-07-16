import { getSql } from "@/lib/db";

let tikTokSchemaPromise: Promise<void> | null = null;

export function ensureTikTokSchema() {
  if (!tikTokSchemaPromise) {
    tikTokSchemaPromise = (async () => {
      const sql = getSql();
      await sql.transaction([
        sql`SELECT pg_advisory_xact_lock(hashtext('socio:tiktok-schema:v1'))`,
        sql`ALTER TABLE post_targets ADD COLUMN IF NOT EXISTS provider_publish_id text`,
        sql`ALTER TABLE post_targets ADD COLUMN IF NOT EXISTS provider_response jsonb`,
        sql`ALTER TABLE post_targets DROP CONSTRAINT IF EXISTS post_targets_platform_check`,
        sql`ALTER TABLE post_targets ADD CONSTRAINT post_targets_platform_check CHECK
          (platform IN ('facebook', 'instagram', 'tiktok'))`,
        sql`ALTER TABLE publish_attempts DROP CONSTRAINT IF EXISTS publish_attempts_platform_check`,
        sql`ALTER TABLE publish_attempts ADD CONSTRAINT publish_attempts_platform_check CHECK
          (platform IN ('facebook', 'instagram', 'tiktok'))`,
        sql`CREATE INDEX IF NOT EXISTS post_targets_provider_publish_idx
          ON post_targets (provider_publish_id) WHERE provider_publish_id IS NOT NULL`,
      ]);
    })().catch((error) => {
      tikTokSchemaPromise = null;
      throw error;
    });
  }
  return tikTokSchemaPromise;
}
