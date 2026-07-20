import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required. Run through node --env-file=.env.local.");
const sql = neon(databaseUrl);
const statements = [
  `CREATE TABLE IF NOT EXISTS import_batches (
    id uuid PRIMARY KEY, pack_hash text NOT NULL UNIQUE, name text NOT NULL,
    brand text NOT NULL, timezone text NOT NULL, schema_version text NOT NULL,
    source_week text, default_overdue_policy text NOT NULL DEFAULT 'roll_forward',
    status text NOT NULL DEFAULT 'needs_review', version integer NOT NULL DEFAULT 1,
    ready_count integer NOT NULL DEFAULT 0, warning_count integer NOT NULL DEFAULT 0,
    blocked_count integer NOT NULL DEFAULT 0, total_entries integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS import_assets (
    id uuid PRIMARY KEY, batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    filename text NOT NULL, sha256 text NOT NULL, content_type text NOT NULL,
    size_bytes integer NOT NULL, image_url text NOT NULL, image_pathname text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(batch_id, filename)
  )`,
  `CREATE TABLE IF NOT EXISTS import_entries (
    id uuid PRIMARY KEY, batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    source_ref text NOT NULL, position integer NOT NULL, title text NOT NULL,
    caption text NOT NULL DEFAULT '', post_format text NOT NULL,
    platforms jsonb NOT NULL DEFAULT '[]'::jsonb, scheduled_at timestamptz,
    qa_status text NOT NULL DEFAULT 'ready', hold_reason text, content_hash text NOT NULL,
    status text NOT NULL DEFAULT 'staged', post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
    approved_at timestamptz, committed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(batch_id, source_ref)
  )`,
  `CREATE TABLE IF NOT EXISTS import_entry_media (
    entry_id uuid NOT NULL REFERENCES import_entries(id) ON DELETE CASCADE,
    asset_id uuid NOT NULL REFERENCES import_assets(id) ON DELETE CASCADE,
    position integer NOT NULL, PRIMARY KEY(entry_id, position)
  )`,
  `CREATE TABLE IF NOT EXISTS import_checks (
    id uuid PRIMARY KEY, batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    entry_id uuid REFERENCES import_entries(id) ON DELETE CASCADE,
    code text NOT NULL, severity text NOT NULL, message text NOT NULL,
    resolved boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
  )`,
  `CREATE TABLE IF NOT EXISTS import_events (
    id uuid PRIMARY KEY, batch_id uuid NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
    event_type text NOT NULL, details jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS import_batches_status_idx ON import_batches(status, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS import_entries_batch_idx ON import_entries(batch_id, position)`,
  `CREATE INDEX IF NOT EXISTS import_entries_post_idx ON import_entries(post_id) WHERE post_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS import_checks_batch_idx ON import_checks(batch_id, severity, resolved)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS import_entries_content_hash_idx ON import_entries(batch_id, content_hash)`,
];
for (const statement of statements) await sql.query(statement);
console.log(`Applied ${statements.length} Socio import statements.`);
