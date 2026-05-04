const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ============================================
// USER SCHEMA
// ============================================
const userSchema = new mongoose.Schema({
  
  // ---------- BASIC INFO ----------
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores']
  },
  
  displayName: {
    type: String,
    trim: true,
    maxlength: [50, 'Display name cannot exceed 50 characters'],
    default: function() {
      return this.username;
    }
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  
  phone: {
    type: String,
    unique: true,
    sparse: true,
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  
  // ---------- PASSWORD (HIDDEN) ----------
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // HIDDEN by default
  },
  
  // ---------- PROFILE ----------
  avatar: {
    type: String,
    default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
  },
  
  bio: {
    type: String,
    maxlength: [200, 'Bio cannot exceed 200 characters'],
    default: ''
  },
  
  // ---------- GIFTING & COINS ----------
  coins: {
    type: Number,
    default: 0,
    min: [0, 'Coins cannot be negative']
  },
  
  totalSpent: {
    type: Number,
    default: 0, 
    min: 0
  },
  
  totalEarned: {
    type: Number,
    default: 0, 
    min: 0
  },
  
  // ---------- LIVE STATUS ----------
  isLive: {
    type: Boolean,
    default: false
  },
  
  liveRoomId: {
    type: String,
    default: null
  },
  
  liveType: {
    type: String,
    enum: ['video', 'audio', 'pk', null],
    default: null
  },
  
  // ---------- VIP SYSTEM ----------
  isVIP: {
    type: Boolean,
    default: false
  },
  
  vipLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  
  vipXP: {
    type: Number,
    default: 0
  },
  
  vipTitle: {
    type: String,
    default: 'Member'
  },
  
  // ---------- HOSTING POINTS ----------
  hostingPoints: {
    type: Number,
    default: 0
  },
  
  badge: {
    type: String,
    enum: ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    default: 'None'
  },

  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// PASSWORD HASHING
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
