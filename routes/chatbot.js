const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const { chatbotService, CHATBOT_TYPES } = require('../services/chatbotService');
const User = require('../models/User');

const router = express.Router();

// Store for chat sessions and history
const chatSessions = new Map();

// @route   POST /api/chatbot/message
// @desc    Send message to chatbot and get response
// @access  Private
router.post('/message', auth, [
  body('message').notEmpty().withMessage('Message is required'),
  body('sessionId').optional().isString(),
  body('chatbotType').optional().isIn(Object.values(CHATBOT_TYPES))
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      message,
      sessionId = `session_${req.user.id}_${Date.now()}`,
      chatbotType = null
    } = req.body;

    // Get user's business info
    const user = await User.findById(req.user.id);
    const businessInfo = user.businessProfile;

    if (!businessInfo.businessName) {
      return res.status(400).json({
        message: 'Please complete your business profile first to use the chatbot'
      });
    }

    // Process message through chatbot service with smart routing
    const response = await chatbotService.processMessage(
      sessionId,
      message,
      businessInfo,
      chatbotType,
      req.user.id
    );

    // Store interaction in session history
    if (!chatSessions.has(sessionId)) {
      chatSessions.set(sessionId, []);
    }

    const sessionHistory = chatSessions.get(sessionId);
    sessionHistory.push({
      userMessage: message,
      botResponse: response.response,
      chatbotType: response.chatbotType,
      timestamp: response.timestamp,
      userId: req.user.id
    });

    res.json({
      message: 'Message processed successfully',
      response: response.response,
      sessionId: response.sessionId,
      chatbotType: response.chatbotType,
      capabilities: response.capabilities,
      timestamp: response.timestamp,
      error: response.error || false
    });
  } catch (error) {
    console.error('Chatbot message error:', error);
    res.status(500).json({
      message: 'Failed to process chatbot message',
      error: error.message
    });
  }
});

// @route   GET /api/chatbot/history/:sessionId
// @desc    Get chat history for a session
// @access  Private
router.get('/history/:sessionId', auth, (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = chatSessions.get(sessionId) || [];
    
    // Filter history for the current user
    const userHistory = history.filter(interaction => 
      interaction.userId === req.user.id
    );

    res.json({
      sessionId,
      history: userHistory,
      messageCount: userHistory.length
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ message: 'Failed to fetch chat history' });
  }
});

// @route   DELETE /api/chatbot/history/:sessionId
// @desc    Clear chat history for a session
// @access  Private
router.delete('/history/:sessionId', auth, (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Clear from chatbot service
    chatbotService.clearConversationHistory(sessionId);
    
    // Clear from local storage
    chatSessions.delete(sessionId);

    res.json({ 
      message: 'Chat history cleared successfully',
      sessionId 
    });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ message: 'Failed to clear chat history' });
  }
});

// @route   POST /api/chatbot/faq/generate
// @desc    Generate FAQ using AI based on business info
// @access  Private
router.post('/faq/generate', auth, async (req, res) => {
  try {
    // Get user's business info
    const user = await User.findById(req.user.id);
    const businessInfo = user.businessProfile;

    if (!businessInfo.businessName) {
      return res.status(400).json({ 
        message: 'Please complete your business profile first' 
      });
    }

    // Generate FAQ using chatbot service
    const faq = await chatbotService.generateFAQ(businessInfo);

    res.json({
      message: 'FAQ generated successfully',
      faq,
      count: faq.length
    });
  } catch (error) {
    console.error('Error generating FAQ:', error);
    res.status(500).json({ 
      message: 'Failed to generate FAQ',
      error: error.message 
    });
  }
});

// @route   POST /api/chatbot/training/generate
// @desc    Generate training data for chatbot
// @access  Private
router.post('/training/generate', auth, async (req, res) => {
  try {
    const { existingFAQ = [] } = req.body;
    
    // Get user's business info
    const user = await User.findById(req.user.id);
    const businessInfo = user.businessProfile;

    if (!businessInfo.businessName) {
      return res.status(400).json({ 
        message: 'Please complete your business profile first' 
      });
    }

    // Generate training data using chatbot service
    const trainingData = await chatbotService.generateTrainingData(
      businessInfo, 
      existingFAQ
    );

    res.json({
      message: 'Training data generated successfully',
      trainingData,
      count: trainingData.length
    });
  } catch (error) {
    console.error('Error generating training data:', error);
    res.status(500).json({ 
      message: 'Failed to generate training data',
      error: error.message 
    });
  }
});

// @route   POST /api/chatbot/analyze
// @desc    Analyze chat interactions for insights
// @access  Private
router.post('/analyze', auth, async (req, res) => {
  try {
    const { sessionIds = [] } = req.body;
    
    // Collect interactions from specified sessions
    let allInteractions = [];
    
    if (sessionIds.length > 0) {
      sessionIds.forEach(sessionId => {
        const sessionHistory = chatSessions.get(sessionId) || [];
        const userInteractions = sessionHistory.filter(interaction => 
          interaction.userId === req.user.id
        );
        allInteractions = allInteractions.concat(userInteractions);
      });
    } else {
      // Analyze all user's interactions
      chatSessions.forEach((sessionHistory) => {
        const userInteractions = sessionHistory.filter(interaction => 
          interaction.userId === req.user.id
        );
        allInteractions = allInteractions.concat(userInteractions);
      });
    }

    if (allInteractions.length === 0) {
      return res.status(400).json({ 
        message: 'No chat interactions found to analyze' 
      });
    }

    // Analyze interactions using chatbot service
    const analysis = await chatbotService.analyzeChatInteractions(allInteractions);

    res.json({
      message: 'Chat interactions analyzed successfully',
      analysis,
      interactionCount: allInteractions.length
    });
  } catch (error) {
    console.error('Error analyzing chat interactions:', error);
    res.status(500).json({ 
      message: 'Failed to analyze chat interactions',
      error: error.message 
    });
  }
});

// @route   POST /api/chatbot/switch-type
// @desc    Switch chatbot type for a session
// @access  Private
router.post('/switch-type', auth, [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('chatbotType').isIn(Object.values(CHATBOT_TYPES)).withMessage('Invalid chatbot type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { sessionId, chatbotType } = req.body;

    // Get user's business info
    const user = await User.findById(req.user.id);
    const businessInfo = user.businessProfile;

    // Switch chatbot type
    const success = await chatbotService.switchChatbotType(sessionId, chatbotType, businessInfo);

    if (!success) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({
      message: 'Chatbot type switched successfully',
      sessionId,
      newChatbotType: chatbotType
    });
  } catch (error) {
    console.error('Error switching chatbot type:', error);
    res.status(500).json({
      message: 'Failed to switch chatbot type',
      error: error.message
    });
  }
});

// @route   GET /api/chatbot/sessions
// @desc    Get all chat sessions for the user
// @access  Private
router.get('/sessions', auth, (req, res) => {
  try {
    const userSessions = [];

    chatSessions.forEach((sessionHistory, sessionId) => {
      const userInteractions = sessionHistory.filter(interaction =>
        interaction.userId === req.user.id
      );

      if (userInteractions.length > 0) {
        const lastInteraction = userInteractions[userInteractions.length - 1];
        const chatbotType = chatbotService.getSessionChatbotType(sessionId);

        userSessions.push({
          sessionId,
          chatbotType,
          messageCount: userInteractions.length,
          lastActivity: lastInteraction.timestamp,
          preview: userInteractions[0].userMessage.substring(0, 50) + '...'
        });
      }
    });

    // Sort by last activity
    userSessions.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    res.json({
      sessions: userSessions,
      totalSessions: userSessions.length
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ message: 'Failed to fetch chat sessions' });
  }
});

// @route   POST /api/chatbot/config
// @desc    Save chatbot configuration
// @access  Private
router.post('/config', auth, async (req, res) => {
  try {
    const { websiteId, ...config } = req.body;

    if (!websiteId) {
      return res.status(400).json({ message: 'Website ID is required' });
    }

    // Store configuration (in a real app, you'd save this to database)
    // For now, just return success
    res.json({
      message: 'Chatbot configuration saved successfully',
      config: { websiteId, ...config }
    });
  } catch (error) {
    console.error('Error saving chatbot config:', error);
    res.status(500).json({
      message: 'Failed to save chatbot configuration',
      error: error.message
    });
  }
});

// @route   GET /api/chatbot/config/:websiteId
// @desc    Get chatbot configuration
// @access  Private
router.get('/config/:websiteId', auth, async (req, res) => {
  try {
    const { websiteId } = req.params;

    // Return default configuration (in a real app, fetch from database)
    const defaultConfig = {
      botName: 'AI Assistant',
      welcomeMessage: 'Hello! How can I help you today?',
      fallbackMessage: "I'm sorry, I don't understand. Could you please rephrase your question?",
      responseDelay: 1000,
      maxResponseLength: 500,
      conversationTimeout: 30,
      tone: 'professional',
      language: 'en',
      useEmojis: false,
      includeBusinessInfo: true,
      includeServices: true,
      includeContactInfo: true,
      enableLearning: true,
      enableAnalytics: true,
      enableFeedback: true,
      primaryColor: '#6366f1',
      botAvatar: 'default',
      chatPosition: 'bottom-right'
    };

    res.json({
      message: 'Configuration retrieved successfully',
      config: defaultConfig
    });
  } catch (error) {
    console.error('Error getting chatbot config:', error);
    res.status(500).json({
      message: 'Failed to get chatbot configuration',
      error: error.message
    });
  }
});

// @route   GET /api/chatbot/types
// @desc    Get available chatbot types and their capabilities
// @access  Private
router.get('/types', auth, (req, res) => {
  try {
    const chatbotTypes = Object.entries(CHATBOT_TYPES).map(([key, value]) => ({
      id: value,
      name: key.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' '),
      description: getChatbotTypeDescription(value),
      capabilities: getChatbotCapabilities(value)
    }));

    res.json({
      message: 'Chatbot types retrieved successfully',
      chatbotTypes
    });
  } catch (error) {
    console.error('Error getting chatbot types:', error);
    res.status(500).json({ message: 'Failed to get chatbot types' });
  }
});

// @route   GET /api/chatbot/analytics/:websiteId
// @desc    Get chatbot analytics with multi-chatbot support
// @access  Private
router.get('/analytics/:websiteId', auth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { range = '7d', chatbotType = null } = req.query;

    // Get analytics from chatbot service
    const serviceAnalytics = chatbotService.getChatbotAnalytics(chatbotType);

    // Enhanced mock analytics data with multi-chatbot support
    const mockAnalytics = {
      overview: {
        totalConversations: serviceAnalytics.totalSessions || 1247,
        totalMessages: serviceAnalytics.messageCount || 8934,
        uniqueUsers: 892,
        avgResponseTime: 1.2,
        satisfactionScore: 4.3,
        resolutionRate: 87,
        chatbotTypeDistribution: serviceAnalytics.chatbotTypeDistribution || {
          [CHATBOT_TYPES.CUSTOMER_SERVICE]: 65,
          [CHATBOT_TYPES.BUSINESS_USAGE]: 25,
          [CHATBOT_TYPES.GENERAL_PURPOSE]: 10
        }
      },
      trends: {
        conversations: [
          { date: '2024-01-01', value: 45, customerService: 30, businessUsage: 10, generalPurpose: 5 },
          { date: '2024-01-02', value: 52, customerService: 35, businessUsage: 12, generalPurpose: 5 },
          { date: '2024-01-03', value: 38, customerService: 25, businessUsage: 8, generalPurpose: 5 },
          { date: '2024-01-04', value: 61, customerService: 40, businessUsage: 15, generalPurpose: 6 },
          { date: '2024-01-05', value: 49, customerService: 32, businessUsage: 12, generalPurpose: 5 },
          { date: '2024-01-06', value: 73, customerService: 48, businessUsage: 18, generalPurpose: 7 },
          { date: '2024-01-07', value: 67, customerService: 44, businessUsage: 16, generalPurpose: 7 }
        ]
      },
      topQuestions: [
        { question: 'What are your business hours?', count: 156, category: 'general', chatbotType: CHATBOT_TYPES.CUSTOMER_SERVICE },
        { question: 'How can I contact support?', count: 134, category: 'support', chatbotType: CHATBOT_TYPES.CUSTOMER_SERVICE },
        { question: 'What services do you offer?', count: 98, category: 'products', chatbotType: CHATBOT_TYPES.CUSTOMER_SERVICE },
        { question: 'Show me the sales analytics', count: 87, category: 'analytics', chatbotType: CHATBOT_TYPES.BUSINESS_USAGE },
        { question: 'What is artificial intelligence?', count: 76, category: 'education', chatbotType: CHATBOT_TYPES.GENERAL_PURPOSE }
      ],
      chatbotPerformance: {
        [CHATBOT_TYPES.CUSTOMER_SERVICE]: {
          satisfactionScore: 4.5,
          resolutionRate: 92,
          avgResponseTime: 1.1
        },
        [CHATBOT_TYPES.BUSINESS_USAGE]: {
          satisfactionScore: 4.2,
          resolutionRate: 88,
          avgResponseTime: 1.3
        },
        [CHATBOT_TYPES.GENERAL_PURPOSE]: {
          satisfactionScore: 4.0,
          resolutionRate: 75,
          avgResponseTime: 1.0
        }
      }
    };

    res.json({
      message: 'Analytics retrieved successfully',
      analytics: mockAnalytics,
      timeRange: range,
      chatbotType: chatbotType || 'all'
    });
  } catch (error) {
    console.error('Error getting chatbot analytics:', error);
    res.status(500).json({
      message: 'Failed to get chatbot analytics',
      error: error.message
    });
  }
});

// Helper functions
function getChatbotTypeDescription(type) {
  const descriptions = {
    [CHATBOT_TYPES.CUSTOMER_SERVICE]: 'Handles customer inquiries, support requests, and service-related questions with empathy and professionalism.',
    [CHATBOT_TYPES.BUSINESS_USAGE]: 'Assists with internal business operations, analytics, task management, and company policies.',
    [CHATBOT_TYPES.WEBSITE_GENERATION]: 'Expert assistant for website generation, business setup, and marketing automation workflows using MechXTech AI Business Toolkit.',
    [CHATBOT_TYPES.GENERAL_PURPOSE]: 'Provides general knowledge, educational content, and serves as a fallback for other chatbot types.'
  };
  return descriptions[type] || 'General purpose chatbot';
}

function getChatbotCapabilities(type) {
  const capabilities = {
    [CHATBOT_TYPES.CUSTOMER_SERVICE]: ['FAQ Access', 'Sentiment Analysis', 'Escalation', 'Order Tracking'],
    [CHATBOT_TYPES.BUSINESS_USAGE]: ['Analytics Access', 'Task Management', 'Policy Guidance', 'Business Insights'],
    [CHATBOT_TYPES.WEBSITE_GENERATION]: ['Website Generation', 'Marketing Automation', 'Campaign Management', 'Analytics Guidance', 'Business Optimization'],
    [CHATBOT_TYPES.GENERAL_PURPOSE]: ['General Knowledge', 'Education', 'Entertainment', 'Fallback Support']
  };
  return capabilities[type] || [];
}

module.exports = router;
