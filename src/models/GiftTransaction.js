const mongoose = require('mongoose');

const giftTransactionSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver ID is required'],
    },
    giftId: {
      type: String, // String rakha hai kyunki GIFT_CATALOG mein 'rose', 'heart' types hain
      required: [true, 'Gift ID is required'],
    },
    giftName: {
      type: String,
      required: [true, 'Gift Name is required'],
    },
    giftPrice: {
      type: Number,
      required: [true, 'Gift price is required'],
      min: [0, 'Gift price cannot be negative'],
    },
    quantity: {
      type: Number,
      default: 1,
    },
    totalPrice: {
      type: Number,
      required: [true, 'Total price is required'],
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    receiverEarnings: {
      type: Number,
      required: [true, 'Receiver earnings is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    roomId: {
      type: String, // String ya ObjectId jaisa aapke system mein roomId pass ho raha hai
      required: [true, 'Room ID is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
  },
  {
    timestamps: true, // createdAt & updatedAt automatic add honge
  }
);

// Indexes for faster queries
giftTransactionSchema.index({ senderId: 1, createdAt: -1 });
giftTransactionSchema.index({ receiverId: 1, createdAt: -1 });
giftTransactionSchema.index({ roomId: 1, createdAt: -1 });

const GiftTransaction = mongoose.model('GiftTransaction', giftTransactionSchema);

module.exports = GiftTransaction;

