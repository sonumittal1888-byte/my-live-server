const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const winston = require('winston');
require('dotenv').config();

// ============================================
// ROUTES IMPORT
// ============================================
const authRoutes = require('./routes/auth');
const agoraRoutes = require('./routes/agoraRoutes'); // 👈 Agora Route Import Kiya

const app = express();
const server = http.createServer(app);

// ============================================
// ADVANCE SECURITY & MIDDLEWARE
// ============================================
app.use(helmet()); 
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================
// LOGGER SETUP (For Tracking)
// ============================================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// ============================================
// DATABASE CONNECTIONS
// ============================================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/liveapp')
  .then(() => logger.info('MongoDB Connected...'))
  .catch(err => logger.error('Mongo Error:', err));

// REDIS CONNECTION (Render ke live Redis url ke sath update kiya gaya)
const redis = new Redis(process.env.REDIS_URL || 'redis://red-cuq0m0l6l4sc73epeskg:6379');

redis.on('error', (err) => {
  logger.error('Redis Connection Error Ignored:', err.message);
});

redis.on('connect', () => {
  logger.info('Redis Connected...');
});

// ============================================
// SOCKET.IO SETUP (For Live Streaming & Gifting)
// ============================================
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  logger.info(`New Connection: ${socket.id}`);
  
  // Gift bhejne ka logic
  socket.on('sendGift', (data) => {
    io.emit('receiveGift', data); // Sabko dikhao kisne kya gift bheja
  });

  socket.on('disconnect', () => {
    logger.info('User Disconnected');
  });
});

// ============================================
// MOUNT ROUTES
// ============================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/agora', agoraRoutes); // 👈 Agora Route Register Kiya

// 1. DEFAULT ROUTE (Ab main link open karte hi yeh chalega)
app.get('/', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Agora Token Server is running successfully!' 
  });
});

// 2. HEALTH CHECK ROUTE
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Advance Server is Healthy' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`🚀 Advance Server running on port ${PORT}`);
});
