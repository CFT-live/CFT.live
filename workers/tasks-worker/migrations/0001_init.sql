-- Tasks + contributions schema (v1)
-- Notes:
-- - Integers are used for timestamps (ms since epoch).
-- - shares are stored as basis points: 10000 = 100.00%

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	body_markdown TEXT NOT NULL DEFAULT '',
	type TEXT NOT NULL DEFAULT 'GENERAL',
	status TEXT NOT NULL DEFAULT 'OPEN',
	tags_json TEXT NOT NULL DEFAULT '[]',
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

CREATE TABLE IF NOT EXISTS task_comments (
	id TEXT PRIMARY KEY,
	task_id TEXT NOT NULL,
	author_address TEXT,
	content_markdown TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id_created_at ON task_comments(task_id, created_at);

CREATE TABLE IF NOT EXISTS task_pr_links (
	id TEXT PRIMARY KEY,
	task_id TEXT NOT NULL,
	url TEXT NOT NULL,
	added_by_address TEXT,
	added_at INTEGER NOT NULL,
	FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_pr_links_task_id_added_at ON task_pr_links(task_id, added_at);

CREATE TABLE IF NOT EXISTS task_contributions (
	task_id TEXT NOT NULL,
	contributor_address TEXT NOT NULL,
	share_bps INTEGER,
	note TEXT,
	updated_at INTEGER NOT NULL,
	PRIMARY KEY(task_id, contributor_address),
	FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_contributions_task_id ON task_contributions(task_id);
