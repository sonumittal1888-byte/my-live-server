const express = require('express');
const router = express.Router();

// Import controller functions
const {
  signup,
  login,
  logout,
  getMe,
  refreshToken,
  updatePassword
} = require('../controllers/authController');

// Import middleware
const { protect } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES
// ============================================
router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshToken);

// ============================================
// PROTECTED ROUTES
// ============================================
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/update-password', protect, updatePassword);

module.exports = router;
