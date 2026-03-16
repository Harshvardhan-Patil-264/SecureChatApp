/**
 * services/messageService.js
 * Responsible for saving messages to DB and delivering via socket.io if receiver is online.
 */

const db = require('../config/db');
const activeUserManager = require('./activeUserManager');

/**
 * Save a message to DB.
 * messageObj keys: sender, receiver, content, type, delivered (boolean), timestamp (optional)
 */
async function saveMessageToDb(messageObj) {
  const sql = `INSERT INTO messages
    (sender, receiver, content, msg_no, signature, verified, type, delivered, is_ephemeral, ephemeral_duration, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
  const deliveredFlag = messageObj.delivered ? 1 : 0;
  const verifiedFlag = messageObj.verified ? 1 : 0;
  const isEphemeral = messageObj.isEphemeral ? 1 : 0;
  const [res] = await db.query(sql, [
    messageObj.sender,
    messageObj.receiver,
    messageObj.content,
    messageObj.msgNo || null,
    messageObj.signature || null,
    verifiedFlag,
    messageObj.type || null,
    deliveredFlag,
    isEphemeral,
    isEphemeral ? (messageObj.ephemeralDuration || 10) : null
  ]);
  return { id: res.insertId, ...messageObj };
}

/**
 * Get undelivered messages for a receiver.
 */
async function getUndeliveredMessages(receiver) {
  const [rows] = await db.query('SELECT * FROM messages WHERE receiver = ? AND delivered = FALSE ORDER BY timestamp ASC', [receiver]);
  return rows;
}

/**
 * Mark list of messages as delivered.
 * Accepts array of message objects containing id.
 */
async function markAsDelivered(messages) {
  if (!messages || messages.length === 0) return;
  const ids = messages.map(m => m.id).filter(Boolean);
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  const sql = `UPDATE messages SET delivered = TRUE WHERE id IN (${placeholders})`;
  await db.query(sql, ids);
}

/**
 * sendOrStoreMessage
 * - If receiver is online, deliver via io.to(socketId).emit('message', messageObj)
 * - Otherwise save with delivered=false
 * - Always persist to DB
 *
 * messageObj contains any fields your client expects (sender, receiver, content, cipher, image, etc.)
 */
async function sendOrStoreMessage(io, messageObj) {
  const receiver = messageObj.receiver;
  const ts = new Date();
  messageObj.timestamp = ts;

  try {
    if (receiver && activeUserManager.isUserActive(receiver)) {
      // Emit FIRST — before the DB write so the receiver sees it instantly
      io.to(`user:${receiver}`).emit('message', { ...messageObj, delivered: true });
      messageObj.delivered = true;
    } else {
      messageObj.delivered = false;
    }
  } catch (err) {
    messageObj.delivered = false;
    console.warn('⚠️ Error delivering message:', err && err.message);
  }

  // DB write happens right after — does not block delivery
  const saved = await saveMessageToDb(messageObj);
  return saved;
}

/**
 * Mark read_at for all unread ephemeral messages from sender → receiver.
 * Called when receiver opens the chat (same time as seen marking).
 */
async function markEphemeralReadAt(sender, receiver) {
  // Note: no `seen = 0` guard here — seen is already set to 1 before this is called.
  // read_at IS NULL ensures we only stamp it once (first time recipient reads).
  await db.query(
    `UPDATE messages
       SET read_at = NOW()
     WHERE sender = ? AND receiver = ?
       AND is_ephemeral = 1
       AND read_at IS NULL`,
    [sender, receiver]
  );
}

/**
 * Fetch all ephemeral messages whose timer has expired (content not yet wiped).
 */
async function getExpiredEphemeralMessages() {
  const [rows] = await db.query(
    `SELECT id, sender, receiver
       FROM messages
      WHERE is_ephemeral = 1
        AND read_at IS NOT NULL
        AND content IS NOT NULL
        AND DATE_ADD(read_at, INTERVAL ephemeral_duration SECOND) <= NOW()`
  );
  return rows;
}

/**
 * Wipe the content of a single message (keeps the row for placeholder rendering).
 */
async function deleteEphemeralMessageContent(id) {
  await db.query(
    `UPDATE messages SET content = NULL WHERE id = ?`,
    [id]
  );
}

module.exports = {
  saveMessageToDb,
  getUndeliveredMessages,
  markAsDelivered,
  sendOrStoreMessage,
  markEphemeralReadAt,
  getExpiredEphemeralMessages,
  deleteEphemeralMessageContent
};
