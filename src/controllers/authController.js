const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const redis = require('../config/redis');
const logger = require('../utils/logger');

// ============================================
// HELPER: Generate JWT Token
// ============================================
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// ============================================
// HELPER: Generate Refresh Token
// ============================================
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

// ============================================
// HELPER: Generate Ghost ID
// ============================================
const generateGhostId = () => {
  return crypto.randomBytes(32).toString('hex');
};

// ============================================
// SIGNUP
// ============================================
exports.signup = async (req, res) => {
  try {
    const { username, email, phone, password, displayName } = req.body;

    // Check required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username, email and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email, username or phone'
      });
    }

    // Create new user
    const user = await User.create({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : undefined,
      password,
      displayName: displayName || username,
      ghostId: generateGhostId()
    });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in Redis
    await redis.setex(
      `refresh:${user._id}`,
      30 * 24 * 60 * 60, // 30 days
      refreshToken
    );

    // Remove password from response
    user.password = undefined;

    logger.info(`New user signed up: ${user.username}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('Signup error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Signup failed'
    });
  }
};

// ============================================
// LOGIN
// ============================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    // Find user with password (select: false hai isliye .select('+password'))
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password');

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Account is ${user.accountStatus}. Contact support.`
      });
    }

    // Compare password using User model method
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.lastLoginIP = req.ip;
    await user.save({ validateBeforeSave: false });

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store refresh token in Redis
    await redis.setex(
      `refresh:${user._id}`,
      30 * 24 * 60 * 60,
      refreshToken
    );

    // Remove password from response
    user.password = undefined;

    logger.info(`User logged in: ${user.username}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed'
    });
  }
};

// ============================================
// REFRESH TOKEN
// ============================================
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check in Redis
    const storedToken = await redis.get(`refresh:${decoded.id}`);

    if (!storedToken || storedToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newToken = generateToken(decoded.id);

    res.status(200).json({
      success: true,
      data: { token: newToken }
    });

  } catch (error) {
    logger.error('Refresh token error:', error.message);
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    });
  }
};

// ============================================
// LOGOUT
// ============================================
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete refresh token from Redis
    await redis.del(`refresh:${userId}`);

    // Add token to blacklist
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await redis.setex(`blacklist:${token}`, 7 * 24 * 60 * 60, 'true');
    }

    logger.info(`User logged out: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};

// ============================================
// GET ME (Current User)
// ============================================
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: { user }
    });

  } catch (error) {
    logger.error('GetMe error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
};

// ============================================
// UPDATE PASSWORD
// ============================================
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current and new password'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await redis.setex(
      `refresh:${user._id}`,
      30 * 24 * 60 * 60,
      refreshToken
    );

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: { token, refreshToken }
    });

  } catch (error) {
    logger.error('Update password error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update password'
    });
  }
};
