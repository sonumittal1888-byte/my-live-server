const express = require('express');
const router = express.Router();
const agoraController = require('../controllers/agoraController');

// Health check
router.get('/ping', agoraController.ping);

// RTC Token generate karne ka endpoint
router.post('/token', agoraController.generateToken);

module.exports = router;
