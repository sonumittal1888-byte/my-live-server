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

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(mongoSanitize());
app.use(hpp());

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ MongoDB Connected (saksham123)');
  } catch (error) {
    logger.error('❌ MongoDB Error:', error);
    process.exit(1);
  }
};
connectDB();

const io = new Server(server, {
  cors: { origin: "*", methods: ['GET', 'POST'] }
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is Live! 🚀' });
});

// Yahan aapke routes aayenge (auth, users, gifts etc.)
app.use('/api/auth', (req, res) => res.send('Auth Route Working'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
