/**
 * routes/userRoutes.js
 * GET /api/users/all?username=currentUser
 * Returns all users except the logged-in user
 */

const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.get('/all', async (req, res) => {
  try {
    const currentUser = req.query.username;
    if (!currentUser) return res.status(400).json({ error: 'Username is required' });

    // Only return users we have an ACCEPTED connection with
    const sql = `
      SELECT 
        u.username,
        u.name,
        (SELECT COUNT(*) 
         FROM messages m 
         WHERE m.sender = u.username 
           AND m.receiver = ? 
           AND m.delivered = 0
        ) AS unread_count,
        (SELECT content 
         FROM messages m2 
         WHERE (m2.sender = u.username AND m2.receiver = ?) 
            OR (m2.sender = ? AND m2.receiver = u.username) 
         ORDER BY m2.timestamp DESC LIMIT 1
        ) AS last_msg_content,
        (SELECT timestamp 
         FROM messages m3 
         WHERE (m3.sender = u.username AND m3.receiver = ?) 
            OR (m3.sender = ? AND m3.receiver = u.username) 
         ORDER BY m3.timestamp DESC LIMIT 1
        ) AS last_msg_time,
        (SELECT msg_no 
         FROM messages m4 
         WHERE (m4.sender = u.username AND m4.receiver = ?) 
            OR (m4.sender = ? AND m4.receiver = u.username) 
         ORDER BY m4.timestamp DESC LIMIT 1
        ) AS last_msg_no
      FROM users u
      INNER JOIN connection_requests cr
        ON ((cr.sender = ? AND cr.receiver = u.username)
          OR (cr.sender = u.username AND cr.receiver = ?))
        AND cr.status = 'accepted'
      WHERE u.username != ?
    `;

    const params = [
      currentUser, // unread_count
      currentUser, currentUser, // last_msg_content
      currentUser, currentUser, // last_msg_time
      currentUser, currentUser, // last_msg_no
      currentUser, currentUser, // connection join
      currentUser  // where username !=
    ];

    const [rows] = await db.query(sql, params);
    const users = rows.map(row => ({
      username: row.username,
      name: row.name || null,
      unreadCount: row.unread_count,
      lastMessage: {
        content: row.last_msg_content,
        timestamp: row.last_msg_time,
        msgNo: row.last_msg_no
      }
    }));

    res.json({ success: true, users });
  } catch (err) {
    console.error('Failed to fetch users', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/discover?username=&q= — search all users + their connection status
router.get('/discover', async (req, res) => {
  try {
    const { username, q } = req.query;
    if (!username) return res.status(400).json({ error: 'username required' });

    const search = `%${q || ''}%`;
    const [rows] = await db.query(
      `SELECT u.username, u.name,
        (
          SELECT status FROM connection_requests
          WHERE (sender=? AND receiver=u.username)
             OR (sender=u.username AND receiver=?)
          LIMIT 1
        ) AS conn_status,
        (
          SELECT sender FROM connection_requests
          WHERE (sender=? AND receiver=u.username)
             OR (sender=u.username AND receiver=?)
          LIMIT 1
        ) AS conn_sender
       FROM users u
       WHERE u.username != ?
         AND (u.username LIKE ? OR u.name LIKE ?)
       ORDER BY u.name ASC
       LIMIT 50`,
      [username, username, username, username, username, search, search]
    );

    const users = rows.map(r => ({
      username: r.username,
      name: r.name || null,
      connectionStatus: r.conn_status || 'none',
      isSender: r.conn_sender === username
    }));

    res.json({ users });
  } catch (err) {
    console.error('Discover error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get specific user's RSA public key (for USC)
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    const [rows] = await db.query(
      'SELECT rsa_public_key FROM users WHERE username = ?',
      [username]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      username: username,
      rsa_public_key: rows[0].rsa_public_key
    });
  } catch (err) {
    console.error('Failed to fetch user RSA key', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user's RSA public key (called during login)
router.put('/:username/rsa-key', async (req, res) => {
  try {
    const { username } = req.params;
    const { rsaPublicKey } = req.body;

    if (!rsaPublicKey) {
      return res.status(400).json({ error: 'RSA public key is required' });
    }

    await db.query(
      'UPDATE users SET rsa_public_key = ? WHERE username = ?',
      [rsaPublicKey, username]
    );

    res.json({
      success: true,
      message: 'RSA public key updated successfully'
    });
  } catch (err) {
    console.error('Failed to update RSA key', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/users/profile/:username ─────────────────────────────────────────
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const [rows] = await db.query(
      'SELECT username, name, email FROM users WHERE username = ?',
      [username]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, ...rows[0] });
  } catch (err) {
    console.error('Failed to fetch profile', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/users/profile/update ────────────────────────────────────────────
router.put('/profile/update', async (req, res) => {
  try {
    const { username, name, newUsername } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    if (newUsername && newUsername !== username) {
      const [existing] = await db.query('SELECT username FROM users WHERE username = ?', [newUsername]);
      if (existing.length) return res.status(409).json({ error: 'Username already taken' });
      await db.query('UPDATE users SET name = ?, username = ? WHERE username = ?', [name || null, newUsername, username]);
      return res.json({ success: true, username: newUsername, name: name || null });
    }

    await db.query('UPDATE users SET name = ? WHERE username = ?', [name || null, username]);
    res.json({ success: true, username, name: name || null });
  } catch (err) {
    console.error('Failed to update profile', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/users/profile/send-email-otp ───────────────────────────────────
const { sendOtpEmail } = require('../services/emailService');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post('/profile/send-email-otp', async (req, res) => {
  try {
    const { username, newEmail } = req.body;
    if (!username || !newEmail) return res.status(400).json({ error: 'Username and new email required' });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) return res.status(400).json({ error: 'Invalid email format' });

    // Check if email already in use
    const [existing] = await db.query('SELECT username FROM users WHERE email = ? AND username != ?', [newEmail, username]);
    if (existing.length) return res.status(409).json({ error: 'Email already in use by another account' });

    const otp = generateOtp();
    await db.query('DELETE FROM otp_verifications WHERE email = ? AND type = ? AND used = 0', [newEmail, 'UPDATE_EMAIL']);
    await db.query(
      `INSERT INTO otp_verifications (email, otp, type, expires_at) VALUES (?, ?, 'UPDATE_EMAIL', DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
      [newEmail, otp]
    );
    await sendOtpEmail(newEmail, otp, 'LOGIN'); // reuse existing template
    res.json({ message: 'OTP sent to new email. Valid for 10 minutes.' });
  } catch (err) {
    console.error('Failed to send email OTP', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/users/profile/update-email ──────────────────────────────────────
router.put('/profile/update-email', async (req, res) => {
  try {
    const { username, newEmail, otp } = req.body;
    if (!username || !newEmail || !otp) return res.status(400).json({ error: 'Username, new email, and OTP required' });

    const [rows] = await db.query(
      `SELECT id FROM otp_verifications WHERE email = ? AND otp = ? AND type = 'UPDATE_EMAIL' AND used = 0 AND expires_at > NOW()`,
      [newEmail, otp]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired OTP' });
    await db.query('UPDATE otp_verifications SET used = 1 WHERE id = ?', [rows[0].id]);
    await db.query('UPDATE users SET email = ? WHERE username = ?', [newEmail, username]);
    res.json({ success: true, email: newEmail });
  } catch (err) {
    console.error('Failed to update email', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
