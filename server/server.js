/**
 * server.js
 * Entry point for ChatApp backend (Express + Socket.IO)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const keyRoutes = require('./routes/keyRoutes');
const imageRoutes = require('./routes/imageRoutes');
const healthRoutes = require('./routes/healthRoutes');
const signatureRoutes = require('./routes/signatureRoutes');
const ussRoutes = require('./routes/ussRoutes');
const ussMessageRoutes = require('./routes/ussMessageRoutes');

// Socket setup
const setupChatSocket = require('./sockets/chatSocket');

const app = express();

// Middlewares
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: false // Cookies/Sessions won't work with wildcard, but basic requests will
}));
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/uss', ussRoutes);
app.use('/api/uss/messages', ussMessageRoutes);
app.use('/api', healthRoutes);

// static serve (optional) — exposes stored image files under /api/images/static/<filename>
const uploadDir = process.env.UPLOAD_DIR || 'uploads/images';
app.use('/api/images/static', express.static(path.join(__dirname, uploadDir)));

// Start server + socket.io
const server = http.createServer(app);
const io = setupChatSocket(server);
app.set('io', io);

// Listen
// Listen
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`ChatApp server running on port ${PORT}`);
  console.log(`Network access enabled: http://0.0.0.0:${PORT}`);
});
