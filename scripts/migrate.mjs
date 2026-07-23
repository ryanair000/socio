import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    "DATABASE_URL is required. Run through `node --env-file=.env.local`. ",
  );

const sql = neon(databaseUrl);
const statements = [
  `CREATE TABLE IF NOT EXISTS socio_sessions (
    id uuid PRIMARY KEY,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS publisher_credentials (
    id uuid PRIMARY KEY,
    encrypted_token text NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS posts (
    id uuid PRIMARY KEY,
    title text NOT NULL,
    caption text NOT NULL DEFAULT '',
    brand text NOT NULL CHECK (brand IN ('chezahub', 'jengasites')),
    image_url text NOT NULL,
    image_pathname text NOT NULL,
    status text NOT NULL CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
    scheduled_at timestamptz,
    schedule_version integer NOT NULL DEFAULT 0,
    workflow_run_id text,
    publisher_credential_id uuid REFERENCES publisher_credentials(id),
    last_error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_format text NOT NULL DEFAULT 'single'
    CHECK (post_format IN ('single', 'carousel', 'story'))`,
  `ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_post_format_check`,
  `ALTER TABLE posts ADD CONSTRAINT posts_post_format_check CHECK
    (post_format IN ('single', 'carousel', 'story'))`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS qa_status text NOT NULL DEFAULT 'ready'`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS hold_reason text`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_week text`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_ref text`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS approved_at timestamptz`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_at timestamptz`,
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS claimed_at timestamptz`,
  `ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check`,
  `ALTER TABLE posts ADD CONSTRAINT posts_status_check CHECK
    (status IN ('draft', 'scheduled', 'publishing', 'published', 'partially_published', 'failed', 'cancelled'))`,
  `ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_qa_status_check`,
  `ALTER TABLE posts ADD CONSTRAINT posts_qa_status_check CHECK
    (qa_status IN ('ready', 'ready_after_qa', 'hold'))`,
  `CREATE TABLE IF NOT EXISTS post_media (
    post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    position integer NOT NULL CHECK (position >= 0 AND position < 10),
    image_url text NOT NULL,
    image_pathname text NOT NULL,
    PRIMARY KEY (post_id, position)
  )`,
  `INSERT INTO post_media (post_id, position, image_url, image_pathname)
    SELECT id, 0, image_url, image_pathname FROM posts
    ON CONFLICT (post_id, position) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS post_targets (
    post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'tiktok')),
    status text NOT NULL CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
    provider_post_id text,
    provider_publish_id text,
    provider_response jsonb,
    last_error text,
    attempts integer NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, platform)
  )`,
  `ALTER TABLE post_targets ADD COLUMN IF NOT EXISTS idempotency_key text`,
  `ALTER TABLE post_targets ADD COLUMN IF NOT EXISTS published_at timestamptz`,
  `ALTER TABLE post_targets ADD COLUMN IF NOT EXISTS provider_publish_id text`,
  `ALTER TABLE post_targets ADD COLUMN IF NOT EXISTS provider_response jsonb`,
  `ALTER TABLE post_targets DROP CONSTRAINT IF EXISTS post_targets_status_check`,
  `ALTER TABLE post_targets ADD CONSTRAINT post_targets_status_check CHECK
    (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled'))`,
  `ALTER TABLE post_targets DROP CONSTRAINT IF EXISTS post_targets_platform_check`,
  `ALTER TABLE post_targets ADD CONSTRAINT post_targets_platform_check CHECK
    (platform IN ('facebook', 'instagram', 'tiktok'))`,
  `UPDATE post_targets SET idempotency_key = post_id::text || ':' || platform
    WHERE idempotency_key IS NULL`,
  `ALTER TABLE post_targets ALTER COLUMN idempotency_key SET NOT NULL`,
  `CREATE TABLE IF NOT EXISTS publish_attempts (
    id uuid PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('facebook', 'instagram', 'tiktok')),
    attempt_number integer NOT NULL,
    status text NOT NULL CHECK (status IN ('publishing', 'published', 'failed')),
    provider_post_id text,
    error text,
    response jsonb,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    UNIQUE (post_id, platform, attempt_number)
  )`,
  `ALTER TABLE publish_attempts DROP CONSTRAINT IF EXISTS publish_attempts_platform_check`,
  `ALTER TABLE publish_attempts ADD CONSTRAINT publish_attempts_platform_check CHECK
    (platform IN ('facebook', 'instagram', 'tiktok'))`,
  `CREATE INDEX IF NOT EXISTS posts_scheduled_at_idx ON posts (scheduled_at)`,
  `CREATE INDEX IF NOT EXISTS posts_status_idx ON posts (status)`,
  `CREATE INDEX IF NOT EXISTS posts_due_idx ON posts (status, scheduled_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS posts_source_ref_idx ON posts (source_ref) WHERE source_ref IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS post_targets_idempotency_idx ON post_targets (idempotency_key)`,
  `CREATE INDEX IF NOT EXISTS post_targets_provider_publish_idx ON post_targets (provider_publish_id) WHERE provider_publish_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS post_media_post_idx ON post_media (post_id, position)`,
  `CREATE INDEX IF NOT EXISTS publisher_credentials_expiry_idx ON publisher_credentials (expires_at DESC)`,
  `CREATE INDEX IF NOT EXISTS socio_sessions_token_idx ON socio_sessions (token_hash, expires_at)`,
];

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`Applied ${statements.length} Socio database statements.`);
