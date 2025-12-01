-- Migration: Add Ultra Secure Chat (USC) Tables
-- Description: Creates tables for passphrase-protected secure sessions with auto-wipe functionality
-- Date: 2024-11-28

USE chatapp;

-- ============================================================================
-- Table: ultra_secure_sessions
-- Purpose: Store passphrase-protected secure chat sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS ultra_secure_sessions (
    session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    
    -- Participants
    user_a VARCHAR(100) NOT NULL,
    user_b VARCHAR(100) NOT NULL,
    user_a_email VARCHAR(255) NOT NULL,
    user_b_email VARCHAR(255) NOT NULL,
    
    -- Encryption data (triple-layer: AES + RSA + Passphrase)
    double_encrypted_key_a TEXT NOT NULL,  -- Session key encrypted with RSA then passphrase (for user A)
    double_encrypted_key_b TEXT NOT NULL,  -- Session key encrypted with RSA then passphrase (for user B)
    passphrase_hash TEXT NOT NULL,         -- PBKDF2-SHA512 hash for verification
    salt VARCHAR(64) NOT NULL,             -- 32-byte salt (base64 encoded)
    iv_a VARCHAR(32) NOT NULL,             -- IV for passphrase encryption (user A)
    iv_b VARCHAR(32) NOT NULL,             -- IV for passphrase encryption (user B)
    
    -- Security tracking
    wrong_attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    status ENUM('ACTIVE', 'LOCKED', 'DELETED') DEFAULT 'ACTIVE',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_access TIMESTAMP NULL,
    locked_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    
    -- Indexes for performance
    INDEX idx_users (user_a, user_b),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    INDEX idx_locked (locked_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Ultra Secure Chat sessions with passphrase protection';

-- ============================================================================
-- Table: security_events
-- Purpose: Audit log for all security-related events
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_events (
    event_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    
    -- Event details
    event_type ENUM(
        'USS_CREATED',
        'USS_ACCESSED',
        'USS_ACCESS_DENIED',
        'USS_LOCKDOWN',
        'DECOY_ACTIVATED',
        'BACKUP_SENT',
        'BACKUP_FAILED',
        'DATA_WIPED'
    ) NOT NULL,
    
    -- Context
    session_id BIGINT NULL,
    user_involved VARCHAR(100) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    
    -- Additional data
    details JSON NULL,
    
    -- Timestamp
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_session (session_id),
    INDEX idx_type (event_type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_user (user_involved),
    
    -- Foreign key (soft delete - don't cascade)
    FOREIGN KEY (session_id) REFERENCES ultra_secure_sessions(session_id) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Security audit log for Ultra Secure Chat events';

-- ============================================================================
-- Modify existing messages table
-- Purpose: Link messages to USS sessions
-- ============================================================================
ALTER TABLE messages 
ADD COLUMN uss_session_id BIGINT NULL AFTER id,
ADD INDEX idx_uss_session (uss_session_id),
ADD FOREIGN KEY (uss_session_id) REFERENCES ultra_secure_sessions(session_id) ON DELETE CASCADE;

-- ============================================================================
-- Add email column to users table (if not exists)
-- Purpose: Store user emails for security alerts
-- ============================================================================
ALTER TABLE users 
ADD COLUMN email VARCHAR(255) NULL AFTER username;

-- ============================================================================
-- Sample data for testing (optional - remove in production)
-- ============================================================================
-- INSERT INTO ultra_secure_sessions 
-- (user_a, user_b, user_a_email, user_b_email, double_encrypted_key_a, double_encrypted_key_b, passphrase_hash, salt, iv_a, iv_b)
-- VALUES 
-- ('alice', 'bob', 'alice@test.com', 'bob@test.com', 'test_key_a', 'test_key_b', 'test_hash', 'test_salt', 'test_iv_a', 'test_iv_b');

-- ============================================================================
-- Verification queries
-- ============================================================================
-- Check tables created successfully
SELECT 
    TABLE_NAME, 
    TABLE_ROWS, 
    CREATE_TIME 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'chatapp' 
AND TABLE_NAME IN ('ultra_secure_sessions', 'security_events');

-- Check messages table modification
DESCRIBE messages;

-- Check users table modification
DESCRIBE users;
