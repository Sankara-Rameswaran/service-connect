const mongoose = require('mongoose');

// Review Model
const reviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
    images: [String],
    providerReply: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

// Notification Model
const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: [
        'BOOKING_REQUEST',
        'BOOKING_ACCEPTED',
        'BOOKING_REJECTED',
        'BOOKING_COMPLETED',
        'BOOKING_CANCELLED',
        'NEW_MESSAGE',
        'NEW_REVIEW',
        'ACCOUNT_SUSPENDED',
        'PAYMENT_RECEIVED',
        'NEED_HELP_REQUEST',
        'GENERAL',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// NeedHelpRequest Model
const needHelpSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: String, required: true },
    images: [String],
    budget: { min: Number, max: Number },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    address: { type: String },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    responses: [
      {
        provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: String,
        price: Number,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

needHelpSchema.index({ location: '2dsphere' });

// Payment Model
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    providerEarning: { type: Number, required: true },
    platformCommission: { type: Number, required: true },
    method: { type: String, enum: ['CASH', 'CARD', 'ONLINE'], default: 'CASH' },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    transactionId: { type: String },
  },
  { timestamps: true }
);

const Review = mongoose.model('Review', reviewSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const NeedHelpRequest = mongoose.model('NeedHelpRequest', needHelpSchema);
const Payment = mongoose.model('Payment', paymentSchema);

module.exports = { Review, Notification, NeedHelpRequest, Payment };
