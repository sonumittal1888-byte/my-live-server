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
    select: false // HIDDEN by default - won't return in queries
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
    default: 0, // in rupees
    min: 0
  },
  
  totalEarned: {
    type: Number,
    default: 0, // creator earnings
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
  
  lastLiveAt: {
    type: Date,
    default: null
  },
  
  totalLiveTime: {
    type: Number,
    default: 0 // in seconds
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
  
  vipUpgradedAt: {
    type: Date,
    default: null
  },
  
  // ---------- HOSTING POINTS ----------
  hostingPoints: {
    type: Number,
    default: 0
  },
  
  hostingStreak: {
    type: Number,
    default: 0, // consecutive days
    min: 0
  },
  
  lastHostingDate: {
    type: Date,
    default: null
  },
  
  // ---------- BADGES ----------
  badge: {
    type: String,
    enum: ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
    default: 'None'
  },
  
  // ---------- STATS ----------
  totalGiftsSent: {
    type: Number,
    default: 0
  },
  
  totalGiftsReceived: {
    type: Number,
    default: 0
  },
  
  followersCount: {
    type: Number,
    default: 0
  },
  
  followingCount: {
    type: Number,
    default: 0
  },
  
  // ---------- SECURITY ----------
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'banned', 'deleted'],
    default: 'active'
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  lastLoginAt: {
    type: Date,
    default: null
  },
  
  lastLoginIP: {
    type: String,
    select: false
  },
  
  // ---------- DEVICE INFO ----------
  deviceId: {
    type: String,
    select: false
  },
  
  fcmToken: {
    type: String,
    select: false
  },
  
  // ---------- GHOST ID (Anonymous) ----------
  ghostId: {
    type: String,
    unique: true,
    sparse: true
  }

}, {
  timestamps: true, // createdAt + updatedAt auto
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// INDEXES
// ============================================
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ ghostId: 1 });
userSchema.index({ isLive: 1, liveType: 1 });
userSchema.index({ vipLevel: -1, vipXP: -1 });
userSchema.index({ hostingPoints: -1 });
userSchema.index({ coins: -1 });
userSchema.index({ createdAt: -1 });

// ============================================
// PASSWORD HASHING (Pre-save)
// ============================================
userSchema.pre('save', async function(next) {
  // Only hash if password modified
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(
    parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
  );
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ============================================
// METHODS
// ============================================

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update VIP level based on XP
userSchema.methods.updateVIPLevel = function() {
  const xp = this.vipXP;
  let newLevel = 0;
  let newTitle = 'Member';
  
  if (xp >= parseInt(process.env.VIP_DIAMOND_XP) || 10000) {
    newLevel = 5; newTitle = 'Diamond VIP';
  } else if (xp >= parseInt(process.env.VIP_PLATINUM_XP) || 5000) {
    newLevel = 4; newTitle = 'Platinum VIP';
  } else if (xp >= parseInt(process.env.VIP_GOLD_XP) || 2000) {
    newLevel = 3; newTitle = 'Gold VIP';
  } else if (xp >= parseInt(process.env.VIP_SILVER_XP) || 500) {
    newLevel = 2; newTitle = 'Silver VIP';
  } else if (xp >= parseInt(process.env.VIP_BRONZE_XP) || 100) {
    newLevel = 1; newTitle = 'Bronze VIP';
  }
  
  if (newLevel !== this.vipLevel) {
    this.vipLevel = newLevel;
    this.vipTitle = newTitle;
    this.isVIP = newLevel > 0;
    this.vipUpgradedAt = new Date();
  }
  
  return this;
};

// Update badge based on hosting points
userSchema.methods.updateBadge = function() {
  const points = this.hostingPoints;
  
  if (points >= 100000) this.badge = 'Diamond';
  else if (points >= 50000) this.badge = 'Platinum';
  else if (points >= 20000) this.badge = 'Gold';
  else if (points >= 5000) this.badge = 'Silver';
  else if (points >= 1000) this.badge = 'Bronze';
  else this.badge = 'None';
  
  return this;
};

// Add coins
userSchema.methods.addCoins = function(amount) {
  this.coins += amount;
  if (amount > 0) {
    this.totalSpent += amount / 10; // 10 coins = 1 rupee
  }
  return this;
};

// Deduct coins
userSchema.methods.deductCoins = function(amount) {
  if (this.coins < amount) {
    throw new Error('Insufficient coins');
  }
  this.coins -= amount;
  return this;
};

// Start live
userSchema.methods.startLive = function(roomId, type) {
  this.isLive = true;
  this.liveRoomId = roomId;
  this.liveType = type;
  this.lastLiveAt = new Date();
  return this;
};

// End live
userSchema.methods.endLive = function(durationSeconds) {
  this.isLive = false;
  this.liveRoomId = null;
  this.liveType = null;
  this.totalLiveTime += durationSeconds || 0;
  return this;
};

// ============================================
// VIRTUALS
// ============================================

// VIP progress percentage
userSchema.virtual('vipProgress').get(function() {
  const thresholds = [0, 100, 500, 2000, 5000, 10000];
  const current = thresholds[this.vipLevel] || 0;
  const next = thresholds[this.vipLevel + 1] || thresholds[5];
  if (next === current) return 100;
  return Math.min(100, Math.round(((this.vipXP - current) / (next - current)) * 100));
});

// Online status
userSchema.virtual('isOnline').get(function() {
  if (!this.lastLoginAt) return false;
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastLoginAt > fiveMinutesAgo;
});

// ============================================
// STATIC METHODS
// ============================================

// Find by ghost ID
userSchema.statics.findByGhostId = function(ghostId) {
  return this.findOne({ ghostId });
};

// Get top hosts
userSchema.statics.getTopHosts = function(limit = 10) {
  return this.find({ hostingPoints: { $gt: 0 } })
    .sort({ hostingPoints: -1 })
    .limit(limit)
    .select('username avatar hostingPoints badge vipLevel');
};

// Get top gifters
userSchema.statics.getTopGifters = function(limit = 10) {
  return this.find({ totalGiftsSent: { $gt: 0 } })
    .sort({ totalGiftsSent: -1 })
    .limit(limit)
    .select('username avatar totalGiftsSent badge vipLevel');
};

// ============================================
// EXPORT
// ============================================
const User = mongoose.model('User', userSchema);

module.exports = User;
