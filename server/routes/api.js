const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Message = require('../models/Message');
const Permission = require('../models/Permission');

async function getPermissions(roomCode) {
    let perm = await Permission.findOne({ roomCode });
    if (!perm) {
        return { admin: null, editors: [], conversers: [], blocked: [], viewers: [] };
    }
    return perm;
}

function getRoleForDevice(perm, deviceId) {
    if (!deviceId) return 'viewer';
    if (perm.blocked.includes(deviceId)) return 'blocked';
    if (perm.admin === deviceId) return 'admin';
    if (perm.editors.includes(deviceId)) return 'editor';
    if (perm.conversers.includes(deviceId)) return 'converser';
    return 'viewer'; // Default to viewer for new connections
}

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup Multer to store uploaded files locally
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    // Create a safe filename
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName)
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Create a new room and assign creator as admin
router.post('/room/create', async (req, res) => {
    const { roomCode, deviceId } = req.body;
    if (!roomCode || !deviceId) return res.status(400).json({ error: 'Missing data' });
    
    try {
        let perm = await Permission.findOne({ roomCode });
        if (!perm) {
            perm = new Permission({
                roomCode,
                admin: deviceId
            });
            await perm.save();
        }
        res.json({ success: true, role: 'admin' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Join a room and fetch its history
router.post('/room/join', async (req, res) => {
  const { roomCode, deviceId } = req.body;
  if (!roomCode) return res.status(400).json({ error: 'Room code is required' });
  
  try {
    const perm = await getPermissions(roomCode);
    const role = getRoleForDevice(perm, deviceId);
    
    const messages = await Message.find({ roomCode }).sort({ createdAt: 1 });
    res.json({ success: true, messages, role });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Handle file uploads with proper error catching
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Return the local URL so the client can broadcast it
  // Construct the full URL using the request host or fallback to standard path
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  res.json({
    fileUrl: `${protocol}://${host}/uploads/${req.file.filename}`,
    publicId: req.file.filename
  });
});

// Save a new message (text or file) to the database
router.post('/message', async (req, res) => {
    const { roomCode, type, content, fileUrl, publicId, deviceId } = req.body;
    
    try {
        const perm = await getPermissions(roomCode);
        const role = getRoleForDevice(perm, deviceId);
        
        if (role === 'blocked') return res.status(403).json({ error: 'Blocked' });
        if (role === 'viewer') return res.status(403).json({ error: 'Viewers cannot send messages' });

        const newMessage = new Message({
            roomCode,
            type,
            content,
            fileUrl,
            publicId
        });
        await newMessage.save();
        
        // Push the message to all connected clients in the room
        const io = require('../utils/socket').getIO();
        io.to(roomCode).emit('receive_message', newMessage);
        
        res.json({ success: true, message: newMessage });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Delete a message and its associated file if applicable
router.delete('/message/:id', async (req, res) => {
    try {
        const deviceId = req.headers.deviceid;
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        const perm = await getPermissions(message.roomCode);
        const role = getRoleForDevice(perm, deviceId);
        
        if (role !== 'admin' && role !== 'editor') {
            return res.status(403).json({ error: 'Forbidden. You do not have Delete permissions.' });
        }

        // If it's a file, remove it from local storage first
        if (message.type === 'file' && message.publicId) {
            const filePath = path.join(__dirname, '../uploads', message.publicId);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Message.findByIdAndDelete(req.params.id);

        // Notify clients to remove the message from their view
        const io = require('../utils/socket').getIO();
        io.to(message.roomCode).emit('delete_message', req.params.id);

        res.json({ success: true, messageId: req.params.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// Scheduled cleanup task (called by cron job)
// Removes rooms where the last activity was more than 24 hours ago
router.get('/cleanup', async (req, res) => {
    try {
        const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
        
        // 1. Find all rooms that have had activity (created messages) AFTER the threshold
        // These are the "active" rooms we want to KEEP.
        const activeRoomCodes = await Message.distinct('roomCode', { createdAt: { $gte: threshold } });
        
        // 2. Find all messages that belong to rooms NOT in the active list
        // These are messages in "inactive" rooms.
        const messagesToDelete = await Message.find({ roomCode: { $nin: activeRoomCodes } });
        
        if (messagesToDelete.length === 0) {
            return res.json({ success: true, deletedCount: 0, cloudinaryDeleted: 0, message: "No inactive rooms found" });
        }

        // 3. Clean up local files for these messages
        const fileMessages = messagesToDelete.filter(m => m.type === 'file' && m.publicId);
        let deletedFilesCount = 0;
        
        fileMessages.forEach(m => {
            const filePath = path.join(__dirname, '../uploads', m.publicId);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    deletedFilesCount++;
                } catch (err) {
                    console.error("Failed to delete local file:", filePath, err);
                }
            }
        });
        
        // 4. Delete the messages from Database
        const deleteResult = await Message.deleteMany({ _id: { $in: messagesToDelete.map(m => m._id) } });
        
        res.json({ 
            success: true, 
            deletedCount: deleteResult.deletedCount, 
            filesDeleted: deletedFilesCount,
            inactiveRoomsCleaned: messagesToDelete.length
        });
    } catch (err) {
        console.error("Cleanup Error:", err);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

// --- Admin Routes ---
router.post('/admin/role', async (req, res) => {
    const { roomCode, targetId, action } = req.body; // action: 'editor', 'converser', 'block', 'reset'
    const adminId = req.headers.deviceid;
    
    if (!roomCode || !targetId || !action) return res.status(400).json({ error: 'Missing data' });

    const perm = await Permission.findOne({ roomCode });
    
    if (!perm || perm.admin !== adminId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    if (perm.admin === targetId) {
        return res.status(400).json({ error: 'Cannot modify admin' });
    }

    // Clean current roles for target
    perm.editors = perm.editors.filter(id => id !== targetId);
    perm.conversers = perm.conversers.filter(id => id !== targetId);
    perm.blocked = perm.blocked.filter(id => id !== targetId);
    perm.viewers = perm.viewers.filter(id => id !== targetId);

    if (action === 'editor') perm.editors.push(targetId);
    if (action === 'converser') perm.conversers.push(targetId);
    if (action === 'block') perm.blocked.push(targetId);
    if (action === 'reset') perm.viewers.push(targetId);
    
    await perm.save();

    const io = require('../utils/socket').getIO();

    // If blocked, forcefully disconnect their active sockets in that room
    if (action === 'block') {
        const socketUtils = require('../utils/socket');
        const activeUsers = socketUtils.getActiveUsers();
        for (const [socketId, user] of activeUsers.entries()) {
            if (user.deviceId === targetId && user.roomCode === roomCode) {
                const targetSocket = io.sockets.sockets.get(socketId);
                if (targetSocket) {
                    targetSocket.emit('access_denied', { reason: 'blocked' });
                    targetSocket.disconnect(true);
                }
            }
        }
    }

    // Broadcast updates
    require('../utils/socket').broadcastActiveUsers(roomCode);
    io.to(`admin_channel_${roomCode}`).emit('blocked_users_update', perm.blocked);
    io.to(roomCode).emit('role_update', { targetId, action });

    res.json({ success: true });
});

router.get('/admin/blocked', async (req, res) => {
    const adminId = req.headers.deviceid;
    const roomCode = req.query.roomCode;
    if (!roomCode) return res.status(400).json({ error: 'Missing roomCode' });

    const perm = await Permission.findOne({ roomCode });
    if (!perm || perm.admin !== adminId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    res.json({ success: true, blocked: perm.blocked });
});

module.exports = router;
