/**
 * routes/ussRoutes.js
 * API routes for Ultra Secure Chat (USC) sessions
 */

const express = require('express');
const ussService = require('../services/ussService');

const router = express.Router();

/**
 * POST /api/uss/create
 * Create a new Ultra Secure Session
 * 
 * Body: {
 *   userA, userB, userAEmail, userBEmail,
 *   doubleEncryptedKeyA, doubleEncryptedKeyB,
 *   passphraseHash, salt, ivA, ivB
 * }
 */
router.post('/create', async (req, res) => {
    try {
        const {
            userA,
            userB,
            doubleEncryptedKeyA,
            doubleEncryptedKeyB,
            passphraseHash,
            salt,
            ivA,
            ivB
        } = req.body;

        // Validation
        if (!userA || !userB) {
            return res.status(400).json({ error: 'Missing required user information' });
        }

        if (!doubleEncryptedKeyA || !doubleEncryptedKeyB || !passphraseHash || !salt || !ivA || !ivB) {
            return res.status(400).json({ error: 'Missing required encryption data' });
        }

        // Fetch user emails from database
        const db = require('../config/db');
        const [userAData] = await db.query('SELECT email FROM users WHERE username = ?', [userA]);
        const [userBData] = await db.query('SELECT email FROM users WHERE username = ?', [userB]);

        if (!userAData.length || !userBData.length) {
            return res.status(404).json({ error: 'One or both users not found' });
        }

        const userAEmail = userAData[0].email;
        const userBEmail = userBData[0].email;

        const sessionId = await ussService.createUSSSession({
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
        });

        res.status(201).json({
            success: true,
            sessionId,
            message: 'Ultra Secure Session created successfully'
        });

    } catch (error) {
        console.error('USS creation error:', error);
        res.status(500).json({ error: 'Failed to create Ultra Secure Session' });
    }
});

/**
 * GET /api/uss/:sessionId
 * Get USS session by ID
 * 
 * Query: ?requestingUser=username
 */
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { requestingUser } = req.query;

        if (!requestingUser) {
            return res.status(400).json({ error: 'requestingUser query parameter required' });
        }

        const session = await ussService.getUSSSession(parseInt(sessionId), requestingUser);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        if (session.status === 'LOCKED') {
            return res.status(403).json({
                error: 'Session locked due to security concerns',
                status: 'LOCKED'
            });
        }

        if (session.status === 'DELETED') {
            return res.status(410).json({
                error: 'Session has been deleted',
                status: 'DELETED'
            });
        }

        res.json(session);

    } catch (error) {
        console.error('USS fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

/**
 * GET /api/uss/users/:userA/:userB
 * Get USS session between two users
 * 
 * Query: ?requestingUser=username
 */
router.get('/users/:userA/:userB', async (req, res) => {
    try {
        const { userA, userB } = req.params;
        const { requestingUser } = req.query;

        if (!requestingUser) {
            return res.status(400).json({ error: 'requestingUser query parameter required' });
        }

        const session = await ussService.getUSSSessionByUsers(userA, userB, requestingUser);

        if (!session) {
            return res.status(404).json({ error: 'No active session found' });
        }

        if (session.status === 'LOCKED') {
            return res.status(403).json({
                error: 'Session locked due to security concerns',
                status: 'LOCKED'
            });
        }

        res.json(session);

    } catch (error) {
        console.error('USS fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

/**
 * POST /api/uss/:sessionId/verify
 * Verify passphrase attempt
 * 
 * Body: { success: boolean }
 * (Client performs verification, server just tracks attempts)
 */
router.post('/:sessionId/verify', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { success } = req.body;

        if (success) {
            // Reset wrong attempts on successful verification
            await ussService.resetWrongAttempts(parseInt(sessionId));
            res.json({
                success: true,
                message: 'Access granted',
                attemptsRemaining: 3
            });
        } else {
            // Increment wrong attempts
            const newAttempts = await ussService.incrementWrongAttempts(parseInt(sessionId));
            const attemptsRemaining = Math.max(0, 3 - newAttempts);

            if (newAttempts >= 3) {
                res.status(403).json({
                    success: false,
                    message: 'Session locked due to too many failed attempts',
                    attemptsRemaining: 0,
                    locked: true
                });
            } else {
                res.json({
                    success: false,
                    message: `Incorrect passphrase. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`,
                    attemptsRemaining
                });
            }
        }

    } catch (error) {
        console.error('USS verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

/**
 * GET /api/uss/:sessionId/status
 * Get session status
 */
router.get('/:sessionId/status', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { requestingUser } = req.query;

        if (!requestingUser) {
            return res.status(400).json({ error: 'requestingUser required' });
        }

        const session = await ussService.getUSSSession(parseInt(sessionId), requestingUser);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({
            sessionId: session.sessionId,
            status: session.status,
            wrongAttempts: session.wrongAttempts,
            attemptsRemaining: Math.max(0, 3 - session.wrongAttempts),
            createdAt: session.createdAt,
            lastAccess: session.lastAccess
        });

    } catch (error) {
        console.error('USS status error:', error);
        res.status(500).json({ error: 'Failed to fetch status' });
    }
});

/**
 * GET /api/uss/:sessionId/events
 * Get security events for a session
 */
router.get('/:sessionId/events', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const events = await ussService.getSecurityEvents(parseInt(sessionId));
        res.json(events);
    } catch (error) {
        console.error('USS events error:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

module.exports = router;
