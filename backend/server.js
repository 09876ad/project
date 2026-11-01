const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const Booking = require('./models/Booking');

const app = express();
// Needed so req.ip reflects the client when deployed behind a proxy.
app.set('trust proxy', 1);
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

// Socket.io Authentication
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Not authorized, no token'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    next(new Error('Not authorized, token failed'));
  }
});

// A booking room is private to the customer and the worker on that booking.
const getAccessibleBooking = async (bookingId, userId) => {
  if (!mongoose.isValidObjectId(bookingId)) return null;
  const booking = await Booking.findById(bookingId).select('customerId workerId');
  if (!booking) return null;
  const uid = String(userId);
  if (String(booking.customerId) !== uid && String(booking.workerId) !== uid) return null;
  return booking;
};

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id, socket.user.role);

  socket.on('join_booking', async (bookingId) => {
    try {
      const booking = await getAccessibleBooking(bookingId, socket.user.id);
      if (!booking) return;
      socket.join(`booking_${bookingId}`);
    } catch (error) {
      console.error('join_booking error:', error.message);
    }
  });

  socket.on('update_location', async (data) => {
    try {
      const { bookingId, lat, lng } = data || {};
      if (!mongoose.isValidObjectId(bookingId)) return;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      // Only the assigned worker may broadcast their position for a booking.
      const booking = await getAccessibleBooking(bookingId, socket.user.id);
      if (!booking || String(booking.workerId) !== String(socket.user.id)) return;

      socket.to(`booking_${bookingId}`).emit('worker_moved', { lat, lng });
    } catch (error) {
      console.error('update_location error:', error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(' Client disconnected');
  });
});
