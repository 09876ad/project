const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workers', require('./routes/worker'));
app.use('/api/services', require('./routes/services'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/upload', require('./routes/upload'));

// --- CHECKUP: Is .env file working? ---
console.log('🔍 Checking .env file...');
console.log('PORT found:', process.env.PORT);
console.log('MONGO_URI found:', !!process.env.MONGO_URI);

// Database Connection
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully!'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err.message));
} else {
  console.log('⚠️  MONGO_URI is missing. Database will not connect.');
}

// Basic Route
app.get('/', (req, res) => {
  res.json({
    message: 'Cooperative Gig Platform API is running!',
    status: MONGO_URI ? 'Database Connected' : 'Database Not Connected'
  });
});

// Create HTTP server
const server = http.createServer(app);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`👉 Test it in your browser at: http://localhost:${PORT}`);
});

// Socket.io Setup
const socketOrigins = (process.env.SOCKET_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: socketOrigins,
    methods: ["GET", "POST"]
  }
});

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log('✅ Worker connected:', socket.id);

  socket.on('join_booking', (bookingId) => {
    socket.join(`booking_${bookingId}`);
    console.log(`Worker joined booking_${bookingId}`);
  });

  socket.on('update_location', (data) => {
    console.log('📍 Location update:', data);
    socket.to(`booking_${data.bookingId}`).emit('worker_moved', {
      lat: data.lat,
      lng: data.lng
    });
  });

  socket.on('disconnect', () => {
    console.log(' Worker disconnected');
  });
});
