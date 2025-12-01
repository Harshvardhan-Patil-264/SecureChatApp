/**
 * services/activeUserManager.js
 * Track which users are connected and their socket ids.
 *
 * We store username => Set(socketId) so users can connect from multiple devices.
 */

const userSockets = new Map(); // username -> Set(socketId)

function userConnected(username, socketId) {
  if (!username) return;
  if (!userSockets.has(username)) userSockets.set(username, new Set());
  userSockets.get(username).add(socketId);
  console.log('✅ User connected:', username);
}

function userDisconnected(username, socketId) {
  if (!username) return;
  const set = userSockets.get(username);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(username);
  console.log('❌ User disconnected:', username);
}

function isUserActive(username) {
  return userSockets.has(username);
}

function getActiveUsers() {
  return Array.from(userSockets.keys());
}

function getSockets(username) {
  const set = userSockets.get(username);
  return set ? Array.from(set) : [];
}

module.exports = {
  userConnected,
  userDisconnected,
  isUserActive,
  getActiveUsers,
  getSockets
};
