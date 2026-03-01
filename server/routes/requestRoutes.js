/**
 * routes/requestRoutes.js
 * Connection request system — send, accept, decline, list pending, check status
 */
const express = require('express');
const db = require('../config/db');
const router = express.Router();

// POST /api/requests/send
router.post('/send', async (req, res) => {
    try {
        const { sender, receiver } = req.body;
        if (!sender || !receiver) return res.status(400).json({ error: 'sender and receiver required' });
        if (sender === receiver) return res.status(400).json({ error: 'Cannot send request to yourself' });

        // Check if already connected or pending
        const [existing] = await db.query(
            `SELECT status FROM connection_requests WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)`,
            [sender, receiver, receiver, sender]
        );
        if (existing.length) {
            const s = existing[0].status;
            if (s === 'accepted') return res.status(409).json({ error: 'Already connected' });
            if (s === 'pending') return res.status(409).json({ error: 'Request already sent' });
            // declined — allow re-send
            await db.query(
                `UPDATE connection_requests SET status='pending', updated_at=NOW() WHERE sender=? AND receiver=?`,
                [sender, receiver]
            );
            return res.json({ success: true, message: 'Request re-sent' });
        }

        await db.query(
            `INSERT INTO connection_requests (sender, receiver, status) VALUES (?, ?, 'pending')`,
            [sender, receiver]
        );

        // Real-time notify the receiver if online
        const io = req.app.get('io');
        if (io) io.to(`user:${receiver}`).emit('connection_request', { sender, receiver });

        res.json({ success: true, message: 'Request sent' });
    } catch (err) {
        console.error('send request error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/requests/accept
router.put('/accept', async (req, res) => {
    try {
        const { sender, receiver } = req.body;
        await db.query(
            `UPDATE connection_requests SET status='accepted', updated_at=NOW() WHERE sender=? AND receiver=? AND status='pending'`,
            [sender, receiver]
        );
        // Notify sender that request was accepted
        const io = req.app.get('io');
        if (io) io.to(`user:${sender}`).emit('request_accepted', { sender, receiver });
        res.json({ success: true });
    } catch (err) {
        console.error('accept error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/requests/decline
router.put('/decline', async (req, res) => {
    try {
        const { sender, receiver } = req.body;
        await db.query(
            `UPDATE connection_requests SET status='declined', updated_at=NOW() WHERE sender=? AND receiver=? AND status='pending'`,
            [sender, receiver]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('decline error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/requests/pending?username=
router.get('/pending', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) return res.status(400).json({ error: 'username required' });
        const [rows] = await db.query(
            `SELECT cr.id, cr.sender, cr.created_at, u.name
       FROM connection_requests cr
       LEFT JOIN users u ON u.username = cr.sender
       WHERE cr.receiver = ? AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
            [username]
        );
        res.json({ requests: rows });
    } catch (err) {
        console.error('pending error', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/requests/status?me=&other=
router.get('/status', async (req, res) => {
    try {
        const { me, other } = req.query;
        const [rows] = await db.query(
            `SELECT sender, receiver, status FROM connection_requests
       WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)`,
            [me, other, other, me]
        );
        if (!rows.length) return res.json({ status: 'none' });
        const r = rows[0];
        res.json({ status: r.status, isSender: r.sender === me });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
