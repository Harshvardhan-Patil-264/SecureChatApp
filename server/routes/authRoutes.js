/**
 * routes/authRoutes.js
 * Provides:
 *  POST /api/auth/register
 *  POST /api/auth/login
 *  POST /api/auth/logout
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const activeUserManager = require('../services/activeUserManager');
const messageService = require('../services/messageService');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, signingPublicKey } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }

    // Check if username already exists
    const [existingUser] = await db.query('SELECT username FROM users WHERE username = ?', [username]);
    if (existingUser.length) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Check if email already exists
    const [existingEmail] = await db.query('SELECT email FROM users WHERE email = ?', [email]);
    if (existingEmail.length) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (username, email, password_hash, signature_key_public) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, signingPublicKey || null]
    );

    return res.json({
      username,
      email,
      message: 'Registration successful'
    });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Mark user as connected in memory
    activeUserManager.userConnected(username, `http-login-${Date.now()}`);

    // Fetch undelivered messages and mark delivered
    const undelivered = await messageService.getUndeliveredMessages(username);
    await messageService.markAsDelivered(undelivered);

    return res.json({
      username,
      email: user.email,
      message: 'Login successful',
      offlineMessages: undelivered
    });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    console.log(`Logout requested for ${username}`);
    return res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('logout error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
