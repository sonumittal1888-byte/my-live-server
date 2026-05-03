module.exports = (io, redis) => {
  io.on('connection', (socket) => {
    // Chat message ke liye logic
    socket.on('sendMessage', (data) => {
      const { roomId, message, username } = data;
      // Sabko message dikhao
      io.to(`live:${roomId}`).emit('newMessage', { username, message });
    });
  });
};
