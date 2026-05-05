const express = require('express');
const router = express.Router();
const { signup, login, logout, getMe, refreshToken, updatePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// POST /api/auth/signup -> Naya account banane ke liye
router.post('/signup', signup);

// POST /api/auth/login -> Login karne ke liye
router.post('/login', login);

// POST /api/auth/refresh -> Naya token lene ke liye
router.post('/refresh', refreshToken);

// --- Protected Routes (Inke liye login zaroori hai) ---

// GET /api/auth/me -> Apni details dekhne ke liye
router.get('/me', protect, getMe);

// POST /api/auth/logout -> Logout karne ke liye
router.post('/logout', protect, logout);

// PUT /api/auth/update-password -> Password badalne ke liye
router.put('/update-password', protect, updatePassword);

module.exports = router;
