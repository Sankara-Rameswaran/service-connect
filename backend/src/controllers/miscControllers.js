const { Review, Notification, NeedHelpRequest, Payment } = require('../models/index');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// ---- REVIEWS ----
const createReview = async (req, res, next) => {
  try {
    const { bookingId, rating, comment } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return errorResponse(res, 'Booking not found', 404);
    if (booking.user.toString() !== req.user._id.toString()) return errorResponse(res, 'Not authorized', 403);
    if (booking.status !== 'COMPLETED') return errorResponse(res, 'Can only review completed bookings', 400);
    if (booking.reviewSubmitted) return errorResponse(res, 'Review already submitted', 400);

    const review = await Review.create({
      booking: bookingId,
      user: req.user._id,
      provider: booking.provider,
      service: booking.service,
      rating,
      comment,
    });

    booking.reviewSubmitted = true;
    await booking.save();

    // Update provider average rating
    const reviews = await Review.find({ provider: booking.provider });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await User.findByIdAndUpdate(booking.provider, {
      averageRating: parseFloat(avgRating.toFixed(1)),
      totalReviews: reviews.length,
    });
    await Service.findByIdAndUpdate(booking.service, {
      averageRating: parseFloat(avgRating.toFixed(1)),
      totalReviews: reviews.length,
    });

    await Notification.create({
      recipient: booking.provider,
      sender: req.user._id,
      type: 'NEW_REVIEW',
      title: 'New Review',
      message: `${req.user.name} left you a ${rating}-star review`,
      data: { reviewId: review._id },
    });

    return successResponse(res, { review }, 'Review submitted', 201);
  } catch (error) { next(error); }
};

const getProviderReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [reviews, total] = await Promise.all([
      Review.find({ provider: req.params.providerId })
        .populate('user', 'name avatar')
        .populate('service', 'title')
        .sort('-createdAt').skip(skip).limit(parseInt(limit)),
      Review.countDocuments({ provider: req.params.providerId }),
    ]);
    return paginatedResponse(res, reviews, total, page, limit);
  } catch (error) { next(error); }
};

// ---- NOTIFICATIONS ----
const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [notifications, total, unread] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .populate('sender', 'name avatar')
        .sort('-createdAt').skip(skip).limit(parseInt(limit)),
      Notification.countDocuments({ recipient: req.user._id }),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);
    return successResponse(res, { notifications, pagination: { total, page: parseInt(page), limit: parseInt(limit) }, unreadCount: unread });
  } catch (error) { next(error); }
};

const markNotificationRead = async (req, res, next) => {
  try {
    if (req.params.id === 'all') {
      await Notification.updateMany({ recipient: req.user._id }, { isRead: true });
      return successResponse(res, {}, 'All notifications marked as read');
    }
    await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { isRead: true });
    return successResponse(res, {}, 'Notification marked as read');
  } catch (error) { next(error); }
};

// ---- NEED HELP ----
const createNeedHelp = async (req, res, next) => {
  try {
    const { title, description, category, address, lat, lng, minBudget, maxBudget } = req.body;
    const images = req.files ? req.files.map(f => f.path || `/uploads/${f.filename}`) : [];
    const request = await NeedHelpRequest.create({
      user: req.user._id, title, description, category, images, address,
      budget: { min: minBudget, max: maxBudget },
      location: { type: 'Point', coordinates: [parseFloat(lng) || 0, parseFloat(lat) || 0] },
    });
    return successResponse(res, { request }, 'Request created', 201);
  } catch (error) { next(error); }
};

const getNeedHelpRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, status = 'OPEN' } = req.query;
    const filter = { status };
    if (category) filter.category = category;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await Promise.all([
      NeedHelpRequest.find(filter).populate('user', 'name avatar').sort('-createdAt').skip(skip).limit(parseInt(limit)),
      NeedHelpRequest.countDocuments(filter),
    ]);
    return paginatedResponse(res, requests, total, page, limit);
  } catch (error) { next(error); }
};

const respondToNeedHelp = async (req, res, next) => {
  try {
    const { message, price } = req.body;
    const request = await NeedHelpRequest.findById(req.params.id);
    if (!request) return errorResponse(res, 'Request not found', 404);
    const alreadyResponded = request.responses.some(r => r.provider.toString() === req.user._id.toString());
    if (alreadyResponded) return errorResponse(res, 'Already responded', 400);
    request.responses.push({ provider: req.user._id, message, price });
    await request.save();
    await Notification.create({
      recipient: request.user, sender: req.user._id,
      type: 'NEED_HELP_REQUEST', title: 'Provider Responded',
      message: `${req.user.name} responded to your help request`,
      data: { requestId: request._id },
    });
    return successResponse(res, { request }, 'Response submitted');
  } catch (error) { next(error); }
};

// ---- ADMIN ----
const getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, totalProviders, totalBookings, completedBookings] = await Promise.all([
      User.countDocuments({ role: 'USER' }),
      User.countDocuments({ role: 'PROVIDER' }),
      Booking.countDocuments(),
      Booking.find({ status: 'COMPLETED' }).select('platformCommission createdAt'),
    ]);

    const platformRevenue = completedBookings.reduce((sum, b) => sum + (b.platformCommission || 0), 0);

    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyData = await Booking.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$platformCommission' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Booking status distribution
    const statusDist = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Popular categories
    const popularCategories = await Service.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, bookings: { $sum: '$totalBookings' } } },
      { $sort: { bookings: -1 } },
      { $limit: 8 },
    ]);

    return successResponse(res, {
      totalUsers, totalProviders, totalBookings,
      platformRevenue: parseFloat(platformRevenue.toFixed(2)),
      monthlyData, statusDist, popularCategories,
    });
  } catch (error) { next(error); }
};

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search, suspended } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (suspended !== undefined) filter.isSuspended = suspended === 'true';
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort('-createdAt').skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);
    return paginatedResponse(res, users, total, page, limit);
  } catch (error) { next(error); }
};

const suspendUser = async (req, res, next) => {
  try {
    const { suspend, reason } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id,
      { isSuspended: suspend, suspendReason: reason || '' }, { new: true });
    if (!user) return errorResponse(res, 'User not found', 404);
    return successResponse(res, { user }, `User ${suspend ? 'suspended' : 'unsuspended'}`);
  } catch (error) { next(error); }
};

module.exports = {
  createReview, getProviderReviews,
  getNotifications, markNotificationRead,
  createNeedHelp, getNeedHelpRequests, respondToNeedHelp,
  getAdminStats, getUsers, suspendUser,
};
