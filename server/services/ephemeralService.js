/**
 * services/ephemeralService.js
 * Cron job that fires every 5 seconds, finds expired ephemeral messages,
 * wipes their content from the DB, and notifies both clients via Socket.IO.
 */

const cron = require('node-cron');
const {
    getExpiredEphemeralMessages,
    deleteEphemeralMessageContent
} = require('./messageService');

let _io = null;

/**
 * start(io)
 * Call once during server boot, passing the Socket.IO instance.
 */
function start(io) {
    _io = io;

    // Run every 5 seconds
    cron.schedule('*/5 * * * * *', async () => {
        try {
            const expired = await getExpiredEphemeralMessages();
            if (!expired || expired.length === 0) return;

            for (const msg of expired) {
                // 1. Wipe content in DB (keeps row → placeholder renders correctly)
                await deleteEphemeralMessageContent(msg.id);

                // 2. Notify both sender and receiver via Socket.IO
                if (_io) {
                    const payload = { id: msg.id };
                    _io.to(`user:${msg.sender}`).emit('message_expired', payload);
                    _io.to(`user:${msg.receiver}`).emit('message_expired', payload);
                }

                console.log(`🔥 Ephemeral message ${msg.id} expired and wiped.`);
            }
        } catch (err) {
            console.error('⚠️ ephemeralService cron error:', err && err.message);
        }
    });

    console.log('⏱  Ephemeral message cron service started (runs every 5s)');
}

module.exports = { start };
