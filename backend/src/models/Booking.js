const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      zipCode: String,
    },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    notes: { type: String, maxlength: 1000 },
    // Payment
    paymentAmount: { type: Number, default: 0 },
    providerEarning: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PAID', 'REFUNDED'],
      default: 'UNPAID',
    },
    paymentMethod: { type: String, enum: ['CASH', 'CARD', 'ONLINE'], default: 'CASH' },
    // Tracking
    providerLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    startedAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    rejectionReason: String,
    // Review flag
    reviewSubmitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bookingSchema.index({ location: '2dsphere' });
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ scheduledDate: 1 });

// Calculate commission before save
bookingSchema.pre('save', function (next) {
  if (this.isModified('paymentAmount') && this.paymentAmount > 0) {
    this.platformCommission = parseFloat((this.paymentAmount * 0.05).toFixed(2));
    this.providerEarning = parseFloat((this.paymentAmount * 0.95).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
