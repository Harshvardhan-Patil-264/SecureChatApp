/**
 * services/ussService.js
 * Ultra Secure Chat (USC) Service
 * Handles passphrase-protected secure sessions with triple-layer encryption
 */

const db = require('../config/db');

/**
 * Create conversation ID from two usernames (deterministic, order-independent)
 * @param {string} userA - First user
 * @param {string} userB - Second user
 * @returns {string} Conversation ID (e.g., "alice:bob")
 */
function getConversationId(userA, userB) {
    return [userA, userB].sort().join(':');
}

/**
 * Create a new Ultra Secure Session
 * @param {object} sessionData - Session creation data
 * @param {string} sessionData.userA - First user
 * @param {string} sessionData.userB - Second user
 * @param {string} sessionData.userAEmail - First user's email
 * @param {string} sessionData.userBEmail - Second user's email
 * @param {string} sessionData.doubleEncryptedKeyA - Session key encrypted for user A
 * @param {string} sessionData.doubleEncryptedKeyB - Session key encrypted for user B
 * @param {string} sessionData.passphraseHash - PBKDF2-SHA512 hash of passphrase
 * @param {string} sessionData.salt - 32-byte salt (base64)
 * @param {string} sessionData.ivA - IV for user A's encryption (base64)
 * @param {string} sessionData.ivB - IV for user B's encryption (base64)
 * @returns {Promise<number>} Session ID
 */
async function createUSSSession(sessionData) {
    const {
        userA,
        userB,
        userAEmail,
        userBEmail,
        doubleEncryptedKeyA,
        doubleEncryptedKeyB,
        passphraseHash,
        salt,
        ivA,
        ivB
    } = sessionData;

    const sql = `
        INSERT INTO ultra_secure_sessions 
        (user_a, user_b, user_a_email, user_b_email, 
         double_encrypted_key_a, double_encrypted_key_b, 
         passphrase_hash, salt, iv_a, iv_b, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `;

    const [result] = await db.query(sql, [
        userA,
        userB,
        userAEmail,
        userBEmail,
        doubleEncryptedKeyA,
        doubleEncryptedKeyB,
        passphraseHash,
        salt,
        ivA,
        ivB
    ]);

    // Log security event
    await logSecurityEvent({
        eventType: 'USS_CREATED',
        sessionId: result.insertId,
        userInvolved: userA,
        details: JSON.stringify({ userA, userB, createdAt: new Date() })
    });

    return result.insertId;
}

/**
 * Get USS session by ID
 * @param {number} sessionId - Session ID
 * @param {string} requestingUser - Username of user requesting session
 * @returns {Promise<object|null>} Session data or null
 */
async function getUSSSession(sessionId, requestingUser) {
    const [rows] = await db.query(
        `SELECT session_id, user_a, user_b, 
                double_encrypted_key_a, double_encrypted_key_b,
                passphrase_hash, salt, iv_a, iv_b,
                wrong_attempts, status, created_at, last_access
         FROM ultra_secure_sessions
         WHERE session_id = ?`,
        [sessionId]
    );

    if (rows.length === 0) return null;

    const session = rows[0];

    // Return appropriate encrypted key based on requesting user
    const isUserA = requestingUser === session.user_a;
    const doubleEncryptedKey = isUserA
        ? session.double_encrypted_key_a
        : session.double_encrypted_key_b;
    const iv = isUserA ? session.iv_a : session.iv_b;

    // Update last access time
    await db.query(
        'UPDATE ultra_secure_sessions SET last_access = NOW() WHERE session_id = ?',
        [sessionId]
    );

    return {
        sessionId: session.session_id,
        userA: session.user_a,
        userB: session.user_b,
        doubleEncryptedKey,
        passphraseHash: session.passphrase_hash,
        salt: session.salt,
        iv,
        wrongAttempts: session.wrong_attempts,
        status: session.status,
        createdAt: session.created_at,
        lastAccess: session.last_access
    };
}

/**
 * Get USS session between two users
 * @param {string} userA - First user
 * @param {string} userB - Second user
 * @param {string} requestingUser - User requesting the session
 * @returns {Promise<object|null>} Session data or null
 */
async function getUSSSessionByUsers(userA, userB, requestingUser) {
    const [rows] = await db.query(
        `SELECT session_id, user_a, user_b,
                double_encrypted_key_a, double_encrypted_key_b,
                passphrase_hash, salt, iv_a, iv_b,
                wrong_attempts, status, created_at, last_access
         FROM ultra_secure_sessions
         WHERE ((user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?))
         AND status = 'ACTIVE'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userA, userB, userB, userA]
    );

    if (rows.length === 0) return null;

    const session = rows[0];
    const isUserA = requestingUser === session.user_a;
    const doubleEncryptedKey = isUserA
        ? session.double_encrypted_key_a
        : session.double_encrypted_key_b;
    const iv = isUserA ? session.iv_a : session.iv_b;

    return {
        sessionId: session.session_id,
        userA: session.user_a,
        userB: session.user_b,
        doubleEncryptedKey,
        passphraseHash: session.passphrase_hash,
        salt: session.salt,
        iv,
        wrongAttempts: session.wrong_attempts,
        status: session.status,
        createdAt: session.created_at,
        lastAccess: session.last_access
    };
}

/**
 * Increment wrong passphrase attempts
 * @param {number} sessionId - Session ID
 * @returns {Promise<number>} New attempt count
 */
async function incrementWrongAttempts(sessionId) {
    const [session] = await db.query(
        'SELECT wrong_attempts, user_a, user_b FROM ultra_secure_sessions WHERE session_id = ?',
        [sessionId]
    );

    if (session.length === 0) {
        throw new Error('Session not found');
    }

    const newAttempts = session[0].wrong_attempts + 1;

    await db.query(
        'UPDATE ultra_secure_sessions SET wrong_attempts = ? WHERE session_id = ?',
        [newAttempts, sessionId]
    );

    // Log security event
    await logSecurityEvent({
        eventType: 'USS_ACCESS_DENIED',
        sessionId,
        userInvolved: null,
        details: JSON.stringify({ attempts: newAttempts, timestamp: new Date() })
    });

    // If 3 attempts reached, trigger lockdown
    if (newAttempts >= 3) {
        await activateLockdown(sessionId);
    }

    return newAttempts;
}

/**
 * Reset wrong attempts counter (after successful access)
 * @param {number} sessionId - Session ID
 */
async function resetWrongAttempts(sessionId) {
    await db.query(
        'UPDATE ultra_secure_sessions SET wrong_attempts = 0, last_access = NOW() WHERE session_id = ?',
        [sessionId]
    );

    // Log successful access
    await logSecurityEvent({
        eventType: 'USS_ACCESSED',
        sessionId,
        userInvolved: null,
        details: JSON.stringify({ timestamp: new Date() })
    });
}

/**
 * Activate lockdown mode (after 3 failed attempts)
 * @param {number} sessionId - Session ID
 */
async function activateLockdown(sessionId) {
    const zipService = require('./zipService');
    const emailService = require('./emailService');

    try {
        console.log(`🔒 Activating lockdown for session ${sessionId}`);

        // 1. Fetch session details
        const [session] = await db.query(
            'SELECT * FROM ultra_secure_sessions WHERE session_id = ?',
            [sessionId]
        );

        if (session.length === 0) {
            console.error('Session not found for lockdown');
            return;
        }

        const sessionData = session[0];
        const { user_a, user_b, user_a_email, user_b_email } = sessionData;

        // 2. Export messages for this session
        console.log('📦 Exporting messages...');
        const messages = await exportMessages(sessionId);
        console.log(`✅ Exported ${messages.length} messages`);

        // 3. Create encrypted ZIP (Note: passphrase not available, use unencrypted for now)
        // In production, you'd need to decrypt with user's passphrase or use alternative encryption
        console.log('🗜️  Creating ZIP backup...');
        const zipBuffer = await zipService.createUnencryptedZip(messages, sessionId);
        console.log(`✅ ZIP created (${zipBuffer.length} bytes)`);

        // 4. Email backup to both users
        console.log('📧 Sending security emails...');
        const emailPromises = [];

        if (user_a_email) {
            emailPromises.push(
                emailService.sendSecurityEmail(
                    user_a_email,
                    user_a,
                    zipBuffer,
                    sessionId,
                    user_a,
                    user_b
                ).catch(err => {
                    console.error(`Failed to email ${user_a}:`, err.message);
                    return { success: false, error: err.message };
                })
            );
        }

        if (user_b_email) {
            emailPromises.push(
                emailService.sendSecurityEmail(
                    user_b_email,
                    user_b,
                    zipBuffer,
                    sessionId,
                    user_a,
                    user_b
                ).catch(err => {
                    console.error(`Failed to email ${user_b}:`, err.message);
                    return { success: false, error: err.message };
                })
            );
        }

        const emailResults = await Promise.all(emailPromises);
        const successfulEmails = emailResults.filter(r => r.success).length;
        console.log(`✅ Sent ${successfulEmails}/${emailResults.length} emails`);

        // Log email results
        await logSecurityEvent({
            eventType: successfulEmails > 0 ? 'BACKUP_SENT' : 'BACKUP_FAILED',
            sessionId,
            userInvolved: null,
            details: JSON.stringify({
                emailsSent: successfulEmails,
                totalRecipients: emailResults.length,
                timestamp: new Date()
            })
        });

        // 5. Wipe messages from database
        console.log('🗑️  Wiping messages from database...');
        const [deleteResult] = await db.query(
            'DELETE FROM uss_messages WHERE uss_session_id = ?',
            [sessionId]
        );
        console.log(`✅ Deleted ${deleteResult.affectedRows} messages`);

        // Log data wipe
        await logSecurityEvent({
            eventType: 'DATA_WIPED',
            sessionId,
            userInvolved: null,
            details: JSON.stringify({
                messagesDeleted: deleteResult.affectedRows,
                timestamp: new Date()
            })
        });

        // 6. Update session status to LOCKED
        await db.query(
            'UPDATE ultra_secure_sessions SET status = ?, locked_at = NOW() WHERE session_id = ?',
            ['LOCKED', sessionId]
        );

        // 7. Log lockdown event
        await logSecurityEvent({
            eventType: 'USS_LOCKDOWN',
            sessionId,
            userInvolved: null,
            details: JSON.stringify({
                userA: user_a,
                userB: user_b,
                reason: 'Brute-force detected (3 failed attempts)',
                messagesExported: messages.length,
                emailsSent: successfulEmails,
                timestamp: new Date()
            })
        });

        console.log(`✅ Lockdown completed for session ${sessionId}`);

    } catch (error) {
        console.error('❌ Lockdown activation failed:', error);
        // Log failure but don't expose details
        await logSecurityEvent({
            eventType: 'USS_LOCKDOWN',
            sessionId,
            userInvolved: null,
            details: JSON.stringify({
                error: 'Lockdown failed',
                message: error.message,
                timestamp: new Date()
            })
        });
    }
}

/**
 * Export all messages for a USS session
 * @param {number} sessionId - Session ID
 * @returns {Promise<Array>} Array of messages
 */
async function exportMessages(sessionId) {
    const [messages] = await db.query(
        `SELECT id, sender, receiver, content, msg_no, signature, verified, timestamp
         FROM uss_messages
         WHERE uss_session_id = ?
         ORDER BY timestamp ASC`,
        [sessionId]
    );
    return messages;
}

/**
 * Log security event
 * @param {object} event - Event data
 * @param {string} event.eventType - Type of event
 * @param {number} event.sessionId - Session ID
 * @param {string} event.userInvolved - Username (optional)
 * @param {string} event.details - JSON details
 */
async function logSecurityEvent(event) {
    try {
        await db.query(
            `INSERT INTO security_events (event_type, session_id, user_involved, details)
             VALUES (?, ?, ?, ?)`,
            [event.eventType, event.sessionId, event.userInvolved, event.details]
        );
    } catch (error) {
        console.error('Failed to log security event:', error);
    }
}

/**
 * Get security events for a session
 * @param {number} sessionId - Session ID
 * @returns {Promise<Array>} Array of security events
 */
async function getSecurityEvents(sessionId) {
    const [rows] = await db.query(
        `SELECT event_id, event_type, user_involved, details, timestamp
         FROM security_events
         WHERE session_id = ?
         ORDER BY timestamp DESC`,
        [sessionId]
    );
    return rows;
}

module.exports = {
    getConversationId,
    createUSSSession,
    getUSSSession,
    getUSSSessionByUsers,
    incrementWrongAttempts,
    resetWrongAttempts,
    activateLockdown,
    exportMessages,
    logSecurityEvent,
    getSecurityEvents
};
