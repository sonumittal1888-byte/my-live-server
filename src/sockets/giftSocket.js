const GiftTransaction = require('../models/GiftTransaction');
const User = require('../models/User');
const Gift = require('../models/Gift');
const mongoose = require('mongoose');

// Hum redisClient ko bahar se le rahe hain (index.js se)
module.exports = (io, redisClient) => {
  io.on('connection', (socket) => {
    console.log(`User connected to gift socket: ${socket.id}`);

    // Room join karwane ke liye
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
    });

    // Gift send karne ka main logic
    socket.on('send-gift', async (data) => {
      try {
        const { senderId, receiverId, giftId, roomId } = data;

        if (!senderId || !receiverId || !giftId || !roomId) {
          return socket.emit('gift-error', { message: 'Missing data' });
        }

        // 1. Gift details fetch (Redis check)
        const cacheKey = `gift:${giftId}`;
        let gift = await redisClient.get(cacheKey);
        
        if (gift) {
          gift = JSON.parse(gift);
        } else {
          gift = await Gift.findById(giftId);
          if (!gift) return socket.emit('gift-error', { message: 'Gift not found' });
          await redisClient.setex(cacheKey, 600, JSON.stringify(gift));
        }

        // 2. Transaction (Diamonds katna aur milna)
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          const sender = await User.findById(senderId).session(session);
          if (sender.coins < gift.price) {
            await session.abortTransaction();
            return socket.emit('gift-error', { message: 'Incomplete coins' });
          }

          // Balance update
          await User.findByIdAndUpdate(senderId, { $inc: { coins: -gift.price } }, { session });
          await User.findByIdAndUpdate(receiverId, { $inc: { coins: gift.price } }, { session });

          // Transaction save
          const transaction = new GiftTransaction({
            senderId, receiverId, giftId, giftPrice: gift.price, roomId, status: 'completed'
          });
          await transaction.save({ session });

          await session.commitTransaction();

          // 3. Leaderboard Update
          const leaderboardKey = `leaderboard:${roomId}`;
          await redisClient.zincrby(leaderboardKey, gift.price, receiverId.toString());

          // 4. Sabko Notify karo
          io.to(roomId).emit('gift-received', {
            senderName: sender.username,
            giftName: gift.name,
            price: gift.price
          });

          socket.emit('gift-sent', { success: true, remaining: sender.coins - gift.price });

        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      } catch (err) {
        socket.emit('gift-error', { message: err.message });
      }
    });
  });
};
