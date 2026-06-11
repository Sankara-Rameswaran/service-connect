const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    category: {
      type: String,
      required: true,
      enum: [
        'Plumbing',
        'Electrical',
        'Cleaning',
        'Painting',
        'Carpentry',
        'Landscaping',
        'HVAC',
        'Roofing',
        'Moving',
        'Pest Control',
        'Appliance Repair',
        'Handyman',
        'Security',
        'Interior Design',
        'Other',
      ],
      index: true,
    },
    price: { type: Number, required: true, min: 0 },
    priceType: {
      type: String,
      enum: ['FIXED', 'HOURLY', 'NEGOTIABLE'],
      default: 'FIXED',
    },
    images: [{ type: String }],
    tags: [{ type: String }],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    serviceArea: { type: Number, default: 25 }, // km radius
    isActive: { type: Boolean, default: true },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalBookings: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceSchema.index({ location: '2dsphere' });
serviceSchema.index({ category: 1, price: 1 });
serviceSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Service', serviceSchema);
