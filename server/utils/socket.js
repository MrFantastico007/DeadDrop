const socketIO = require('socket.io');
const Permission = require('../models/Permission');

let io;
const activeUsers = new Map(); // socket.id -> { deviceId, ip }

async function getRoleForDevice(deviceId, roomCode) {
    if (!deviceId || !roomCode) return 'viewer';
    const perm = await Permission.findOne({ roomCode }) || { admin: null, editors: [], conversers: [], blocked: [], viewers: [] };
    if (perm.blocked.includes(deviceId)) return 'blocked';
    if (perm.admin === deviceId) return 'admin';
    if (perm.editors.includes(deviceId)) return 'editor';
    if (perm.conversers.includes(deviceId)) return 'converser';
    return 'viewer';
}

async function broadcastActiveUsers(roomCode) {
    if (!io || !roomCode) return;
    const usersInRoom = Array.from(activeUsers.values()).filter(u => u.roomCode === roomCode);
    
    const usersWithRoles = await Promise.all(
        usersInRoom.map(async (user) => ({
            ...user,
            role: await getRoleForDevice(user.deviceId, roomCode)
        }))
    );
    io.to(`admin_channel_${roomCode}`).emit('active_users_update', usersWithRoles);
}

module.exports = {
  init: (server) => {
    io = socketIO(server, {
      cors: {
        origin: "*", 
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      const ip = socket.handshake.address;

      socket.on('join_room', async (data) => {
        const roomCode = typeof data === 'string' ? data : data.roomCode;
        const deviceId = typeof data === 'object' ? data.deviceId : null;

        if (deviceId) {
            const role = await getRoleForDevice(deviceId, roomCode);
            if (role === 'blocked') {
                socket.emit('access_denied', { reason: 'blocked' });
                socket.disconnect(true);
                return;
            }
            activeUsers.set(socket.id, { deviceId, ip, roomCode });
            broadcastActiveUsers(roomCode);
        }

        socket.join(roomCode);
      });

      socket.on('join_admin_channel', async ({ deviceId, roomCode }) => {
        const role = await getRoleForDevice(deviceId, roomCode);
        if (role === 'admin') {
            socket.join(`admin_channel_${roomCode}`);
            broadcastActiveUsers(roomCode);
            const perm = await Permission.findOne({ roomCode }) || { blocked: [] };
            socket.emit('blocked_users_update', perm.blocked);
        }
      });

      socket.on('send_message', (data) => {
        io.to(data.roomCode).emit('receive_message', data);
      });

      socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            activeUsers.delete(socket.id);
            broadcastActiveUsers(user.roomCode);
        }
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
  },
  getActiveUsers: () => activeUsers,
  broadcastActiveUsers
};
