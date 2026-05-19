const dns = require('dns');
// Set Google & Cloudflare DNS to avoid network resolution issues
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require('dotenv').config();

// Global Admin Code (use env var or generate one for this session)
global.SERVER_ADMIN_CODE = process.env.ADMIN_CODE || Math.floor(100000 + Math.random() * 900000).toString();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const socketUtils = require('./utils/socket');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

// Enable Cross-Origin Resource Sharing and JSON parsing
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
console.log("Connecting to database...");
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Database connected'))
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

// Setup real-time implementation
socketUtils.init(server);

// API Routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🛡️  [ADMIN KEY]   ${global.SERVER_ADMIN_CODE}`);
});
