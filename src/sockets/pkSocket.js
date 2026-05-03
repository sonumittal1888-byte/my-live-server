module.exports = (io, redis) => {
  io.on('connection', (socket) => {
    
    // PK muqabla shuru karne ke liye
    socket.on('startPK', (data) => {
      io.to(`live:${data.roomId}`).emit('pkStarted', data);
    });

    // Score update karne ke liye
    socket.on('updatePKScore', (data) => {
      io.to(`live:${data.roomId}`).emit('pkScoreUpdated', data);
    });

  });
};
