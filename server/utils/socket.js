const socketIO = require('socket.io');
const Permission = require('../models/Permission');

let io;
const activeUsers = new Map(); // socket.id -> { deviceId, ip }

async function getRoleForDevice(deviceId) {
    if (!deviceId) return 'viewer';
    const perm = await Permission.findOne({ singleton: 'GLOBAL' }) || { admins: [], editors: [], conversers: [], blocked: [] };
    if (perm.blocked.includes(deviceId)) return 'blocked';
    if (perm.admins.includes(deviceId)) return 'admin';
    if (perm.editors.includes(deviceId)) return 'editor';
    if (perm.conversers.includes(deviceId)) return 'converser';
    return 'viewer';
}

async function broadcastActiveUsers() {
    if (!io) return;
    const usersWithRoles = await Promise.all(
        Array.from(activeUsers.values()).map(async (user) => ({
            ...user,
            role: await getRoleForDevice(user.deviceId)
        }))
    );
    io.to('admin_channel').emit('active_users_update', usersWithRoles);
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
            const role = await getRoleForDevice(deviceId);
            if (role === 'blocked') {
                socket.emit('access_denied', { reason: 'blocked' });
                socket.disconnect(true);
                return;
            }
            activeUsers.set(socket.id, { deviceId, ip });
            broadcastActiveUsers();
        }

        socket.join(roomCode);
      });

      socket.on('join_admin_channel', async (deviceId) => {
        const role = await getRoleForDevice(deviceId);
        if (role === 'admin') {
            socket.join('admin_channel');
            broadcastActiveUsers();
            const perm = await Permission.findOne({ singleton: 'GLOBAL' }) || { blocked: [] };
            socket.emit('blocked_users_update', perm.blocked);
        }
      });

      socket.on('send_message', (data) => {
        io.to(data.roomCode).emit('receive_message', data);
      });

      socket.on('disconnect', () => {
        activeUsers.delete(socket.id);
        broadcastActiveUsers();
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
