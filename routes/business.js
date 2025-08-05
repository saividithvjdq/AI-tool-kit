const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');

const router = express.Router();

// @route   GET /api/business/profile
// @desc    Get business profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('businessProfile');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Business profile retrieved successfully',
      businessProfile: user.businessProfile || {}
    });
  } catch (error) {
    console.error('Error fetching business profile:', error);
    res.status(500).json({ message: 'Failed to fetch business profile' });
  }
});

// @route   PUT /api/business/profile
// @desc    Update business profile
// @access  Private
router.put('/profile', auth, [
  body('businessName').optional().trim().isLength({ min: 1, max: 100 }),
  body('industry').optional().trim().isLength({ max: 50 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('website').optional().isURL(),
  body('phone').optional().isMobilePhone(),
  body('address.email').optional().isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update business profile
    const businessProfileUpdates = req.body;
    user.businessProfile = { ...user.businessProfile, ...businessProfileUpdates };
    
    await user.save();

    res.json({
      message: 'Business profile updated successfully',
      businessProfile: user.businessProfile
    });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({ message: 'Failed to update business profile' });
  }
});

// @route   GET /api/business/industries
// @desc    Get list of available industries
// @access  Private
router.get('/industries', auth, (req, res) => {
  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Food & Beverage',
    'Real Estate',
    'Automotive',
    'Travel & Tourism',
    'Entertainment',
    'Fashion',
    'Beauty & Wellness',
    'Sports & Fitness',
    'Home & Garden',
    'Professional Services',
    'Manufacturing',
    'Construction',
    'Agriculture',
    'Non-profit',
    'Government',
    'Other'
  ];

  res.json({
    industries: industries.sort(),
    count: industries.length
  });
});

// @route   GET /api/business/templates
// @desc    Get business templates based on industry
// @access  Private
router.get('/templates', auth, (req, res) => {
  const { industry } = req.query;

  const templates = {
    'Technology': [
      {
        id: 'tech-startup',
        name: 'Tech Startup',
        description: 'Modern template for technology startups',
        features: ['Hero section', 'Product showcase', 'Team section', 'Contact form']
      },
      {
        id: 'saas-platform',
        name: 'SaaS Platform',
        description: 'Template for software-as-a-service businesses',
        features: ['Feature highlights', 'Pricing plans', 'Testimonials', 'Free trial CTA']
      }
    ],
    'Healthcare': [
      {
        id: 'medical-practice',
        name: 'Medical Practice',
        description: 'Professional template for healthcare providers',
        features: ['Services overview', 'Doctor profiles', 'Appointment booking', 'Patient resources']
      }
    ],
    'Retail': [
      {
        id: 'online-store',
        name: 'Online Store',
        description: 'E-commerce template for retail businesses',
        features: ['Product catalog', 'Shopping cart', 'Customer reviews', 'Payment integration']
      }
    ],
    'Food & Beverage': [
      {
        id: 'restaurant',
        name: 'Restaurant',
        description: 'Template for restaurants and cafes',
        features: ['Menu display', 'Online reservations', 'Location info', 'Photo gallery']
      }
    ],
    'default': [
      {
        id: 'business-general',
        name: 'General Business',
        description: 'Versatile template for any business type',
        features: ['About section', 'Services', 'Contact info', 'Social media links']
      }
    ]
  };

  const selectedTemplates = templates[industry] || templates['default'];

  res.json({
    industry: industry || 'default',
    templates: selectedTemplates,
    count: selectedTemplates.length
  });
});

// @route   POST /api/business/onboarding
// @desc    Complete business onboarding process
// @access  Private
router.post('/onboarding', auth, [
  body('businessName').notEmpty().withMessage('Business name is required'),
  body('industry').notEmpty().withMessage('Industry is required'),
  body('description').notEmpty().withMessage('Business description is required'),
  body('targetAudience').optional().isString(),
  body('keyServices').optional().isArray()
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
      businessName,
      industry,
      description,
      targetAudience,
      keyServices,
      contactInfo,
      socialMedia,
      preferences
    } = req.body;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update business profile with onboarding data
    user.businessProfile = {
      businessName,
      industry,
      description,
      targetAudience,
      keyServices: keyServices || [],
      contactInfo: contactInfo || {},
      socialMedia: socialMedia || {},
      onboardingCompleted: true,
      onboardingDate: new Date()
    };

    // Update user preferences if provided
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    // Send onboarding completion notification
    try {
      await NotificationService.notifyOnboardingComplete(user._id, user.businessProfile);
    } catch (notificationError) {
      console.error('Failed to send onboarding notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.json({
      message: 'Business onboarding completed successfully',
      businessProfile: user.businessProfile,
      nextSteps: [
        'Create your first website',
        'Set up marketing campaigns',
        'Configure your chatbot',
        'Analyze customer feedback'
      ]
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ message: 'Failed to complete onboarding' });
  }
});

// @route   GET /api/business/dashboard
// @desc    Get business dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mock dashboard data - in a real app, this would aggregate actual data
    const dashboardData = {
      businessInfo: {
        name: user.businessProfile?.businessName || 'Your Business',
        industry: user.businessProfile?.industry || 'Not specified',
        onboardingCompleted: user.businessProfile?.onboardingCompleted || false
      },
      quickStats: {
        websites: 0,
        campaigns: 0,
        chatbotInteractions: 0,
        feedbackAnalyzed: 0
      },
      recentActivity: [
        {
          type: 'account_created',
          message: 'Welcome to MechXTech--AI Business Toolkit!',
          timestamp: user.createdAt
        }
      ],
      recommendations: [
        {
          title: 'Complete Your Business Profile',
          description: 'Add more details to get better AI-generated content',
          action: 'complete_profile',
          priority: 'high'
        },
        {
          title: 'Create Your First Website',
          description: 'Use our AI website builder to establish your online presence',
          action: 'create_website',
          priority: 'medium'
        },
        {
          title: 'Set Up Marketing Automation',
          description: 'Start engaging with customers through AI-powered emails',
          action: 'setup_marketing',
          priority: 'medium'
        }
      ]
    };

    res.json({
      message: 'Dashboard data retrieved successfully',
      dashboard: dashboardData,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// @route   GET /api/business/settings
// @desc    Get business settings
// @access  Private
router.get('/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences subscription');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Business settings retrieved successfully',
      settings: {
        preferences: user.preferences || {},
        subscription: user.subscription || {},
        features: {
          websiteBuilder: true,
          marketingAutomation: true,
          aiChatbot: true,
          analyticsInsights: true,
          imageGeneration: true
        }
      }
    });
  } catch (error) {
    console.error('Error fetching business settings:', error);
    res.status(500).json({ message: 'Failed to fetch business settings' });
  }
});

// @route   PUT /api/business/settings
// @desc    Update business settings
// @access  Private
router.put('/settings', auth, async (req, res) => {
  try {
    const { preferences, notifications } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update preferences
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    // Update notification settings
    if (notifications) {
      user.preferences.notifications = { ...user.preferences.notifications, ...notifications };
    }

    await user.save();

    res.json({
      message: 'Business settings updated successfully',
      settings: {
        preferences: user.preferences,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Error updating business settings:', error);
    res.status(500).json({ message: 'Failed to update business settings' });
  }
});

module.exports = router;
