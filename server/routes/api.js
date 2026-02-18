const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Message = require('../models/Message');

// Cloudinary configuration for file storage
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup Multer to store uploaded files directly in Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'live-drop',
    resource_type: 'auto', // Support all file types (images, pdfs, etc.)
  },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Join a room and fetch its history
router.post('/room/join', async (req, res) => {
  const { roomCode } = req.body;
  if (!roomCode) return res.status(400).json({ error: 'Room code is required' });
  
  try {
    const messages = await Message.find({ roomCode }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Handle file uploads
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Return the Cloudinary URL so the client can broadcast it
  res.json({
    fileUrl: req.file.path,
    publicId: req.file.filename
  });
});

// Save a new message (text or file) to the database
router.post('/message', async (req, res) => {
    const { roomCode, type, content, fileUrl, publicId } = req.body;
    try {
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
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ error: 'Message not found' });

        // If it's a file, remove it from Cloudinary storage first
        if (message.type === 'file' && message.publicId) {
            await cloudinary.uploader.destroy(message.publicId);
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
// Removes rooms where the last activity was more than 2 hours ago
router.get('/cleanup', async (req, res) => {
    try {
        const threshold = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
        
        // 1. Find all rooms that have had activity (created messages) AFTER the threshold
        // These are the "active" rooms we want to KEEP.
        const activeRoomCodes = await Message.distinct('roomCode', { createdAt: { $gte: threshold } });
        
        // 2. Find all messages that belong to rooms NOT in the active list
        // These are messages in "inactive" rooms.
        const messagesToDelete = await Message.find({ roomCode: { $nin: activeRoomCodes } });
        
        if (messagesToDelete.length === 0) {
            return res.json({ success: true, deletedCount: 0, cloudinaryDeleted: 0, message: "No inactive rooms found" });
        }

        // 3. Clean up Cloudinary assets for these messages
        const fileMessages = messagesToDelete.filter(m => m.type === 'file' && m.publicId);
        const publicIds = fileMessages.map(m => m.publicId);
        
        if (publicIds.length > 0) {
            // Cloudinary delete_resources accepts a maximum of 100/1000 public_ids per call
            // Handling in chunks if necessary (simplified here)
            await cloudinary.api.delete_resources(publicIds);
        }
        
        // 4. Delete the messages from Database
        const deleteResult = await Message.deleteMany({ _id: { $in: messagesToDelete.map(m => m._id) } });
        
        res.json({ 
            success: true, 
            deletedCount: deleteResult.deletedCount, 
            cloudinaryDeleted: publicIds.length,
            inactiveRoomsCleaned: messagesToDelete.length
        });
    } catch (err) {
        console.error("Cleanup Error:", err);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

module.exports = router;
