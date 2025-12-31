/**
 * D1 Database Schema Definitions
 * Postrella MVP-1
 */

export const SCHEMA_SQL = `
-- Sources table
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  config TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  locale TEXT DEFAULT 'tr-TR',
  score REAL DEFAULT 0,
  metadata TEXT,
  status TEXT DEFAULT 'pending',
  fetched_at INTEGER DEFAULT (strftime('%s', 'now')),
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (source_id) REFERENCES sources(id)
);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_score ON topics(score DESC);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  user_id TEXT,
  username TEXT,
  oauth_token TEXT,
  oauth_token_secret TEXT,
  refresh_token TEXT,
  scopes TEXT,
  expires_at INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform, is_active);

-- Content Jobs table
CREATE TABLE IF NOT EXISTS content_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL,
  targets TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error TEXT,
  next_run_at INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON content_jobs(status, next_run_at);

-- Content Outputs table
CREATE TABLE IF NOT EXISTS content_outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER,
  topic_id INTEGER NOT NULL,
  target TEXT NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  metadata TEXT,
  version INTEGER DEFAULT 1,
  edited_by TEXT,
  edited_at INTEGER,
  status TEXT DEFAULT 'draft',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (job_id) REFERENCES content_jobs(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);
CREATE INDEX IF NOT EXISTS idx_outputs_job ON content_outputs(job_id);
CREATE INDEX IF NOT EXISTS idx_outputs_topic ON content_outputs(topic_id);
CREATE INDEX IF NOT EXISTS idx_outputs_status ON content_outputs(status);

-- Publishes table
CREATE TABLE IF NOT EXISTS publishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  output_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  account_id INTEGER,
  status TEXT NOT NULL,
  remote_id TEXT,
  url TEXT,
  scheduled_at INTEGER,
  published_at INTEGER,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (output_id) REFERENCES content_outputs(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS idx_publishes_status ON publishes(status);
CREATE INDEX IF NOT EXISTS idx_publishes_output ON publishes(output_id);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Insert default sources
INSERT OR IGNORE INTO sources (name, config, is_active) VALUES 
  ('pinterest_trends', '{}', 1),
  ('google_trends', '{"q": "", "geo": "US", "date": "now 1-d"}', 1);
`;

// Type definitions
export interface Source {
  id: number;
  name: string;
  config: string | null;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface Topic {
  id: number;
  keyword: string;
  source_id: number;
  locale: string;
  score: number;
  metadata: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fetched_at: number;
  created_at: number;
  updated_at: number;
}

export interface Account {
  id: number;
  platform: 'x' | 'reddit' | 'site';
  user_id: string | null;
  username: string | null;
  oauth_token: string | null;
  oauth_token_secret: string | null;
  refresh_token: string | null;
  scopes: string | null;
  expires_at: number | null;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface ContentJob {
  id: number;
  topic_id: number;
  targets: string; // JSON array
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  error: string | null;
  next_run_at: number | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface ContentOutput {
  id: number;
  job_id: number;
  topic_id: number;
  target: 'site' | 'x' | 'reddit';
  title: string | null;
  body: string;
  metadata: string | null;
  version: number;
  edited_by: string | null;
  edited_at: number | null;
  status: 'draft' | 'ready' | 'published';
  created_at: number;
  updated_at: number;
}

export interface Publish {
  id: number;
  output_id: number;
  platform: 'site' | 'x' | 'reddit';
  account_id: number | null;
  status: 'pending' | 'published' | 'failed';
  remote_id: string | null;
  url: string | null;
  scheduled_at: number | null;
  published_at: number | null;
  error: string | null;
  retry_count: number;
  created_at: number;
  updated_at: number;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: number;
}

// Parsed types
export interface GoogleTrendsConfig {
  q: string;
  geo: string;
  date: string;
}

export interface TopicMetadata {
  volume?: number;
  growth?: number;
  category?: string;
  related_queries?: string[];
}

export interface ContentMetadata {
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  hashtags?: string[];
  subreddit?: string;
  category_ids?: number[];
  tag_ids?: number[];
  suggested_category?: string;
  suggested_tags?: string[];
}

