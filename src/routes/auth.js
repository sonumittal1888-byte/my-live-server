const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 1. Naya account banane ke liye (Signup)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check karein ki user pehle se toh nahi hai
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const user = await User.create({ username, email, password });
    
    res.status(201).json({
      success: true,
      message: 'Welcome! Account created.',
      user: { id: user._id, username: user.username }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. Login karne ke liye
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // Security Token (JWT) generate karna
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, username: user.username, coins: user.coins }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
