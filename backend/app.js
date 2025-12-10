const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const customRoutes = require('./routes/custom');
const uploadRoutes = require('./routes/uploads');
const customDesignRoutes = require('./routes/customDesigns');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');
const wishlistRoutes = require('./routes/wishlist');
const mobileRoutes = require('./routes/mobile');
const collectionRoutes = require('./routes/collections');

const app = express();

// Serve static files for uploads (accessible via both /uploads and /api/uploads for dev proxying)
app.use(['/uploads', '/api/uploads'], express.static(path.join(__dirname, 'public/uploads')));

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Disable ETag generation for API responses to avoid 304 Not Modified
// responses being returned by Express when clients send conditional
// requests. We also set no-store cache headers for API routes so
// APIs always return fresh 200 responses.
app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});
// Rate limiting (centralized in middleware/rateLimiter)
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/custom', customRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/custom-designs', customDesignRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/collections', collectionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
