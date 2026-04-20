// server/routes/ussMessageRoutes.js
// Routes for Ultra Secure Chat messages (separate from regular messages)

const express = require('express');
const db = require('../config/db');
const signatureService = require('../services/signatureService');

const router = express.Router();

// Get USS messages for a session
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const [rows] = await db.query(
            `SELECT id, uss_session_id, sender, receiver, content, msg_no AS msgNo, signature, verified, timestamp, delivered, seen
             FROM uss_messages
             WHERE uss_session_id = ?
             ORDER BY timestamp ASC`,
            [sessionId]
        );

        res.json({ messages: rows });
    } catch (err) {
        console.error('Failed to load USS messages:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Mark USS messages as seen
router.put('/seen', async (req, res) => {
    const { sessionId, sender, receiver } = req.body;
    if (!sessionId || !sender || !receiver) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        await db.query(
            `UPDATE uss_messages SET seen = 1 
             WHERE uss_session_id = ? AND sender = ? AND receiver = ? AND seen = 0`,
            [sessionId, sender, receiver]
        );

        const io = req.app.get('io');
        if (io) {
            // Notify the sender that their messages have been seen
            io.to(`user:${sender}`).emit('uss_messages_seen', { sessionId, sender, receiver });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Failed to mark USS messages as seen:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Send USS message
router.post('/', async (req, res) => {
    try {
        const { ussSessionId, sender, receiver, message, msgNo, signature } = req.body;

        if (!ussSessionId || !sender || !receiver || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify signature if provided
        let verified = false;
        if (signature) {
            verified = await signatureService.verifyMessageSignature(sender, message, signature);
        }

        // Insert into uss_messages table - starts as not seen
        const [result] = await db.query(
            `INSERT INTO uss_messages (uss_session_id, sender, receiver, content, msg_no, signature, verified, delivered, seen, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, NOW())`,
            [ussSessionId, sender, receiver, message, msgNo || null, signature || null, verified ? 1 : 0]
        );

        // Get the socket.io instance
        const io = req.app.get('io');

        // Emit to receiver if online
        const messageObj = {
            id: result.insertId,
            uss_session_id: ussSessionId,
            sender,
            receiver,
            content: message,
            msgNo,
            signature,
            verified,
            delivered: true,
            seen: false,
            timestamp: new Date()
        };

        if (io) {
            io.to(`user:${receiver}`).emit('uss_message', messageObj);
        }

        res.status(201).json({ success: true, message: messageObj });
    } catch (err) {
        console.error('Failed to send USS message:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
