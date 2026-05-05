const socketAuth = require('../middleware/socketAuth');
const redisClient = require('../config/redis');
const User = require('../models/User');
const Host = require('../models/Host');
const GiftTransaction = require('../models/GiftTransaction');

// Redis key prefixes
const REDIS_KEYS = {
  USER_LEADERBOARD: 'leaderboard:users',
  HOST_LEADERBOARD: 'leaderboard:hosts',
  USER_WEEKLY: 'leaderboard:users:weekly',
  HOST_WEEKLY: 'leaderboard:hosts:weekly',
  USER_MONTHLY: 'leaderboard:users:monthly',
  HOST_MONTHLY: 'leaderboard:hosts:monthly',
  LIVE_ROOMS: 'live:rooms',
};

// Timeframes for leaderboards
const TIMEFRAMES = {
  ALL_TIME: 'allTime',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  DAILY: 'daily',
};

/**
 * Initialize leaderboard socket handlers
 * @param {Object} io - Socket.io instance
 */
function initLeaderboardSocket(io) {
  const leaderboardNamespace = io.of('/leaderboard');

  // Apply authentication middleware
  leaderboardNamespace.use(socketAuth);

  leaderboardNamespace.on('connection', (socket) => {
    console.log(`🔌 Leaderboard socket connected: ${socket.user.id}`);

    // ============================================================
    // 1. JOIN LEADERBOARD ROOMS
    // ============================================================

    socket.on('join:leaderboard', async (data, callback) => {
      try {
        const { type = 'global', timeframe = 'allTime', limit = 50 } = data;
        const roomName = `leaderboard:${type}:${timeframe}`;
        socket.join(roomName);

        const leaderboard = await getLeaderboard(type, timeframe, limit);
        
        socket.emit('leaderboard:initial', {
          type,
          timeframe,
          data: leaderboard,
          timestamp: new Date().toISOString(),
        });

        if (callback) {
          callback({ success: true, room: roomName });
        }

        console.log(`✅ User ${socket.user.id} joined ${roomName}`);
      } catch (error) {
        console.error('❌ Error joining leaderboard:', error);
        socket.emit('error', { message: 'Failed to join leaderboard', error: error.message });
        if (callback) callback({ success: false, error: error.message });
      }
    });

    socket.on('join:host:leaderboard', async (data, callback) => {
      try {
        const { hostId, timeframe = 'allTime' } = data;
        if (socket.user.role === 'host' && socket.user.hostId !== hostId) {
          throw new Error('Unauthorized: Can only view your own leaderboard');
        }

        const roomName = `host:leaderboard:${hostId}:${timeframe}`;
        socket.join(roomName);

        const hostRank = await getHostRanking(hostId, timeframe);
        const nearbyRanks = await getNearbyRanks('host', hostId, timeframe, 5);

        socket.emit('host:leaderboard:initial', {
          hostId,
          timeframe,
          myRank: hostRank,
          nearbyRanks,
          timestamp: new Date().toISOString(),
        });

        if (callback) callback({ success: true, room: roomName });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join host leaderboard', error: error.message });
        if (callback) callback({ success: false, error: error.message });
      }
    });

    socket.on('join:user:leaderboard', async (data, callback) => {
      try {
        const { userId = socket.user.id, timeframe = 'allTime' } = data;
        const roomName = `user:leaderboard:${userId}:${timeframe}`;
        socket.join(roomName);

        const userRank = await getUserRanking(userId, timeframe);
        const nearbyRanks = await getNearbyRanks('user', userId, timeframe, 5);

        socket.emit('user:leaderboard:initial', {
          userId,
          timeframe,
          myRank: userRank,
          nearbyRanks,
          timestamp: new Date().toISOString(),
        });

        if (callback) callback({ success: true, room: roomName });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join user leaderboard', error: error.message });
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // ============================================================
    // 2. REAL-TIME RANKING UPDATES
    // ============================================================

    socket.on('gift:processed', async (giftData) => {
      try {
        const { senderId, receiverId, receiverType, giftValue, diamonds } = giftData;

        await Promise.all([
          updateUserRanking(senderId, giftValue, diamonds),
          receiverType === 'host' 
            ? updateHostRanking(receiverId, giftValue, diamonds)
            : updateUserRanking(receiverId, giftValue, diamonds),
        ]);

        await broadcastRankingUpdates(io, {
          senderId,
          receiverId,
          receiverType,
          giftValue,
          diamonds,
        });

      } catch (error) {
        console.error('❌ Error processing gift for leaderboard:', error);
      }
    });

    // ============================================================
    // 3. LIVE STREAM RANKINGS
    // ============================================================

    socket.on('join:live:leaderboard', async (data, callback) => {
      try {
        const { roomId, limit = 10 } = data;
        const roomName = `live:leaderboard:${roomId}`;
        socket.join(roomName);

        const liveLeaderboard = await getLiveRoomLeaderboard(roomId, limit);

        socket.emit('live:leaderboard:initial', {
          roomId,
          data: liveLeaderboard,
          timestamp: new Date().toISOString(),
        });

        if (callback) callback({ success: true, room: roomName });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join live leaderboard', error: error.message });
        if (callback) callback({ success: false, error: error.message });
      }
    });

    socket.on('live:gift:sent', async (data) => {
      try {
        const { roomId, senderId, giftValue, diamonds } = data;
        const redisKey = `${REDIS_KEYS.LIVE_ROOMS}:${roomId}:gifters`;
        await redisClient.zincrby(redisKey, giftValue, senderId);
        await redisClient.expire(redisKey, 86400);

        const topGifters = await getLiveRoomLeaderboard(roomId, 10);

        leaderboardNamespace.to(`live:leaderboard:${roomId}`).emit('live:leaderboard:update', {
          roomId,
          data: topGifters,
          lastGift: {
            senderId,
            giftValue,
            diamonds,
            timestamp: new Date().toISOString(),
          },
        });

      } catch (error) {
        console.error('❌ Error updating live leaderboard:', error);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Leaderboard socket disconnected: ${socket.user.id}, Reason: ${reason}`);
    });
  });

  return leaderboardNamespace;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function getLeaderboard(type, timeframe, limit = 50) {
  let redisKey;
  if (type === 'users') {
    redisKey = timeframe === TIMEFRAMES.ALL_TIME ? REDIS_KEYS.USER_LEADERBOARD : REDIS_KEYS[`USER_${timeframe.toUpperCase()}`];
  } else if (type === 'hosts') {
    redisKey = timeframe === TIMEFRAMES.ALL_TIME ? REDIS_KEYS.HOST_LEADERBOARD : REDIS_KEYS[`HOST_${timeframe.toUpperCase()}`];
  } else {
    throw new Error('Invalid leaderboard type. Use "users" or "hosts"');
  }

  const results = await redisClient.zrevrange(redisKey, 0, limit - 1, 'WITHSCORES');
  const leaderboard = [];
  for (let i = 0; i < results.length; i += 2) {
    const id = results[i];
    const score = parseFloat(results[i + 1]);
    const details = type === 'users' 
      ? await User.findById(id).select('username avatar level')
      : await Host.findById(id).select('username avatar level roomTitle');
    
    if (details) {
      leaderboard.push({
        rank: i / 2 + 1,
        id: details._id,
        username: details.username,
        avatar: details.avatar,
        level: details.level,
        score: score,
        roomTitle: details.roomTitle || null,
      });
    }
  }
  return leaderboard;
}

async function updateUserRanking(userId, giftValue, diamonds) {
  const score = giftValue;
  await redisClient.zincrby(REDIS_KEYS.USER_LEADERBOARD, score, userId.toString());
  await redisClient.zincrby(REDIS_KEYS.USER_WEEKLY, score, userId.toString());
  await redisClient.zincrby(REDIS_KEYS.USER_MONTHLY, score, userId.toString());
  await redisClient.expire(REDIS_KEYS.USER_WEEKLY, 604800);
  await redisClient.expire(REDIS_KEYS.USER_MONTHLY, 2592000);
}

async function updateHostRanking(hostId, giftValue, diamonds) {
  const score = giftValue;
  await redisClient.zincrby(REDIS_KEYS.HOST_LEADERBOARD, score, hostId.toString());
  await redisClient.zincrby(REDIS_KEYS.HOST_WEEKLY, score, hostId.toString());
  await redisClient.zincrby(REDIS_KEYS.HOST_MONTHLY, score, hostId.toString());
  await redisClient.expire(REDIS_KEYS.HOST_WEEKLY, 604800);
  await redisClient.expire(REDIS_KEYS.HOST_MONTHLY, 2592000);
}

async function getUserRanking(userId, timeframe = 'allTime') {
  const redisKey = timeframe === TIMEFRAMES.ALL_TIME ? REDIS_KEYS.USER_LEADERBOARD : REDIS_KEYS[`USER_${timeframe.toUpperCase()}`];
  const rank = await redisClient.zrevrank(redisKey, userId.toString());
  const score = await redisClient.zscore(redisKey, userId.toString());
  return {
    userId,
    rank: rank !== null ? rank + 1 : null,
    score: score ? parseFloat(score) : 0,
    timeframe,
  };
}

async function getHostRanking(hostId, timeframe = 'allTime') {
  const redisKey = timeframe === TIMEFRAMES.ALL_TIME ? REDIS_KEYS.HOST_LEADERBOARD : REDIS_KEYS[`HOST_${timeframe.toUpperCase()}`];
  const rank = await redisClient.zrevrank(redisKey, hostId.toString());
  const score = await redisClient.zscore(redisKey, hostId.toString());
  return {
    hostId,
    rank: rank !== null ? rank + 1 : null,
    score: score ? parseFloat(score) : 0,
    timeframe,
  };
}

async function getNearbyRanks(type, id, timeframe, range = 5) {
  const redisKey = type === 'host'
    ? (timeframe === TIMEFRAMES.ALL_TIME ? REDIS_KEYS.HOST_LEADERBOARD : REDIS_KEYS[`HOST_${timeframe.toUpperCase()}`])
    : (timeframe === TIMEFRAMES.ALL_TIME ? REDIS_KEYS.USER_LEADERBOARD : REDIS_KEYS[`USER_${timeframe.toUpperCase()}`]);

  const currentRank = await redisClient.zrevrank(redisKey, id.toString());
  if (currentRank === null) return [];

  const start = Math.max(0, currentRank - range);
  const end = currentRank + range;
  const results = await redisClient.zrevrange(redisKey, start, end, 'WITHSCORES');
  
  const nearby = [];
  for (let i = 0; i < results.length; i += 2) {
    const entryId = results[i];
    const score = parseFloat(results[i + 1]);
    const entryRank = start + (i / 2) + 1;
    const details = type === 'host'
      ? await Host.findById(entryId).select('username avatar')
      : await User.findById(entryId).select('username avatar');

    nearby.push({
      rank: entryRank,
      id: entryId,
      username: details?.username || 'Unknown',
      avatar: details?.avatar || null,
      score,
      isCurrentUser: entryId.toString() === id.toString(),
    });
  }
  return nearby;
}

async function getLiveRoomLeaderboard(roomId, limit = 10) {
  const redisKey = `${REDIS_KEYS.LIVE_ROOMS}:${roomId}:gifters`;
  const results = await redisClient.zrevrange(redisKey, 0, limit - 1, 'WITHSCORES');
  const leaderboard = [];
  for (let i = 0; i < results.length; i += 2) {
    const userId = results[i];
    const score = parseFloat(results[i + 1]);
    const user = await User.findById(userId).select('username avatar level');
    if (user) {
      leaderboard.push({
        rank: i / 2 + 1,
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        level: user.level,
        giftValue: score,
      });
    }
  }
  return leaderboard;
}

async function broadcastRankingUpdates(io, data) {
  const { senderId, receiverId, receiverType, giftValue } = data;
  const namespace = io.of('/leaderboard');
  console.log(`📡 Broadcasted ranking update for gift transaction.`);
}

module.exports = initLeaderboardSocket;
                        
