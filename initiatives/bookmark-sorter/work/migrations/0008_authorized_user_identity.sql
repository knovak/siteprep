ALTER TABLE authorized_user ADD COLUMN user_id TEXT;

CREATE UNIQUE INDEX idx_authorized_user_user_id
ON authorized_user(user_id)
WHERE user_id IS NOT NULL;
