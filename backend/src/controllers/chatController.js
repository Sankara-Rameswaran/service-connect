const { Conversation, ChatMessage } = require('../models/Chat');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const getOrCreateConversation = async (req, res, next) => {
  try {
    const { participantId, bookingId } = req.body;
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, participantId],
        booking: bookingId,
      });
    }
    await conversation.populate('participants', 'name avatar availability lastSeen');
    return successResponse(res, { conversation }, 'Conversation ready');
  } catch (error) { next(error); }
};

const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', 'name avatar availability lastSeen')
      .populate('lastMessage')
      .sort('-lastMessageAt');
    return successResponse(res, { conversations });
  } catch (error) { next(error); }
};

const getMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return errorResponse(res, 'Conversation not found', 404);
    if (!conversation.participants.some(p => p.toString() === req.user._id.toString())) {
      return errorResponse(res, 'Not authorized', 403);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [messages, total] = await Promise.all([
      ChatMessage.find({ conversation: req.params.conversationId, isDeleted: false })
        .populate('sender', 'name avatar')
        .sort('-createdAt').skip(skip).limit(parseInt(limit)),
      ChatMessage.countDocuments({ conversation: req.params.conversationId }),
    ]);

    // Mark as read
    await ChatMessage.updateMany(
      { conversation: req.params.conversationId, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    return paginatedResponse(res, messages.reverse(), total, page, limit);
  } catch (error) { next(error); }
};

const sendMessage = async (req, res, next) => {
  try {
    const { content, type = 'TEXT', location } = req.body;
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) return errorResponse(res, 'Conversation not found', 404);

    let mediaUrl;
    if (req.file) mediaUrl = req.file.path || `/uploads/${req.file.filename}`;

    const message = await ChatMessage.create({
      conversation: req.params.conversationId,
      sender: req.user._id,
      type,
      content,
      mediaUrl,
      location,
      readBy: [req.user._id],
    });

    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await message.populate('sender', 'name avatar');

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== req.user._id.toString()) {
          io.to(`user_${participantId}`).emit('new_message', { message, conversationId: req.params.conversationId });
        }
      });
    }

    return successResponse(res, { message }, 'Message sent', 201);
  } catch (error) { next(error); }
};

module.exports = { getOrCreateConversation, getMyConversations, getMessages, sendMessage };
