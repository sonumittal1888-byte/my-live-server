const express = require('express');
const router = express.Router();
const { initiatePhonePePay } = require('../utils/paymentGateway');

// API Endpoint to initiate dynamic diamond purchase
router.post('/phonepe/initiate', async (req, res) => {
  try {
    const { userId, amount, diamondPackId } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ success: false, message: 'Missing userId or amount' });
    }

    // Creating unique transaction ID for PhonePe
    const transactionId = `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recharge/status?txn=${transactionId}`;

    const paymentResult = await initiatePhonePePay(transactionId, amount, userId, redirectUrl);

    if (paymentResult.success) {
      return res.status(200).json({
        success: true,
        paymentUrl: paymentResult.paymentUrl,
        transactionId
      });
    } else {
      return res.status(500).json({ success: false, message: paymentResult.message });
    }

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
