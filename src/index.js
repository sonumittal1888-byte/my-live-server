const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const winston = require('winston');
require('dotenv').config();

// Routes Import
const authRoutes = require('./routes/auth'); // Humne ise theek kar diya hai

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Main Route
app.use('/api/v1/auth', authRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
