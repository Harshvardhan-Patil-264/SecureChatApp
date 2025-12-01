-- Production Cleanup Script
-- This script removes ALL test data and prepares the database for production use
-- WARNING: This will delete ALL users, messages, sessions, and related data!

USE chatapp;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- STEP 1: Clean all user-related data
-- ============================================================================

-- Delete all regular messages
DELETE FROM messages;
SELECT 'Cleared messages table' AS status;

-- Delete all USS messages (ultra secure chat)
DELETE FROM uss_messages;
SELECT 'Cleared uss_messages table' AS status;

-- Delete all USS sessions
DELETE FROM ultra_secure_sessions;
SELECT 'Cleared ultra_secure_sessions table' AS status;

-- Delete all security events
DELETE FROM security_events;
SELECT 'Cleared security_events table' AS status;

-- Delete all security logs
DELETE FROM security_logs;
SELECT 'Cleared security_logs table' AS status;

-- Delete all user public keys
DELETE FROM user_public_keys;
SELECT 'Cleared user_public_keys table' AS status;

-- Delete all sessions
DELETE FROM sessions;
SELECT 'Cleared sessions table' AS status;

-- Delete all images
DELETE FROM images;
SELECT 'Cleared images table' AS status;

-- Delete all users (this should be last)
DELETE FROM users;
SELECT 'Cleared users table' AS status;

-- ============================================================================
-- STEP 2: Reset auto-increment counters
-- ============================================================================

ALTER TABLE messages AUTO_INCREMENT = 1;
ALTER TABLE uss_messages AUTO_INCREMENT = 1;
ALTER TABLE ultra_secure_sessions AUTO_INCREMENT = 1;
ALTER TABLE security_events AUTO_INCREMENT = 1;
ALTER TABLE security_logs AUTO_INCREMENT = 1;
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE images AUTO_INCREMENT = 1;

SELECT 'Reset all auto-increment counters' AS status;

-- ============================================================================
-- STEP 3: Re-enable foreign key checks
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- VERIFICATION - Show all tables are empty
-- ============================================================================

SELECT 
    'users' AS table_name, 
    COUNT(*) AS record_count 
FROM users
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'uss_messages', COUNT(*) FROM uss_messages
UNION ALL
SELECT 'ultra_secure_sessions', COUNT(*) FROM ultra_secure_sessions
UNION ALL
SELECT 'security_events', COUNT(*) FROM security_events
UNION ALL
SELECT 'security_logs', COUNT(*) FROM security_logs
UNION ALL
SELECT 'user_public_keys', COUNT(*) FROM user_public_keys
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'images', COUNT(*) FROM images;

SELECT '✅ Database cleaned and ready for production!' AS status;
