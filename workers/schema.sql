-- Postrella D1 Database Schema

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
  source_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  locale TEXT DEFAULT 'en-US',
  score INTEGER DEFAULT 0,
  volume INTEGER,
  velocity REAL,
  category TEXT,
  metadata TEXT,
  status TEXT DEFAULT 'new',
  site_config_id INTEGER,
  fetched_at INTEGER DEFAULT (strftime('%s', 'now')),
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (source_id) REFERENCES sources(id),
  FOREIGN KEY (site_config_id) REFERENCES site_configs(id)
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  user_id TEXT,
  username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at INTEGER,
  scopes TEXT,
  metadata TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Content Jobs table
CREATE TABLE IF NOT EXISTS content_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL,
  targets TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_run_at INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  error TEXT,
  metadata TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

-- Content Outputs table
CREATE TABLE IF NOT EXISTS content_outputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  topic_id INTEGER,
  target TEXT NOT NULL,
  title TEXT,
  body TEXT,
  metadata TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (job_id) REFERENCES content_jobs(id),
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);

-- Publishes table
CREATE TABLE IF NOT EXISTS publishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  output_id INTEGER NOT NULL,
  account_id INTEGER,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  remote_id TEXT,
  url TEXT,
  error TEXT,
  scheduled_at INTEGER,
  published_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (output_id) REFERENCES content_outputs(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Subscribers table for mailing
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  is_active INTEGER DEFAULT 1,
  unsubscribed_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Unsubscribe sites table for site-specific unsubscribe management
CREATE TABLE IF NOT EXISTS unsubscribe_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscriber_id INTEGER NOT NULL,
  site_id TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
  UNIQUE(subscriber_id, site_id)
);

-- Site configs table
CREATE TABLE IF NOT EXISTS site_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  site_id TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  domain TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Site trend configs table
CREATE TABLE IF NOT EXISTS site_trend_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_config_id INTEGER NOT NULL,
  keywords TEXT NOT NULL,
  geo TEXT DEFAULT 'US',
  cat TEXT DEFAULT '0',
  date TEXT DEFAULT 'now 1-d',
  excluded_keywords TEXT,
  q_filter TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (site_config_id) REFERENCES site_configs(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_topics_source_id ON topics(source_id);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
CREATE INDEX IF NOT EXISTS idx_topics_keyword ON topics(keyword);
CREATE INDEX IF NOT EXISTS idx_content_jobs_topic_id ON content_jobs(topic_id);
CREATE INDEX IF NOT EXISTS idx_content_jobs_status ON content_jobs(status);
CREATE INDEX IF NOT EXISTS idx_content_outputs_job_id ON content_outputs(job_id);
CREATE INDEX IF NOT EXISTS idx_content_outputs_target ON content_outputs(target);
CREATE INDEX IF NOT EXISTS idx_publishes_output_id ON publishes(output_id);
CREATE INDEX IF NOT EXISTS idx_publishes_platform ON publishes(platform);
CREATE INDEX IF NOT EXISTS idx_publishes_status ON publishes(status);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_sites_subscriber ON unsubscribe_sites(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_sites_site ON unsubscribe_sites(site_id);
CREATE INDEX IF NOT EXISTS idx_topics_site_config_id ON topics(site_config_id);
CREATE INDEX IF NOT EXISTS idx_site_trend_configs_site_config_id ON site_trend_configs(site_config_id);
CREATE INDEX IF NOT EXISTS idx_site_trend_configs_active ON site_trend_configs(is_active);

-- Insert default sources
INSERT OR IGNORE INTO sources (name, config, is_active) VALUES 
  ('pinterest_trends', '{"enabled": true}', 1),
  ('google_trends', '{"enabled": true, "q": "quotes", "geo": "US", "date": "now 1-d"}', 1);

