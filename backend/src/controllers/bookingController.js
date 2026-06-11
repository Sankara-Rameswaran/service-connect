const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { Notification } = require('../models/index');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const createBooking = async (req, res, next) => {
  try {
    const { serviceId, scheduledDate, scheduledTime, address, notes, paymentMethod } = req.body;

    const service = await Service.findById(serviceId).populate('provider');
    if (!service) return errorResponse(res, 'Service not found', 404);
    if (!service.isActive) return errorResponse(res, 'Service is not available', 400);
    if (service.provider._id.toString() === req.user._id.toString()) {
      return errorResponse(res, 'Cannot book your own service', 400);
    }

    const booking = await Booking.create({
      user: req.user._id,
      provider: service.provider._id,
      service: serviceId,
      scheduledDate,
      scheduledTime,
      address,
      notes,
      paymentAmount: service.price,
      paymentMethod: paymentMethod || 'CASH',
    });

    // Notify provider
    await Notification.create({
      recipient: service.provider._id,
      sender: req.user._id,
      type: 'BOOKING_REQUEST',
      title: 'New Booking Request',
      message: `${req.user.name} has requested your service: ${service.title}`,
      data: { bookingId: booking._id },
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${service.provider._id}`).emit('new_booking', {
        booking,
        message: `New booking from ${req.user.name}`,
      });
      io.to(`user_${service.provider._id}`).emit('notification', {
        type: 'BOOKING_REQUEST',
        message: `New booking for ${service.title}`,
      });
    }

    await booking.populate([
      { path: 'user', select: 'name avatar phone' },
      { path: 'provider', select: 'name avatar phone' },
      { path: 'service', select: 'title category price images' },
    ]);

    return successResponse(res, { booking }, 'Booking created', 201);
  } catch (error) {
    next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('provider', 'name avatar phone')
        .populate('service', 'title category price images')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter),
    ]);
    return paginatedResponse(res, bookings, total, page, limit);
  } catch (error) {
    next(error);
  }
};

const getProviderBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { provider: req.user._id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('user', 'name avatar phone address')
        .populate('service', 'title category price images')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter),
    ]);
    return paginatedResponse(res, bookings, total, page, limit);
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name avatar phone address')
      .populate('provider', 'name avatar phone')
      .populate('service', 'title category price images description');

    if (!booking) return errorResponse(res, 'Booking not found', 404);

    const isOwner =
      booking.user._id.toString() === req.user._id.toString() ||
      booking.provider._id.toString() === req.user._id.toString() ||
      req.user.role === 'ADMIN';

    if (!isOwner) return errorResponse(res, 'Not authorized', 403);
    return successResponse(res, { booking });
  } catch (error) {
    next(error);
  }
};

const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason, cancellationReason } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name')
      .populate('service', 'title');

    if (!booking) return errorResponse(res, 'Booking not found', 404);

    const isProvider = booking.provider.toString() === req.user._id.toString();
    const isUser = booking.user._id.toString() === req.user._id.toString();

    // Permission checks
    if (status === 'ACCEPTED' && !isProvider) return errorResponse(res, 'Only provider can accept', 403);
    if (status === 'REJECTED' && !isProvider) return errorResponse(res, 'Only provider can reject', 403);
    if (status === 'COMPLETED' && !isProvider) return errorResponse(res, 'Only provider can complete', 403);
    if (status === 'CANCELLED' && !isUser && !isProvider) return errorResponse(res, 'Not authorized', 403);

    booking.status = status;
    if (status === 'REJECTED') booking.rejectionReason = rejectionReason;
    if (status === 'CANCELLED') booking.cancellationReason = cancellationReason;
    if (status === 'IN_PROGRESS') booking.startedAt = new Date();
    if (status === 'COMPLETED') {
      booking.completedAt = new Date();
      booking.paymentStatus = 'PAID';
      // Update provider earnings
      await require('../models/User').findByIdAndUpdate(booking.provider, {
        $inc: { totalEarnings: booking.providerEarning },
      });
      // Update service booking count
      await Service.findByIdAndUpdate(booking.service, { $inc: { totalBookings: 1 } });
    }

    await booking.save();

    // Notify user
    const notifType = `BOOKING_${status}`;
    const notifMessages = {
      ACCEPTED: 'Your booking has been accepted!',
      REJECTED: 'Your booking was rejected.',
      COMPLETED: 'Your service has been completed!',
      CANCELLED: 'Booking has been cancelled.',
    };

    if (notifMessages[status]) {
      await Notification.create({
        recipient: isProvider ? booking.user._id : booking.provider,
        sender: req.user._id,
        type: notifType,
        title: `Booking ${status}`,
        message: notifMessages[status],
        data: { bookingId: booking._id },
      });

      const io = req.app.get('io');
      if (io) {
        const recipientId = isProvider ? booking.user._id : booking.provider;
        io.to(`user_${recipientId}`).emit('booking_update', { bookingId: booking._id, status });
        io.to(`user_${recipientId}`).emit('notification', { message: notifMessages[status] });
      }
    }

    return successResponse(res, { booking }, `Booking ${status.toLowerCase()}`);
  } catch (error) {
    next(error);
  }
};

const getAllBookings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, userId, providerId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (userId) filter.user = userId;
    if (providerId) filter.provider = providerId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate('user', 'name email avatar')
        .populate('provider', 'name email avatar')
        .populate('service', 'title category price')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(filter),
    ]);
    return paginatedResponse(res, bookings, total, page, limit);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getProviderBookings,
  getBookingById,
  updateBookingStatus,
  getAllBookings,
};
