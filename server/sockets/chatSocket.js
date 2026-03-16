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
 */

const { Server } = require('socket.io');
const activeUserManager = require('../services/activeUserManager');
const messageService = require('../services/messageService');

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

        socket.data.username = username;
        // Join a personal room — enables targeted emits without iterating socket IDs
        socket.join(`user:${username}`);
        activeUserManager.userConnected(username, socket.id);

        // Flush undelivered messages immediately
        const undelivered = await messageService.getUndeliveredMessages(username);
        if (undelivered && undelivered.length) {
          for (const m of undelivered) socket.emit('message', m);
          await messageService.markAsDelivered(undelivered);
          // For any ephemeral messages just delivered, start their timer
          const ephemeralUndelivered = undelivered.filter(m => m.is_ephemeral);
          for (const m of ephemeralUndelivered) {
            await messageService.markEphemeralReadAt(m.sender, username);
          }
        }

        // Only notify parties who care: the connecting user's contacts
        // (full broadcast causes all clients to re-render — avoid it)
        io.emit('activeUsers', activeUserManager.getActiveUsers());
      } catch (err) {
        console.error('register handler error', err);
      }
    });

    // chat event: accept a message object and process
    socket.on('chat', async (messageObj) => {
      try {
        // messageObj expected fields: sender, receiver, content, cipher, image, type, messageId, isEphemeral, ephemeralDuration etc.
        const saved = await messageService.sendOrStoreMessage(io, {
          ...messageObj,
          isEphemeral: !!messageObj.isEphemeral,
          ephemeralDuration: messageObj.isEphemeral ? (messageObj.ephemeralDuration || 10) : null
        });
        // Optionally acknowledge to sender with saved record:
        socket.emit('message-saved', saved);
      } catch (err) {
        console.error('chat handler error', err);
      }
    });

    // USS message event: real-time Ultra Secure Chat messages
    socket.on('uss_message', async (messageObj) => {
      try {
        console.log('📨 USS message received:', messageObj.sender, '→', messageObj.receiver);
        console.log('Message details:', JSON.stringify(messageObj, null, 2));

        // Emit to receiver immediately (real-time)
        const receiverSockets = activeUserManager.getSockets(messageObj.receiver);
        console.log('Receiver sockets:', receiverSockets);

        if (receiverSockets && receiverSockets.length > 0) {
          receiverSockets.forEach(socketId => {
            console.log('✅ Emitting to socket:', socketId);
            io.to(socketId).emit('uss_message', messageObj);
          });
          console.log('✅ USS message delivered to', messageObj.receiver);
        } else {
          console.log('⏳ Receiver offline:', messageObj.receiver);
        }

        // Acknowledge to sender
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
        io.emit('activeUsers', activeUserManager.getActiveUsers());
      }
      console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

module.exports = setup;
