const express = require('express');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Store connected users
const users = {};

// Generate a unique 16-character alphanumeric ID
const generateUserId = () => {
  return uuidv4().replace(/-/g, '').substring(0, 16);
};

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Assign a unique ID and name to the user
  socket.on('join', (name) => {
    const userId = generateUserId();
    users[userId] = { id: userId, name: name, socketId: socket.id };
    socket.userId = userId;

    // Notify the user of their ID
    socket.emit('welcome', { userId, name });

    // Notify all users of the new user
    io.emit('userJoined', { userId, name });
  });

  // Handle chat messages
  socket.on('chatMessage', (data) => {
    const { message, toUserId } = data;
    const sender = users[socket.userId];

    if (toUserId) {
      // Send private message to a specific user
      const recipient = users[toUserId];
      if (recipient) {
        io.to(recipient.socketId).emit('message', {
          userId: sender.id,
          name: sender.name,
          message: `(Private) ${message}`,
        });
      }
    } else {
      // Broadcast message to everyone
      io.emit('message', { userId: sender.id, name: sender.name, message });
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const user = users[socket.userId];
    if (user) {
      console.log('A user disconnected:', user.name);
      delete users[socket.userId];
      io.emit('userLeft', { userId: user.id, name: user.name });
    }
  });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});