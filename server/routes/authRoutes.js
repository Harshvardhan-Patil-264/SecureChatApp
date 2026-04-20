/**
 * routes/authRoutes.js
 * Provides:
 *  POST /api/auth/send-register-otp  — validate inputs, send OTP for registration
 *  POST /api/auth/register           — verify OTP then create account
 *  POST /api/auth/send-login-otp     — validate credentials, send OTP for login
 *  POST /api/auth/login              — verify OTP then complete login
 *  POST /api/auth/logout
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const activeUserManager = require('../services/activeUserManager');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');

// Initialize Google OAuth Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy-client-id');

const messageService = require('../services/messageService');
const { sendOtpEmail } = require('../services/emailService');

const router = express.Router();

// ─── Helper ──────────────────────────────────────────────────────────────────

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Save a fresh OTP to the DB (removes any previous unused OTPs for the same email+type)
 */
async function storeOtp(email, type) {
  const otp = generateOtp();
  // Delete previous unused OTPs for this email+type
  await db.query(
    'DELETE FROM otp_verifications WHERE email = ? AND type = ? AND used = 0',
    [email, type]
  );
  // Insert new OTP expiring in 10 minutes
  await db.query(
    `INSERT INTO otp_verifications (email, otp, type, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    [email, otp, type]
  );
  return otp;
}

/**
 * Verify OTP — returns true and marks used, or throws with an error message
 */
async function verifyOtp(email, otp, type) {
  const [rows] = await db.query(
    `SELECT id FROM otp_verifications
     WHERE email = ? AND otp = ? AND type = ? AND used = 0 AND expires_at > NOW()`,
    [email, otp, type]
  );
  if (!rows.length) {
    throw new Error('Invalid or expired OTP');
  }
  await db.query('UPDATE otp_verifications SET used = 1 WHERE id = ?', [rows[0].id]);
}

// ─── POST /api/auth/send-register-otp ────────────────────────────────────────

router.post('/send-register-otp', async (req, res) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }

    // Check uniqueness before sending OTP
    const [existingUser] = await db.query('SELECT username FROM users WHERE username = ?', [username]);
    if (existingUser.length) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const [existingEmail] = await db.query('SELECT email FROM users WHERE email = ?', [email]);
    if (existingEmail.length) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const otp = await storeOtp(email, 'REGISTER');
    await sendOtpEmail(email, otp, 'REGISTER');

    return res.json({ message: 'OTP sent to your email. Valid for 10 minutes.' });
  } catch (err) {
    console.error('send-register-otp error', err);
    return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, otp, signingPublicKey, name } = req.body;

    if (!username || !email || !password || !otp) {
      return res.status(400).json({ error: 'Username, email, password, and OTP required' });
    }

    // Verify OTP first
    try {
      await verifyOtp(email, otp, 'REGISTER');
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    // Double-check uniqueness (race condition guard)
    const [existingUser] = await db.query('SELECT username FROM users WHERE username = ?', [username]);
    if (existingUser.length) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const [existingEmail] = await db.query('SELECT email FROM users WHERE email = ?', [email]);
    if (existingEmail.length) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (username, name, email, password_hash, signature_key_public) VALUES (?, ?, ?, ?, ?)',
      [username, name || null, email, passwordHash, signingPublicKey || null]
    );

    return res.json({ username, name: name || null, email, message: 'Registration successful' });
  } catch (err) {
    console.error('Register error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/send-login-otp ───────────────────────────────────────────

router.post('/send-login-otp', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Validate credentials first
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'No email associated with this account' });
    }

    const otp = await storeOtp(user.email, 'LOGIN');
    await sendOtpEmail(user.email, otp, 'LOGIN');

    return res.json({ message: 'OTP sent to your registered email. Valid for 10 minutes.' });
  } catch (err) {
    console.error('send-login-otp error', err);
    return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  try {
    const { username, password, otp } = req.body;

    if (!username || !password || !otp) {
      return res.status(400).json({ error: 'Username, password, and OTP required' });
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

    // Verify OTP
    try {
      await verifyOtp(user.email, otp, 'LOGIN');
    } catch (e) {
      return res.status(400).json({ error: e.message });
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

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

// ─── POST /api/auth/google ────────────────────────────────────────────────────

router.post('/google', async (req, res) => {
  try {
    const { token, rsaPublicKey, signingPublicKey } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Google token required' });
    }

    // Verify token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    });
    const payload = ticket.getPayload();
    const googleId = payload['sub'];
    const email = payload['email'];
    const name = payload['name'];

    // Check if user exists by google_id or email
    let [rows] = await db.query('SELECT * FROM users WHERE google_id = ? OR email = ?', [googleId, email]);
    
    let username;
    
    if (rows.length > 0) {
      // User exists
      const user = rows[0];
      username = user.username;
      
      // Update google_id if it was missing (e.g., they previously signed up with email)
      if (!user.google_id) {
        await db.query('UPDATE users SET google_id = ? WHERE username = ?', [googleId, username]);
      }
    } else {
      // Create new user securely
      username = email.split('@')[0] + '_' + crypto.randomBytes(3).toString('hex');
      
      // Insert user
      await db.query(
        'INSERT INTO users (username, name, email, google_id, signature_key_public) VALUES (?, ?, ?, ?, ?)',
        [username, name, email, googleId, signingPublicKey || null]
      );
    }
    
    // Process login exactly like traditional login
    activeUserManager.userConnected(username, `http-login-${Date.now()}`);

    const undelivered = await messageService.getUndeliveredMessages(username);
    await messageService.markAsDelivered(undelivered);

    return res.json({
      username,
      email,
      message: 'Google Login successful',
      offlineMessages: undelivered
    });

  } catch (err) {
    console.error('Google Auth Error:', err);
    return res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});


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
