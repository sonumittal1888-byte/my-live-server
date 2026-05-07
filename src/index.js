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
// ROUTES & CONTROLLERS IMPORT
// ============================================
const authRoutes = require('./routes/auth');
const agoraRoutes = require('./routes/agoraRoutes');
const paymentRoutes = require('./routes/payments');
const { processPKGift } = require('./controllers/pkengine'); // 👈 PK Scoring Engine Import Kiya

const app = express();
const server = http.createServer(app);

// ============================================
// ADVANCE SECURITY & MIDDLEWARE (CORS & CSP FIXED)
// ============================================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
})); 

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
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

const redis = new Redis(process.env.REDIS_URL || 'redis://red-cuq0m0l6l4sc73epeskg:6379');

redis.on('error', (err) => {
  logger.error('Redis Connection Error Ignored:', err.message);
});

redis.on('connect', () => {
  logger.info('Redis Connected...');
});

// ============================================
// SOCKET.IO SETUP (Real-time Gifting & PK Battles)
// ============================================
const io = new Server(server, {
  cors: { 
    origin: "*", 
    methods: ["GET", "POST"] 
  }
});

io.on('connection', (socket) => {
  logger.info(`New Connection: ${socket.id}`);
  
  // Normal Room Gifting & PK Scoring Connection
  socket.on('sendGift', (data) => {
    // 1. Sabhi normal users ko update bhejte hain
    io.emit('receiveGift', data); 
    
    // 2. Agar gift PK Battle room ke andar bheja gaya hai, toh points calculate karenge
    if (data.isPKBattle && data.roomId) {
      processPKGift(io, data.roomId, data);
    }
  });

  socket.on('disconnect', () => {
    logger.info('User Disconnected');
  });
});

// ============================================
// MOUNT ROUTES
// ============================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/agora', agoraRoutes);
app.use('/api/payments', paymentRoutes);

// DEFAULT ROUTES
app.get('/', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'StreamFlow Advance Token & Payment Server is running successfully!' 
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is Healthy' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 Advance Server running on port ${PORT}`);
});
