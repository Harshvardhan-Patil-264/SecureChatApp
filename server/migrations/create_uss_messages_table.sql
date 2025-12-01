-- Migration: Create separate table for Ultra Secure Chat messages
-- This keeps USS messages completely separate from regular messages

USE chatapp;

-- Create USS messages table
CREATE TABLE IF NOT EXISTS uss_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    uss_session_id INT NOT NULL,
    sender VARCHAR(255) NOT NULL,
    receiver VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    msg_no BIGINT,
    signature TEXT,
    verified BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session (uss_session_id),
    INDEX idx_users (sender, receiver),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'USS messages table created successfully' AS status;
