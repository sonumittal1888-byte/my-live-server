const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const winston = require('winston');
const cron = require('node-cron');
require('dotenv').config();

// ============================================
// LOGGER SETUP
// ============================================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: process.env.LOG_FILE_PATH || './logs/app.log' })
  ]
});

// ============================================
// EXPRESS APP
// ============================================
const app = express();
const server = http.createServer(app);

// ============================================
// SECURITY MIDDLEWARE
// ============================================
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(hpp());

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter limit for auth
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many auth attempts, please try again later' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============================================
// REDIS CONNECTION
// ============================================
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis reconnecting in ${delay}ms... (attempt ${times})`);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err));

// ============================================
// MONGODB CONNECTION
// ============================================
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.NODE_ENV === 'production' 
        ? process.env.MONGODB_URI 
        : process.env.MONGODB_LOCAL,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    );
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
connectDB();

// ============================================
// SOCKET.IO SETUP
// ============================================
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6
});

// Socket Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    // Verify JWT token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role || 'user';
    next();
  } catch (error) {
    logger.error('Socket auth error:', error.message);
    next(new Error('Invalid token'));
  }
});

// ============================================
// ROUTES
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/rooms', require('./src/routes/rooms'));
app.use('/api/gifts', require('./src/routes/gifts'));
app.use('/api/payments', require('./src/routes/payments'));
app.use('/api/leaderboard', require('./src/routes/leaderboard'));
app.use('/api/support', require('./src/routes/support'));
app.use('/api/admin', require('./src/routes/admin'));

// ============================================
// SOCKET HANDLERS
// ============================================
const roomSocket = require('./src/sockets/roomSocket');
const commentSocket = require('./src/sockets/commentSocket');
const giftSocket = require('./src/sockets/giftSocket');
const leaderboardSocket = require('./src/sockets/leaderboardSocket');
const hostingSocket = require('./src/sockets/hostingSocket');
const pkSocket = require('./src/sockets/pkSocket');

roomSocket(io, redis);
commentSocket(io, redis);
giftSocket(io, redis);
leaderboardSocket(io, redis);
hostingSocket(io, redis);
pkSocket(io, redis);

// ============================================
// CRON JOBS
// ============================================
// Daily leaderboard reset at midnight
cron.schedule('0 0 * * *', async () => {
  logger.info('Running daily leaderboard reset...');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const key = `leaderboard:daily:${yesterday.toISOString().slice(0, 10)}`;
  await redis.expire(key, 7 * 24 * 60 * 60); // Keep for 7 days
  logger.info('Daily leaderboard archived');
});

// Weekly leaderboard reset on Monday midnight
cron.schedule('0 0 * * 1', async () => {
  logger.info('Running weekly leaderboard reset...');
});

// Cleanup inactive rooms every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  logger.info('Cleaning up inactive rooms...');
  // Room cleanup logic here
});

// ============================================
// ERROR HANDLING
// ============================================
// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Global error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      messages
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate field value entered'
    });
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Resource not found with id: ${err.value}`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err.message);
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      redis.disconnect();
      process.exit(0);
    });
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`=================================`);
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`API Base: ${process.env.API_BASE_URL}`);
  logger.info(`=================================`);
});

module.exports = { app, server, io, redis };
