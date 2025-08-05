const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Feedback = require('../models/Feedback');
const Website = require('../models/Website');
const FeedbackAnalysisService = require('../services/feedbackAnalysisService');

const router = express.Router();

// Initialize the feedback analysis service
const feedbackAnalysisService = new FeedbackAnalysisService();

// @route   POST /api/feedback/submit/:websiteId
// @desc    Submit feedback for a website (public endpoint)
// @access  Public
router.post('/submit/:websiteId', [
  body('rating.overall').isInt({ min: 1, max: 5 }).withMessage('Overall rating must be between 1 and 5'),
  body('comments.general').optional().isLength({ max: 2000 }).withMessage('General comment too long'),
  body('submitter.name').optional().isLength({ max: 100 }).withMessage('Name too long'),
  body('submitter.email').optional().isEmail().withMessage('Invalid email format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { websiteId } = req.params;
    const feedbackData = req.body;

    // Verify website exists and is published
    const website = await Website.findOne({
      _id: websiteId,
      status: 'published'
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found or not published' });
    }

    // Create feedback record
    const feedback = new Feedback({
      websiteId,
      userId: website.userId,
      rating: feedbackData.rating,
      comments: feedbackData.comments || {},
      submitter: {
        name: feedbackData.submitter?.name || '',
        email: feedbackData.submitter?.email || '',
        isAnonymous: !feedbackData.submitter?.name && !feedbackData.submitter?.email
      },
      metadata: {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        referrer: req.get('Referer'),
        sessionId: req.sessionID,
        timeOnSite: feedbackData.metadata?.timeOnSite || 0,
        pagesViewed: feedbackData.metadata?.pagesViewed || 1,
        deviceType: this.detectDeviceType(req.get('User-Agent')),
        browserInfo: this.parseBrowserInfo(req.get('User-Agent'))
      }
    });

    await feedback.save();

    // Analyze feedback with AI (async)
    this.analyzeFeedbackAsync(feedback._id);

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedbackId: feedback._id,
      thankYou: 'Thank you for your valuable feedback!'
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

// @route   GET /api/feedback/website/:websiteId
// @desc    Get feedback for a website
// @access  Private
router.get('/website/:websiteId', auth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { page = 1, limit = 20, status, sentiment } = req.query;

    // Verify website ownership
    const website = await Website.findOne({
      _id: websiteId,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    // Build query
    const query = { websiteId, isSpam: false };
    if (status) query.status = status;
    if (sentiment) query['aiAnalysis.sentiment.overall'] = sentiment;

    // Get feedback with pagination
    const skip = (page - 1) * limit;
    const feedback = await Feedback.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-metadata.ipAddress'); // Hide sensitive data

    const total = await Feedback.countDocuments(query);

    // Get analytics
    const analytics = await Feedback.getWebsiteAnalytics(websiteId);

    res.json({
      feedback,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      analytics: analytics[0] || {
        totalFeedback: 0,
        averageRating: 0,
        sentimentCounts: {}
      }
    });
  } catch (error) {
    console.error('Error getting website feedback:', error);
    res.status(500).json({ message: 'Failed to get feedback' });
  }
});

// @route   GET /api/feedback/:id
// @desc    Get specific feedback details
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    // Verify website ownership
    const website = await Website.findOne({
      _id: feedback.websiteId,
      userId: req.user.id
    });

    if (!website) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(feedback);
  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({ message: 'Failed to get feedback' });
  }
});

// @route   PUT /api/feedback/:id/status
// @desc    Update feedback status
// @access  Private
router.put('/:id/status', auth, [
  body('status').isIn(['pending', 'processed', 'reviewed', 'addressed', 'archived']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    // Verify website ownership
    const website = await Website.findOne({
      _id: feedback.websiteId,
      userId: req.user.id
    });

    if (!website) {
      return res.status(403).json({ message: 'Access denied' });
    }

    feedback.status = req.body.status;
    await feedback.save();

    res.json({
      message: 'Feedback status updated',
      feedback
    });
  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({ message: 'Failed to update feedback status' });
  }
});

// @route   POST /api/feedback/:id/respond
// @desc    Respond to feedback
// @access  Private
router.post('/:id/respond', auth, [
  body('message').notEmpty().withMessage('Response message is required').isLength({ max: 1000 }).withMessage('Response too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    // Verify website ownership
    const website = await Website.findOne({
      _id: feedback.websiteId,
      userId: req.user.id
    });

    if (!website) {
      return res.status(403).json({ message: 'Access denied' });
    }

    feedback.response = {
      message: req.body.message,
      respondedAt: new Date(),
      respondedBy: req.user.id
    };
    feedback.status = 'addressed';
    await feedback.save();

    res.json({
      message: 'Response added successfully',
      feedback
    });
  } catch (error) {
    console.error('Error responding to feedback:', error);
    res.status(500).json({ message: 'Failed to respond to feedback' });
  }
});

// @route   GET /api/feedback/website/:websiteId/analytics
// @desc    Get detailed feedback analytics
// @access  Private
router.get('/website/:websiteId/analytics', auth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { dateRange = 30 } = req.query;

    // Verify website ownership
    const website = await Website.findOne({
      _id: websiteId,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    // Get comprehensive analytics
    const [analytics, trendingTopics, recentFeedback] = await Promise.all([
      Feedback.getWebsiteAnalytics(websiteId, parseInt(dateRange)),
      Feedback.getTrendingTopics(websiteId),
      Feedback.find({ websiteId, isSpam: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('rating comments.general aiAnalysis.sentiment createdAt')
    ]);

    // Generate summary insights
    const allFeedback = await Feedback.find({
      websiteId,
      isSpam: false,
      'comments.general': { $exists: true, $ne: '' }
    }).limit(50);

    const summaryInsights = await feedbackAnalysisService.generateSummaryInsights(allFeedback);

    res.json({
      analytics: analytics[0] || {},
      trendingTopics,
      recentFeedback,
      summaryInsights,
      dateRange: parseInt(dateRange)
    });
  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    res.status(500).json({ message: 'Failed to get feedback analytics' });
  }
});

// @route   GET /api/feedback/form/:websiteId
// @desc    Get feedback form for a website (public)
// @access  Public
router.get('/form/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;

    // Verify website exists and is published
    const website = await Website.findOne({
      _id: websiteId,
      status: 'published'
    }).select('businessInfo.name businessInfo.industry');

    if (!website) {
      return res.status(404).json({ message: 'Website not found or not published' });
    }

    res.json({
      websiteId,
      websiteName: website.businessInfo.name,
      industry: website.businessInfo.industry,
      formConfig: {
        ratings: [
          { key: 'overall', label: 'Overall Experience', required: true },
          { key: 'design', label: 'Design & Appearance', required: false },
          { key: 'usability', label: 'Ease of Use', required: false },
          { key: 'content', label: 'Content Quality', required: false },
          { key: 'performance', label: 'Loading Speed', required: false }
        ],
        comments: [
          { key: 'general', label: 'General Feedback', placeholder: 'Share your overall thoughts...', maxLength: 2000 },
          { key: 'likes', label: 'What did you like?', placeholder: 'Tell us what worked well...', maxLength: 1000 },
          { key: 'improvements', label: 'What could be improved?', placeholder: 'Suggest improvements...', maxLength: 1000 },
          { key: 'suggestions', label: 'Additional Suggestions', placeholder: 'Any other suggestions?', maxLength: 1000 }
        ]
      }
    });
  } catch (error) {
    console.error('Error getting feedback form:', error);
    res.status(500).json({ message: 'Failed to get feedback form' });
  }
});

// Helper methods
router.detectDeviceType = function(userAgent) {
  if (!userAgent) return 'unknown';
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    return /iPad/.test(userAgent) ? 'tablet' : 'mobile';
  }
  return 'desktop';
};

router.parseBrowserInfo = function(userAgent) {
  if (!userAgent) return { name: 'unknown', version: 'unknown' };
  
  const browsers = [
    { name: 'Chrome', regex: /Chrome\/(\d+)/ },
    { name: 'Firefox', regex: /Firefox\/(\d+)/ },
    { name: 'Safari', regex: /Safari\/(\d+)/ },
    { name: 'Edge', regex: /Edge\/(\d+)/ }
  ];

  for (const browser of browsers) {
    const match = userAgent.match(browser.regex);
    if (match) {
      return { name: browser.name, version: match[1] };
    }
  }

  return { name: 'unknown', version: 'unknown' };
};

// Async feedback analysis
router.analyzeFeedbackAsync = async function(feedbackId) {
  try {
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) return;

    const analysis = await feedbackAnalysisService.analyzeFeedback({
      rating: feedback.rating,
      comments: feedback.comments
    });

    feedback.aiAnalysis = analysis;
    feedback.status = 'processed';
    await feedback.save();

    console.log(`Feedback ${feedbackId} analyzed successfully`);
  } catch (error) {
    console.error(`Error analyzing feedback ${feedbackId}:`, error);
  }
};

module.exports = router;
