CREATE TABLE authorized_user (
  email TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('admin', 'user'))
);

INSERT INTO authorized_user (email, type) VALUES
  ('krnovak@gmail.com', 'admin'),
  ('julie.duffield@gmail.com', 'user');

CREATE TABLE selection_history (
  owner_id TEXT NOT NULL REFERENCES app_users(owner_id) ON DELETE CASCADE,
  expression TEXT NOT NULL,
  used_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, expression)
);

CREATE INDEX idx_selection_history_owner_used
ON selection_history(owner_id, used_at DESC);
