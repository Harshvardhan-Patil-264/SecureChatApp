/**
 * sockets/chatSocket.js
 * Setup Socket.IO server, handle registration and chat events.
 *
 * Client will:
 * - connect() then emit('register', { username })
 * - emit('chat', messageObj) to send a message
 *
 * Server will:
 * - emit('message', msg) to deliver incoming messages
 * - emit('activeUsers', [...]) when active list changes
 * - emit('user_online', { username }) when a user comes online
 * - emit('user_offline', { username }) when a user truly goes offline
 *   (debounced 1.5s to handle reconnect cycles)
 */

const { Server } = require('socket.io');
const activeUserManager = require('../services/activeUserManager');
const messageService = require('../services/messageService');

// Debounce map: username → timeout handle
// When a user disconnects, we schedule an offline event 1.5s later.
// If they reconnect (register) before the timeout fires, we cancel it.
const offlineTimers = new Map();

const OFFLINE_DEBOUNCE_MS = 1500; // 1.5 second grace window

/**
 * setup(server)
 * Returns the io instance.
 */
function setup(server) {
  const io = new Server(server, {
    cors: { origin: true, credentials: true },
    // Prefer native WebSocket immediately — skip the HTTP polling upgrade
    transports: ['websocket'],
    // Tighter heartbeat: detect dead connections in ~15s instead of default ~25s
    pingInterval: 10000,
    pingTimeout: 5000,
    // Allow larger encrypted payloads
    maxHttpBufferSize: 2e6 // 2MB
  });

  io.on('connection', (socket) => {
    // register event: client sends username to associate socket
    socket.on('register', async (payload) => {
      try {
        const username = payload && payload.username;
        if (!username) return;

        // Cancel any pending offline timer for this user (they're reconnecting)
        if (offlineTimers.has(username)) {
          clearTimeout(offlineTimers.get(username));
          offlineTimers.delete(username);
        }

        const wasAlreadyOnline = activeUserManager.isUserActive(username);

        socket.data.username = username;
        // Join a personal room — enables targeted emits without iterating socket IDs
        socket.join(`user:${username}`);
        activeUserManager.userConnected(username, socket.id);

        // Flush undelivered messages immediately
        const undelivered = await messageService.getUndeliveredMessages(username);
        if (undelivered && undelivered.length) {
          for (const m of undelivered) socket.emit('message', m);
          await messageService.markAsDelivered(undelivered);

          // Notify each original sender that their message is now delivered (1 tick → 2 ticks)
          const senderGroups = {};
          for (const m of undelivered) {
            if (!senderGroups[m.sender]) senderGroups[m.sender] = [];
            senderGroups[m.sender].push({ msgNo: m.msg_no, id: m.id, receiver: username });
          }
          for (const [senderName, deliveredMsgs] of Object.entries(senderGroups)) {
            for (const d of deliveredMsgs) {
              io.to(`user:${senderName}`).emit('message_delivered', d);
            }
          }

          // For any ephemeral messages just delivered, start their timer
          const ephemeralUndelivered = undelivered.filter(m => m.is_ephemeral);
          for (const m of ephemeralUndelivered) {
            await messageService.markEphemeralReadAt(m.sender, username);
          }
        }

        // Broadcast full updated list
        io.emit('activeUsers', activeUserManager.getActiveUsers());

        // Only emit user_online if they were actually offline before (not a reconnect/dup socket)
        if (!wasAlreadyOnline) {
          io.emit('user_online', { username });
        }
      } catch (err) {
        console.error('register handler error', err);
      }
    });

    // chat event: accept a message object and process
    socket.on('chat', async (messageObj) => {
      try {
        const saved = await messageService.sendOrStoreMessage(io, {
          ...messageObj,
          isEphemeral: !!messageObj.isEphemeral,
          ephemeralDuration: messageObj.isEphemeral ? (messageObj.ephemeralDuration || 10) : null
        });
        socket.emit('message-saved', saved);
      } catch (err) {
        console.error('chat handler error', err);
      }
    });

    // USS message event: real-time Ultra Secure Chat messages
    socket.on('uss_message', async (messageObj) => {
      try {
        console.log('📨 USS message received:', messageObj.sender, '→', messageObj.receiver);
        const receiverSockets = activeUserManager.getSockets(messageObj.receiver);

        if (receiverSockets && receiverSockets.length > 0) {
          receiverSockets.forEach(socketId => {
            io.to(socketId).emit('uss_message', messageObj);
          });
          console.log('✅ USS message delivered to', messageObj.receiver);
        } else {
          console.log('⏳ Receiver offline:', messageObj.receiver);
        }

        socket.emit('uss_message_sent', { success: true, id: messageObj.id });
      } catch (err) {
        console.error('USS message handler error:', err);
        socket.emit('uss_message_sent', { success: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      const username = socket.data.username;
      if (username) {
        activeUserManager.userDisconnected(username, socket.id);
        const stillOnline = activeUserManager.isUserActive(username);

        // Do NOT broadcast activeUsers immediately here. 
        // If we do, clients will instantly see the user as offline, defeating the debounce.
        // We will broadcast the update after the 1.5s debounce timer.

        if (!stillOnline) {
          // Debounce the user_offline event — wait 1.5s before declaring them offline.
          // This absorbs React StrictMode double-mounts, HMR reloads, Capacitor
          // reconnects, and mobile network blips (all cause instant disconnect→reconnect).
          // If the user re-registers within the window, the timer is cancelled above.
          const timer = setTimeout(() => {
            offlineTimers.delete(username);
            // Double-check they're still offline after the grace period
            if (!activeUserManager.isUserActive(username)) {
              io.emit('user_offline', { username });
              io.emit('activeUsers', activeUserManager.getActiveUsers());
              console.log(`📴 User truly offline: ${username}`);
            }
          }, OFFLINE_DEBOUNCE_MS);

          offlineTimers.set(username, timer);
        }
      }
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

module.exports = setup;
