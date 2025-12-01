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
            `SELECT id, uss_session_id, sender, receiver, content, msg_no AS msgNo, signature, verified, timestamp
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
            console.log(`USS message signature: ${verified ? '✓ VALID' : '✗ INVALID'}`);
        }

        // Insert into uss_messages table
        const [result] = await db.query(
            `INSERT INTO uss_messages (uss_session_id, sender, receiver, content, msg_no, signature, verified, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
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
            timestamp: new Date()
        };

        io.to(receiver).emit('uss_message', messageObj);

        res.status(201).json({ success: true, message: messageObj });
    } catch (err) {
        console.error('Failed to send USS message:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
