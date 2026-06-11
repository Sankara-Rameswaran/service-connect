const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatMessage' },
    lastMessageAt: { type: Date, default: Date.now },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'VOICE', 'LOCATION'],
      default: 'TEXT',
    },
    content: { type: String },
    mediaUrl: { type: String },
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Conversation = mongoose.model('Conversation', conversationSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = { Conversation, ChatMessage };
