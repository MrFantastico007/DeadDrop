const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  admin: {
    type: String,
    required: true
  },
  editors: {
    type: [String],
    default: []
  },
  conversers: {
    type: [String],
    default: []
  },
  blocked: {
    type: [String],
    default: []
  },
  viewers: {
    type: [String],
    default: []
  }
});

module.exports = mongoose.model('Permission', permissionSchema);
