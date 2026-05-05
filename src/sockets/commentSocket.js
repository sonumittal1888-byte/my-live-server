const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const logger = require('../utils/logger');

// ============================================
// IN-MEMORY COMMENT STORE (per room)
// ============================================
const roomComments = new Map();

// ============================================
// HELPER: Get comments key for Redis
// ============================================
const getCommentsKey = (roomId) => `room:${roomId}:comments`;

// ============================================
// HELPER: Format comment for broadcast
// ============================================
const formatComment = (comment) => ({
  id: comment.id,
  text: comment.text,
  userId: comment.userId,
  username: comment.username,
  displayName: comment.displayName,
  avatar: comment.avatar,
  isVIP: comment.isVIP,
  vipLevel: comment.vipLevel,
  vipTitle: comment.vipTitle,
  timestamp: comment.timestamp,
  replyTo: comment.replyTo || null
});

// ============================================
// EXPORT SOCKET HANDLER
// ============================================
module.exports = (io, redis) => {

  io.on('connection', (socket) => {

    // ========================================
    // SEND COMMENT
    // ========================================
    socket.on('send_comment', async (data, callback) => {
      try {
        const { roomId, text, replyTo } = data;
        const userId = socket.userId;

        if (!userId) {
          return callback({
            success: false,
            error: 'Authentication required'
          });
        }

        if (!text || text.trim().length === 0) {
          return callback({
            success: false,
            error: 'Comment text cannot be empty'
          });
        }

        if (text.length > 200) {
          return callback({
            success: false,
            error: 'Comment too long (max 200 chars)'
          });
        }

        // Check if room exists
        const roomExists = io.sockets.adapter.rooms.has(roomId);
        if (!roomExists) {
          return callback({
            success: false,
            error: 'Room not found'
          });
        }

        // Get user details from DB
        const user = await User.findById(userId).select(
          'username displayName avatar isVIP vipLevel vipTitle'
        );

        if (!user) {
          return callback({
            success: false,
            error: 'User not found'
          });
        }

        // Create comment object
        const comment = {
          id: uuidv4(),
          text: text.trim(),
          userId: userId,
          username: user.username,
          displayName: user.displayName || user.username,
          avatar: user.avatar,
          isVIP: user.isVIP,
          vipLevel: user.vipLevel,
          vipTitle: user.vipTitle,
          roomId: roomId,
          timestamp: Date.now(),
          replyTo: replyTo || null
        };

        // Store in memory (last 100 per room)
        if (!roomComments.has(roomId)) {
          roomComments.set(roomId, []);
        }
        const roomCommentList = roomComments.get(roomId);
        roomCommentList.push(comment);
        if (roomCommentList.length > 100) {
          roomCommentList.shift(); // Remove oldest
        }

        // Store in Redis (persist for 24 hours)
        await redis.lpush(getCommentsKey(roomId), JSON.stringify(comment));
        await redis.ltrim(getCommentsKey(roomId), 0, 499); // Keep last 500
        await redis.expire(getCommentsKey(roomId), 86400);

        // Format for broadcast
        const broadcastComment = formatComment(comment);

        // Broadcast to ALL in room (including sender)
        io.to(roomId).emit('new_comment', broadcastComment);

        logger.info(`Comment by ${user.username} in room ${roomId}`);

        // Acknowledge sender
        callback({
          success: true,
          comment: broadcastComment
        });

      } catch (error) {
        logger.error('Send comment error:', error.message);
        callback({
          success: false,
          error: 'Failed to send comment'
        });
      }
    });

    // ========================================
    // GET COMMENT HISTORY
    // ========================================
    socket.on('get_comments', async (data, callback) => {
      try {
        const { roomId, limit = 50 } = data;

        // Try memory first
        let comments = roomComments.get(roomId) || [];

        // If memory empty, try Redis
        if (comments.length === 0) {
          const redisComments = await redis.lrange(
            getCommentsKey(roomId),
            0,
            limit - 1
          );
          comments = redisComments.map(c => JSON.parse(c)).reverse();
        }

        // Format for response
        const formattedComments = comments
          .slice(-limit)
          .map(formatComment);

        callback({
          success: true,
          comments: formattedComments,
          count: formattedComments.length
        });

      } catch (error) {
        logger.error('Get comments error:', error.message);
        callback({
          success: false,
          error: 'Failed to get comments'
        });
      }
    });

    // ========================================
    // DELETE COMMENT (Moderator only)
    // ========================================
    socket.on('delete_comment', async (data, callback) => {
      try {
        const { roomId, commentId } = data;
        const userId = socket.userId;

        // Remove from memory
        const roomCommentList = roomComments.get(roomId);
        if (roomCommentList) {
          const index = roomCommentList.findIndex(c => c.id === commentId);
          if (index !== -1) {
            roomCommentList.splice(index, 1);
          }
        }

        // Broadcast deletion
        io.to(roomId).emit('comment_deleted', { commentId });

        callback({ success: true });

      } catch (error) {
        logger.error('Delete comment error:', error.message);
        callback({
          success: false,
          error: 'Failed to delete comment'
        });
      }
    });

    // ========================================
    // TYPING INDICATOR
    // ========================================
    socket.on('typing', (data) => {
      const { roomId } = data;
      const userId = socket.userId;

      socket.to(roomId).emit('user_typing', {
        userId,
        username: socket.username || 'User'
      });
    });

    socket.on('stop_typing', (data) => {
      const { roomId } = data;

      socket.to(roomId).emit('user_stop_typing', {
        userId: socket.userId
      });
    });

    // ========================================
    // CLEANUP ON DISCONNECT
    // ========================================
    socket.on('disconnect', () => {
      if (socket.roomId) {
        socket.to(socket.roomId).emit('user_stop_typing', {
          userId: socket.userId
        });
      }
    });

  });
};
