const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const logger = require('../utils/logger');

const rooms = new Map();

module.exports = (io, redis) => {
  io.on('connection', (socket) => {
    
    // 1. Host Stream Start Karega
    socket.on('start_stream', async (data, callback) => {
      try {
        const host = await User.findById(socket.userId);
        const roomId = uuidv4();
        
        const room = {
          id: roomId,
          hostId: socket.userId,
          hostName: host.displayName || host.username,
          isLive: true,
          participants: new Map()
        };

        rooms.set(roomId, room);
        socket.join(roomId);
        socket.roomId = roomId;
        socket.isHost = true;

        await redis.set(`room:${roomId}:viewers`, 0);
        callback({ success: true, roomId });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // 2. Viewer Join Karega
    socket.on('join_room', async (data, callback) => {
      const { roomId } = data;
      const room = rooms.get(roomId);

      if (room && room.isLive) {
        socket.join(roomId);
        socket.roomId = roomId;
        const newCount = await redis.incr(`room:${roomId}:viewers`);
        io.to(roomId).emit('viewer_count_update', { count: newCount });
        callback({ success: true, viewerCount: newCount });
      } else {
        callback({ success: false, error: 'Room not found' });
      }
    });

    // 3. Disconnect hone par cleanup
    socket.on('disconnect', async () => {
      if (socket.roomId) {
        const newCount = await redis.decr(`room:${socket.roomId}:viewers`);
        io.to(socket.roomId).emit('viewer_count_update', { count: Math.max(0, newCount) });
      }
    });
  });
};

