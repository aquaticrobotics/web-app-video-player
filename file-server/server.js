const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs-extra');
const config = require('./config/config.json');

// Import routes
const authRoutes = require('./src/routes/auth');
const videoRoutes = require('./src/routes/videos');
const streamRoutes = require('./src/routes/stream');

// Import services
const videoService = require('./src/services/videoService');

// Import enhanced security middleware
const security = require('./src/middleware/security');

const app = express();

// Trust proxy for accurate IP detection (important for rate limiting)
app.set('trust proxy', 1);

// Enhanced security middleware
app.use(security.helmet);
app.use(security.securityHeaders);
app.use(security.securityLogger);
app.use(security.blockAttacks);
app.use(security.requestSizeLimit);
app.use(security.sanitizeInput);

// Apply rate limiting based on route patterns
app.use('/auth', security.rateLimits.auth);
app.use('/api', security.rateLimits.api);
app.use('/api/stream', security.rateLimits.stream);
app.use(security.rateLimits.general);

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for thumbnails
// Use absolute path if provided, otherwise relative to __dirname
const thumbnailPath = path.isAbsolute(config.thumbnailFolder)
  ? config.thumbnailFolder
  : path.join(__dirname, config.thumbnailFolder);
app.use('/thumbnails', express.static(thumbnailPath));

// Routes
app.use('/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/stream', streamRoutes);

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    videoService: {
      initialized: videoService.isInitialized,
      videoCount: videoService.getAllVideos().length
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    }
  };

  // In production, limit health check data
  if (process.env.NODE_ENV === 'production') {
    res.json({
      status: healthData.status,
      timestamp: healthData.timestamp,
      version: healthData.version,
      uptime: healthData.uptime
    });
  } else {
    res.json(healthData);
  }
});

// Security status endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/security-status', (req, res) => {
    res.json({
      securityFeatures: {
        helmet: true,
        rateLimiting: true,
        inputSanitization: true,
        securityHeaders: true,
        attackBlocking: true,
        securityLogging: true
      },
      rateLimits: {
        auth: '5 requests per 15 minutes',
        api: '100 requests per 15 minutes',
        stream: '30 requests per minute',
        general: '200 requests per 15 minutes'
      }
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Initialize server
async function startServer() {
  try {
    // Ensure directories exist
    await fs.ensureDir(config.thumbnailFolder);
    await fs.ensureDir(config.videoFolder);
    
    // Initialize video service
    console.log('Initializing video service...');
    await videoService.initialize();
    
    // Start server - bind to all network interfaces for network access
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`File server running on all interfaces port ${config.port}`);
      console.log(`Local access: http://localhost:${config.port}`);
      console.log(`Network access: http://10.0.0.100:${config.port}`);
      console.log(`Video folder: ${config.videoFolder}`);
      console.log(`Thumbnail folder: ${config.thumbnailFolder}`);
      console.log(`CORS origins: ${config.corsOrigins.join(', ')}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();