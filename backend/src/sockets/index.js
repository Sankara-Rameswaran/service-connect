const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

const setupSockets = (io) => {
  // Authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 Socket connected: ${user.name} (${user.role})`);

    // Join personal room
    socket.join(`user_${user._id}`);

    // Update last seen
    User.findByIdAndUpdate(user._id, { lastSeen: new Date() }).exec();

    // Join booking room for live tracking
    socket.on('join_booking', (bookingId) => {
      socket.join(`booking_${bookingId}`);
    });

    socket.on('leave_booking', (bookingId) => {
      socket.leave(`booking_${bookingId}`);
    });

    // Provider sends live location
    socket.on('provider_location_update', ({ bookingId, lat, lng }) => {
      io.to(`booking_${bookingId}`).emit('provider_location', {
        providerId: user._id,
        lat,
        lng,
        timestamp: new Date(),
      });
    });

    // Chat room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation_${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Typing indicators
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId: user._id,
        name: user.name,
      });
    });

    socket.on('stop_typing', ({ conversationId }) => {
      socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
        userId: user._id,
      });
    });

    // Mark message as read
    socket.on('message_read', ({ conversationId, messageId }) => {
      socket.to(`conversation_${conversationId}`).emit('message_read_ack', {
        messageId,
        readBy: user._id,
      });
    });

    socket.on('disconnect', () => {
      User.findByIdAndUpdate(user._id, { lastSeen: new Date() }).exec();
      console.log(`🔌 Disconnected: ${user.name}`);
    });
  });
};

module.exports = setupSockets;
