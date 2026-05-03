module.exports = (io, redisClient) => {
  io.on('connection', (socket) => {
    socket.on('get-leaderboard', async (roomId) => {
      try {
        const leaderboardKey = `leaderboard:${roomId}`;
        const leaderboard = await redisClient.zRangeWithScores(leaderboardKey, 0, 9, {
          REV: true
        });
        socket.emit('leaderboard-data', { success: true, leaderboard });
      } catch (err) {
        console.error('Leaderboard Error:', err.message);
      }
    });
  });
};
