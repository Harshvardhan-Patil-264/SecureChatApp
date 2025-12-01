/**
 * routes/keyRoutes.js
 * POST /api/keys/:username   -> store user's public key (text/plain body)
 * GET  /api/keys/:username   -> fetch stored public key
 */

const express = require('express');
const db = require('../config/db');
const router = express.Router();

// store / update
router.post('/:username', async (req, res) => {
  try {
    const username = req.params.username;
    // raw text body (public key PEM) — Express's json parser won't parse text by default.
    // In server.js we used express.json(); the client sends Content-Type: text/plain, so req.body will be string.
    const publicKeyPem = req.body;
    if (!publicKeyPem || !publicKeyPem.toString().trim()) return res.status(400).send('public key required');

    await db.query(
      'INSERT INTO user_public_keys (username, public_key_pem) VALUES (?, ?) ON DUPLICATE KEY UPDATE public_key_pem = VALUES(public_key_pem)',
      [username, publicKeyPem.toString().trim()]
    );
    return res.status(201).end();
  } catch (err) {
    console.error('Failed to register public key', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// get public key
router.get('/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const [rows] = await db.query('SELECT public_key_pem FROM user_public_keys WHERE username = ?', [username]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    return res.json({ username, publicKeyPem: rows[0].public_key_pem });
  } catch (err) {
    console.error('Failed to get public key', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
