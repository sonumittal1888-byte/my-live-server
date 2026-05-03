
module.exports = (io, redisClient) => {
  io.on('connection', (socket) => {
    
    // Live room join karne ke liye
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`User joined room: ${roomId}`);
    });

    // Jab host live aaye
    socket.on('go-live', (data) => {
      const { roomId, userId, username } = data;
      // Sabko notification bhejo ki live shuru ho gaya
      socket.to(roomId).emit('user-live', { userId, username });
    });

    // Room se bahar nikalne ke liye
    socket.on('leave-room', (roomId) => {
      socket.leave(roomId);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected from room');
    });
  });
};
