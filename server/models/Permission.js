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
const Permission = mongoose.model('Permission', permissionSchema);

// Safely drop the legacy unique index if it exists so it doesn't block new per-room documents
Permission.collection.dropIndex('singleton_1').catch(() => {});

module.exports = Permission;
