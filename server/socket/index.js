let io;

module.exports = (server) => {
  const socketIO = require('socket.io');
  io = socketIO(server, { cors: { origin: '*' } });
  
  io.on('connection', (socket) => {
    console.log('New client connected', socket.id);
    
    // User joins their private room for direct notifications
    socket.on('join_user', (userId) => {
      socket.join(userId);
      console.log(`Socket ${socket.id} joined user room ${userId}`);
    });

    socket.on('join_group', (groupId) => {
      socket.join(groupId);
      console.log(`Socket ${socket.id} joined group ${groupId}`);
    });
    
    socket.on('leave_group', (groupId) => {
      socket.leave(groupId);
      console.log(`Socket ${socket.id} left group ${groupId}`);
    });
    
    socket.on('disconnect', () => {
      console.log('Client disconnected', socket.id);
    });
  });

  return io;
};

module.exports.getIO = () => io;
