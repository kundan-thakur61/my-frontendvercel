require('dotenv').config();

const mongoose = require('mongoose');
const logger = require('./utils/logger');

// Export the app from app.js and only handle DB connect + listen here
const app = require('./app');

// Validate required environment variables early
const requiredEnvs = ['JWT_SECRET', 'MONGO_URI', 'FRONTEND_URL'];
const missingEnvs = requiredEnvs.filter((k) => !process.env[k]);
if (missingEnvs.length) {
  logger.error('Missing required environment variables: ' + missingEnvs.join(', '));
  if (process.env.NODE_ENV === 'development') {
    if (missingEnvs.includes('JWT_SECRET')) {
      throw new Error(
        'Missing environment variable JWT_SECRET. Create a file `backend/.env` and set a strong JWT_SECRET (e.g. JWT_SECRET=your_long_random_secret).'
      );
    }
    logger.warn('Continuing in development despite missing env vars: ' + missingEnvs.join(', '));
  } else {
    process.exit(1);
  }
}

// Database connection
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mobile-cover-ecommerce', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error:', err));
} else {
  logger.info('Test environment detected: skipping automatic MongoDB connect');
}

// Only start the server when not running tests. Tests import the app
// and start their own server or call routes directly via supertest.
let io;
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 4000;
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  // Socket.io setup
  const socketio = require('socket.io');
  io = socketio(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST']
    }
  });

  // Basic connection event
  io.on('connection', (socket) => {
    logger.info('Socket connected: ' + socket.id);
    socket.on('disconnect', () => {
      logger.info('Socket disconnected: ' + socket.id);
    });
  });

  // Export io for use in controllers
  module.exports.io = io;
} else {
  logger.info('Test environment detected: skipping app.listen');
}

module.exports = app;