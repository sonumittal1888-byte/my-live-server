const express = require('express');
const router = express.Router();
const { signup, login } = require('../controllers/authController');

// Registration aur Login ke raste
router.post('/register', signup);
router.post('/login', login);

module.exports = router;
