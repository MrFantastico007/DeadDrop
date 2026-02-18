const socketIO = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    io = socketIO(server, {
      cors: {
        origin: "*", // Allow all origins for simplicity, in production should be specific
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('New client connected', socket.id);

      socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        console.log(`User ${socket.id} joined room: ${roomCode}`);
      });

      socket.on('send_message', (data) => {
        // data should contain: roomCode, type, content/fileUrl
        // Broadcast to everyone in the room INCLUDING sender (for immediate feedback confirmation if needed, 
        // though usually frontend handles optimistic UI, but here we broadcast to all)
        io.to(data.roomCode).emit('receive_message', data);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  }
};
