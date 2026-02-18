const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['text', 'file'],
    required: true
  },
  content: {
    type: String
  },
  fileUrl: {
    type: String
  },
  publicId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);
