const express = require('express');
const db = require('../config/db');
const messageService = require('../services/messageService');
const signatureService = require('../services/signatureService');

const router = express.Router();

// Fetch conversation between two users (REGULAR MESSAGES ONLY)
router.get('/:userA/:userB', async (req, res) => {
  const { userA, userB } = req.params;
  if (!userA || !userB) {
    return res.status(400).json({ error: 'Both users are required' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, sender, receiver, content AS message, msg_no AS msgNo, signature, verified, timestamp
       FROM messages
       WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
       ORDER BY timestamp ASC`,
      [userA, userB, userB, userA]
    );

    res.json({ messages: rows });
  } catch (err) {
    console.error('Failed to load conversation', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post a new message (REGULAR MESSAGES ONLY)
router.post('/', async (req, res) => {
  const { sender, receiver, message, signature } = req.body || {};

  if (!sender || !receiver || !message) {
    return res.status(400).json({ error: 'sender, receiver and message are required' });
  }

  try {
    const io = req.app.get('io');

    // Verify signature if provided
    let verified = false;
    if (signature) {
      verified = await signatureService.verifyMessageSignature(sender, message, signature);
      console.log(`Message signature verification: ${verified ? '✓ VALID' : '✗ INVALID'}`);
    }

    const messageObj = {
      sender,
      receiver,
      content: message.trim(),
      msgNo: req.body.msgNo,
      signature: signature || null,
      verified: verified,
      type: 'text',
      delivered: false // will be updated by service
    };

    const savedMessage = await messageService.sendOrStoreMessage(io, messageObj);
    res.status(201).json(savedMessage);
  } catch (err) {
    console.error('Failed to send message', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
