const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  displayName: {
    type: String,
    trim: true,
    default: function() { return this.username; }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false 
  },
  avatar: {
    type: String,
    default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
  },
  // यहाँ हमने 1000 सिक्के फ्री कर दिए हैं
  coins: {
    type: Number,
    default: 1000, 
    min: 0
  },
  totalSpent: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 }, // इसे हम Diamonds की तरह यूज़ करेंगे
  isLive: { type: Boolean, default: false },
  isVIP: { type: Boolean, default: false },
  vipLevel: { type: Number, default: 0 },
  vipXP: { type: Number, default: 0 },
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

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
