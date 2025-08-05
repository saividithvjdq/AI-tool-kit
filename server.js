require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const agentCoordinator = require('./services/agentCoordinator');
const websiteAnalyticsService = require('./services/websiteAnalyticsService');
const websocketService = require('./services/websocketService');

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files for generated images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-business-toolkit')
.then(async () => {
  console.log('✅ MongoDB connected successfully');

  // Initialize stock images
  const stockImageService = require('./services/stockImageService');
  await stockImageService.initializeDefaultImages();
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/websites', require('./routes/websites'));
app.use('/api/marketing', require('./routes/marketing'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/chatbot', require('./routes/chatbot'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/images', require('./routes/images'));
app.use('/api/business', require('./routes/business'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/emails', require('./routes/emails'));
app.use('/api/email-lists', require('./routes/emailLists'));

// Agent Routes
app.use('/api/agents/website-generator', require('./agents/websiteGeneratorAgent').router);
app.use('/api/agents/image-generator', require('./agents/imageGeneratorAgent').router);
app.use('/api/agents/marketing-agent', require('./agents/marketingAgent').router);
app.use('/api/agents/analytics-agent', require('./agents/analyticsAgent').router);

// Public website routes (must be last to avoid conflicts with API routes)
app.use('/', require('./routes/public'));

// System status endpoint
app.get('/api/system/status', async (req, res) => {
  try {
    const systemStatus = await agentCoordinator.getSystemStatus();
    res.json(systemStatus);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get system status',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = await agentCoordinator.healthCheck();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      agents: health
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

// Initialize WebSocket service
websocketService.initialize(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API available at: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket available at: ws://localhost:${PORT}/ws/chat`);
  console.log(`🔧 Nodemon hot reloading: ACTIVE - ${new Date().toLocaleTimeString()} - MARKETING ENHANCED`);

  // Start real-time analytics simulation
  setTimeout(() => {
    websiteAnalyticsService.startRealTimeSimulation();
    console.log(`📊 Real-time analytics simulation started`);
  }, 5000); // Wait 5 seconds for database connection

  // Start periodic cleanup of inactive WebSocket sessions
  setInterval(() => {
    websocketService.cleanupInactiveSessions();
  }, 10 * 60 * 1000); // Every 10 minutes
});
