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
  `CREATE TABLE IF NOT EXISTS post_targets (
    post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    status text NOT NULL CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
    provider_post_id text,
    last_error text,
    attempts integer NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, platform)
  )`,
  `CREATE TABLE IF NOT EXISTS publish_attempts (
    id uuid PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    attempt_number integer NOT NULL,
    status text NOT NULL CHECK (status IN ('publishing', 'published', 'failed')),
    provider_post_id text,
    error text,
    response jsonb,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    UNIQUE (post_id, platform, attempt_number)
  )`,
  `CREATE INDEX IF NOT EXISTS posts_scheduled_at_idx ON posts (scheduled_at)`,
  `CREATE INDEX IF NOT EXISTS posts_status_idx ON posts (status)`,
  `CREATE INDEX IF NOT EXISTS publisher_credentials_expiry_idx ON publisher_credentials (expires_at DESC)`,
  `CREATE INDEX IF NOT EXISTS socio_sessions_token_idx ON socio_sessions (token_hash, expires_at)`,
];

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`Applied ${statements.length} Socio database statements.`);
