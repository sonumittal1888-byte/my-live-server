const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const User = require('../models/User');
const GiftTransaction = require('../models/GiftTransaction');
const logger = require('../utils/logger');

const GIFT_CATALOG = {
  rose:       { id: 'rose',       name: 'Rose',        price: 1,    category: 'basic',     animation: 'rose_float.json' },
  heart:      { id: 'heart',      name: 'Heart',       price: 2,    category: 'basic',     animation: 'heart_pop.json' },
  clap:       { id: 'clap',       name: 'Clap',        price: 5,    category: 'basic',     animation: 'clap_burst.json' },
  star:       { id: 'star',       name: 'Star',        price: 10,   category: 'standard',  animation: 'star_shower.json' },
  firework:   { id: 'firework',   name: 'Firework',    price: 20,   category: 'standard',  animation: 'firework_explode.json' },
  diamond:    { id: 'diamond',    name: 'Diamond',     price: 50,   category: 'standard',  animation: 'diamond_spin.json' },
  crown:      { id: 'crown',      name: 'Crown',       price: 100,  category: 'premium',   animation: 'crown_drop.json' },
  castle:     { id: 'castle',     name: 'Castle',      price: 200,  category: 'premium',   animation: 'castle_build.json' },
  dragon:     { id: 'dragon',     name: 'Dragon',      price: 500,  category: 'legendary', animation: 'dragon_fly.json',     vipMinLevel: 2, fullscreen: true },
  phoenix:    { id: 'phoenix',    name: 'Phoenix',     price: 1000, category: 'mythical',  animation: 'phoenix_rebirth.json', vipMinLevel: 3, fullscreen: true },
  god_mode:   { id: 'god_mode',   name: 'God Mode',    price: 5000, category: 'ultimate',  animation: 'god_mode.json',        vipMinLevel: 5, fullscreen: true }
};

const PLATFORM_FEES = {
  basic: 0.20, standard: 0.18, premium: 0.15, legendary: 0.12, mythical: 0.10, ultimate: 0.08
};

const getLeaderboardKey = (roomId) => `room:${roomId}:leaderboard`;
const getDailyLeaderboardKey = () => `leaderboard:daily:${new Date().toISOString().slice(0,10)}`;
const getWeeklyLeaderboardKey = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return `leaderboard:weekly:${new Date(d.setDate(diff)).toISOString().slice(0,10)}`;
};

const calculateVIXP = (giftPrice) => Math.floor(giftPrice / 10);

module.exports = (io, redis) => {
  io.on('connection', (socket) => {
    socket.on('send_gift', async (data, callback) => {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const { roomId, giftId, receiverId, quantity = 1 } = data;
          const senderId = socket.userId;
          if (!senderId) throw new Error('Authentication required');
          const gift = GIFT_CATALOG[giftId];
          if (!gift) throw new Error('Invalid gift ID');
          const totalPrice = gift.price * quantity;
          const sender = await User.findById(senderId).session(session);
          if (!sender || sender.coins < totalPrice) throw new Error('Insufficient coins');
          const receiver = await User.findById(receiverId).session(session);
          if (!receiver) throw new Error('Receiver not found');
          const platformFee = Math.floor(totalPrice * (PLATFORM_FEES[gift.category] || 0.20));
          const receiverEarnings = totalPrice - platformFee;
          sender.coins -= totalPrice;
          sender.totalGiftsSent += quantity;
          const xpGained = calculateVIXP(totalPrice);
          sender.vipXP += xpGained;
          await sender.save({ session });
          receiver.coins += receiverEarnings;
          await receiver.save({ session });
          const transaction = await GiftTransaction.create([{
            senderId, receiverId, giftId: gift.id, giftName: gift.name, giftPrice: gift.price,
            quantity, totalPrice, platformFee, receiverEarnings, category: gift.category, roomId
          }], { session });
          
          await redis.zincrby(getLeaderboardKey(roomId), totalPrice, senderId);
          
          // ==========================================
          // 👉 ADDED: Leaderboard namespace emit trigger
          // ==========================================
          io.of('/leaderboard').emit('gift:processed', {
            senderId: senderId,
            receiverId: receiverId,
            receiverType: 'host',
            giftValue: totalPrice,
            diamonds: totalPrice,
          });
          // ==========================================

          const giftData = { gift, sender: { id: senderId, name: sender.username }, receiver: { id: receiverId }, quantity, totalPrice };
          io.to(roomId).emit('new_gift', giftData);
          callback({ success: true, remainingCoins: sender.coins });
        });
      } catch (error) {
        callback({ success: false, error: error.message });
      } finally {
        session.endSession();
      }
    });
  });
};
