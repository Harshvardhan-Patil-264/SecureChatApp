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
  const sql = `INSERT INTO messages (sender, receiver, content, msg_no, signature, verified, type, delivered, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
  const deliveredFlag = messageObj.delivered ? 1 : 0;
  const verifiedFlag = messageObj.verified ? 1 : 0;
  const [res] = await db.query(sql, [
    messageObj.sender,
    messageObj.receiver,
    messageObj.content,
    messageObj.msgNo || null,
    messageObj.signature || null,
    verifiedFlag,
    messageObj.type || null,
    deliveredFlag
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
  try {
    const receiver = messageObj.receiver;
    if (receiver && activeUserManager.isUserActive(receiver)) {
      const sockets = activeUserManager.getSockets(receiver);
      for (const sid of sockets) {
        io.to(sid).emit('message', messageObj);
      }
      messageObj.delivered = true;
      console.log(`📨 Delivered message to ${receiver}`);
    } else {
      messageObj.delivered = false;
      console.log(`💾 Receiver offline; stored message for ${receiver}`);
    }
  } catch (err) {
    messageObj.delivered = false;
    console.warn('⚠️ Error trying to deliver message; will store. ', err && err.message);
  }

  const saved = await saveMessageToDb(messageObj);
  return saved;
}

module.exports = {
  saveMessageToDb,
  getUndeliveredMessages,
  markAsDelivered,
  sendOrStoreMessage
};
