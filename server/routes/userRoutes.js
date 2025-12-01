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
    const currentUser = req.query.username; // logged-in user
    if (!currentUser) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const sql = `
      SELECT 
        u.username,
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
      WHERE u.username != ?
    `;

    const params = [
      currentUser, // unread_count
      currentUser, currentUser, // last_msg_content
      currentUser, currentUser, // last_msg_time
      currentUser, currentUser, // last_msg_no
      currentUser  // where username !=
    ];

    const [rows] = await db.query(sql, params);

    // Map rows to the expected format
    const users = rows.map(row => ({
      username: row.username,
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

module.exports = router;
