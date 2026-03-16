-- migrations/add_ephemeral_to_messages.sql
-- Adds ephemeral message support to the messages table
-- Run: mysql -u root -p chatapp < migrations/add_ephemeral_to_messages.sql

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_ephemeral  TINYINT(1)   NOT NULL DEFAULT 0   COMMENT '1 = self-destructing message',
  ADD COLUMN IF NOT EXISTS ephemeral_duration INT      DEFAULT NULL         COMMENT 'seconds until deletion after read_at',
  ADD COLUMN IF NOT EXISTS read_at        DATETIME     DEFAULT NULL         COMMENT 'timestamp when recipient first read the message';

-- Index to make the cron job fast: only scan ephemeral, already-read, content-present rows
CREATE INDEX IF NOT EXISTS idx_ephemeral_expiry
  ON messages (is_ephemeral, read_at, ephemeral_duration);
