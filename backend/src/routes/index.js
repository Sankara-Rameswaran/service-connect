const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/errorHandler');
const { upload } = require('../config/cloudinary');

// Controllers
const auth = require('../controllers/authController');
const services = require('../controllers/serviceController');
const bookings = require('../controllers/bookingController');
const misc = require('../controllers/miscControllers');
const chat = require('../controllers/chatController');

const router = express.Router();

// ===== AUTH =====
router.post('/auth/register',
  [body('name').notEmpty(), body('email').isEmail(), body('password').isLength({ min: 6 })],
  validate, auth.register);
router.post('/auth/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate, auth.login);
router.post('/auth/refresh', auth.refreshToken);
router.post('/auth/logout', protect, auth.logout);
router.get('/auth/me', protect, auth.getMe);
router.put('/auth/profile', protect, upload.single('avatar'), auth.updateProfile);
router.put('/auth/change-password', protect, auth.changePassword);

// ===== SERVICES =====
router.get('/services', services.getServices);
router.get('/services/my', protect, authorize('PROVIDER'), services.getMyServices);
router.get('/services/:id', services.getServiceById);
router.post('/services', protect, authorize('PROVIDER', 'ADMIN'), upload.array('images', 5), services.createService);
router.put('/services/:id', protect, authorize('PROVIDER', 'ADMIN'), upload.array('images', 5), services.updateService);
router.delete('/services/:id', protect, authorize('PROVIDER', 'ADMIN'), services.deleteService);

// ===== BOOKINGS =====
router.post('/bookings', protect, authorize('USER'), bookings.createBooking);
router.get('/bookings/my', protect, bookings.getMyBookings);
router.get('/bookings/provider', protect, authorize('PROVIDER'), bookings.getProviderBookings);
router.get('/bookings/:id', protect, bookings.getBookingById);
router.put('/bookings/:id/status', protect, bookings.updateBookingStatus);
router.get('/admin/bookings', protect, authorize('ADMIN'), bookings.getAllBookings);

// ===== REVIEWS =====
router.post('/reviews', protect, authorize('USER'),
  [body('rating').isInt({ min: 1, max: 5 })], validate, misc.createReview);
router.get('/reviews/provider/:providerId', misc.getProviderReviews);

// ===== NOTIFICATIONS =====
router.get('/notifications', protect, misc.getNotifications);
router.put('/notifications/:id/read', protect, misc.markNotificationRead);

// ===== NEED HELP =====
router.post('/need-help', protect, authorize('USER'), upload.array('images', 3), misc.createNeedHelp);
router.get('/need-help', protect, misc.getNeedHelpRequests);
router.post('/need-help/:id/respond', protect, authorize('PROVIDER'), misc.respondToNeedHelp);

// ===== CHAT =====
router.post('/conversations', protect, chat.getOrCreateConversation);
router.get('/conversations', protect, chat.getMyConversations);
router.get('/conversations/:conversationId/messages', protect, chat.getMessages);
router.post('/conversations/:conversationId/messages', protect, upload.single('media'), chat.sendMessage);

// ===== ADMIN =====
router.get('/admin/stats', protect, authorize('ADMIN'), misc.getAdminStats);
router.get('/admin/users', protect, authorize('ADMIN'), misc.getUsers);
router.put('/admin/users/:id/suspend', protect, authorize('ADMIN'), misc.suspendUser);

// Provider availability
router.put('/providers/availability', protect, authorize('PROVIDER'), async (req, res) => {
  const { availability } = req.body;
  await require('../models/User').findByIdAndUpdate(req.user._id, { availability });
  res.json({ success: true, message: 'Availability updated', data: { availability } });
});

// Provider location update
router.put('/providers/location', protect, authorize('PROVIDER'), async (req, res) => {
  const { lat, lng } = req.body;
  const io = req.app.get('io');
  // Emit live location to any active booking users
  if (io) {
    io.emit(`provider_location_${req.user._id}`, { lat, lng, providerId: req.user._id });
  }
  res.json({ success: true, message: 'Location updated' });
});

// Get providers (for users to browse)
router.get('/providers', async (req, res, next) => {
  try {
    const { availability, rating, page = 1, limit = 12 } = req.query;
    const filter = { role: 'PROVIDER', isActive: true, isSuspended: false };
    if (availability) filter.availability = availability;
    if (rating) filter.averageRating = { $gte: parseFloat(rating) };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const User = require('../models/User');
    const [providers, total] = await Promise.all([
      User.find(filter).select('-password -refreshToken').skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: providers, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (e) { next(e); }
});

module.exports = router;
