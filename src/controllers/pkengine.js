/**
 * ============================================
 * PK BATTLE ENGINE — StreamFlow Vijay Palace
 * Real-time Scoring & Spender Multipliers
 * ============================================
 */

// PK battle score update function
async function processPKGift(io, roomId, data) {
  try {
    const { senderId, targetTeam, giftValue, giftName } = data;

    if (!roomId || !targetTeam || !giftValue) {
      return;
    }

    // Level >= 50 user ya elite gifts par 1.5x Multiplier activate hoga
    const isVipBonus = giftValue >= 1000;
    const finalPoints = isVipBonus ? Math.floor(giftValue * 1.5) : giftValue;

    // Sabhi live users ko socket ke zariye real-time update bhejenge
    io.to(roomId).emit('pkScoreUpdate', {
      senderId,
      targetTeam, // 'red' or 'blue'
      pointsAdded: finalPoints,
      giftName: giftName || 'Gift',
      isVipBonus
    });

    console.log(`[PK Engine] ${senderId} sent ${giftName} worth ${finalPoints} pts to Team ${targetTeam}`);

  } catch (error) {
    console.error('[PK Engine] Error processing live score:', error.message);
  }
}

module.exports = { processPKGift };

