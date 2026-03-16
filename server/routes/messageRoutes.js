const express = require('express');
const db = require('../config/db');
const messageService = require('../services/messageService');
const signatureService = require('../services/signatureService');
const { markEphemeralReadAt } = require('../services/messageService');

const router = express.Router();

// Fetch conversation between two users (REGULAR MESSAGES ONLY)
router.get('/:userA/:userB', async (req, res) => {
  const { userA, userB } = req.params;
  if (!userA || !userB) {
    return res.status(400).json({ error: 'Both users are required' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, sender, receiver,
              CASE WHEN content IS NULL THEN '' ELSE content END AS message,
              msg_no AS msgNo, signature, verified, timestamp, delivered, seen,
              is_ephemeral AS isEphemeral,
              ephemeral_duration AS ephemeralDuration,
              read_at AS readAt,
              CASE WHEN content IS NULL THEN 1 ELSE 0 END AS isDeleted
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

// Mark messages as seen (called when receiver opens the chat)
router.put('/seen', async (req, res) => {
  const { sender, receiver } = req.body;
  if (!sender || !receiver) return res.status(400).json({ error: 'sender and receiver required' });
  try {
    await db.query(
      `UPDATE messages SET seen = 1 WHERE sender = ? AND receiver = ? AND seen = 0`,
      [sender, receiver]
    );
    // Start the ephemeral countdown for any unread ephemeral messages
    await markEphemeralReadAt(sender, receiver);

    // Emit socket event so sender's UI updates
    const io = req.app.get('io');
    if (io) {
      io.emit('messages_seen', { sender, receiver });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to mark seen', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Post a new message (supports ephemeral flag)
router.post('/', async (req, res) => {
  const { sender, receiver, message, signature, isEphemeral, ephemeralDuration } = req.body || {};

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
      delivered: false,
      isEphemeral: !!isEphemeral,
      ephemeralDuration: isEphemeral ? (ephemeralDuration || 10) : null
    };

    const savedMessage = await messageService.sendOrStoreMessage(io, messageObj);
    res.status(201).json(savedMessage);
  } catch (err) {
    console.error('Failed to send message', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
