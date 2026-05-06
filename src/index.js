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
// ADVANCE SECURITY & MIDDLEWARE (CORS & CSP FIXED)
// ============================================
// Helmet ko config kiya taaki connection block na ho
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
})); 

// CORS ko poori tarah open kiya taaki app login request bypass ho sake
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Pre-flight requests ko bypass karne ke liye
app.options('*', cors());

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
  cors: { 
    origin: "*", 
    methods: ["GET", "POST"] 
  }
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

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000; // Render automatic port setup handle kar lega
server.listen(PORT, () => {
  logger.info(`🚀 Advance Server running on port ${PORT}`);
});
