const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  // Use a singleton document with a known ID to store global permissions
  singleton: {
    type: String,
    default: 'GLOBAL',
    unique: true
  },
  admins: {
    type: [String],
    default: []
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
