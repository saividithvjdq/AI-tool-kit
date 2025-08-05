const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const analyticsAIService = require('../services/analyticsAIService');
const websiteAnalyticsService = require('../services/websiteAnalyticsService');
const User = require('../models/User');
const Website = require('../models/Website');
const WebsiteAnalytics = require('../models/WebsiteAnalytics');
const {
  BusinessMetrics,
  AnalyticsReport,
  CustomerFeedback,
  KPITracking,
  CompetitiveAnalysis
} = require('../models/Analytics');

const router = express.Router();

// @route   POST /api/analytics/feedback/analyze
// @desc    Analyze customer feedback using AI
// @access  Private
router.post('/feedback/analyze', auth, [
  body('feedbackTexts').isArray().withMessage('Feedback texts must be an array'),
  body('feedbackTexts').isLength({ min: 1 }).withMessage('At least one feedback text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { feedbackTexts } = req.body;

    // Analyze feedback using AI service
    const analysis = await aiService.analyzeFeedback(feedbackTexts);

    res.json({
      message: 'Feedback analyzed successfully',
      analysis,
      feedbackCount: feedbackTexts.length,
      analyzedAt: new Date()
    });
  } catch (error) {
    console.error('Error analyzing feedback:', error);
    res.status(500).json({ 
      message: 'Failed to analyze feedback',
      error: error.message 
    });
  }
});

// @route   POST /api/analytics/insights/generate
// @desc    Generate business insights using AI
// @access  Private
router.post('/insights/generate', auth, async (req, res) => {
  try {
    const { additionalData = {} } = req.body;
    
    // Get user's business info
    const user = await User.findById(req.user.id);
    const businessInfo = user.businessProfile;

    if (!businessInfo.businessName) {
      return res.status(400).json({ 
        message: 'Please complete your business profile first' 
      });
    }

    // Prepare business data for analysis
    const businessData = {
      name: businessInfo.businessName,
      industry: businessInfo.industry,
      description: businessInfo.description,
      ...additionalData
    };

    // Generate insights using AI service
    const insights = await aiService.generateBusinessInsights(businessData);

    res.json({
      message: 'Business insights generated successfully',
      insights,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ 
      message: 'Failed to generate business insights',
      error: error.message 
    });
  }
});

// @route   POST /api/analytics/sentiment/analyze
// @desc    Analyze sentiment of text content
// @access  Private
router.post('/sentiment/analyze', auth, [
  body('texts').isArray().withMessage('Texts must be an array'),
  body('texts').isLength({ min: 1 }).withMessage('At least one text is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { texts } = req.body;

    // Analyze sentiment using AI service
    const sentimentAnalysis = await aiService.analyzeFeedback(texts);

    // Extract sentiment-specific data
    const sentimentResults = {
      overallSentiment: sentimentAnalysis.overallSentiment,
      sentimentBreakdown: sentimentAnalysis.sentimentBreakdown,
      confidenceScore: sentimentAnalysis.confidenceScore,
      summary: {
        positive: sentimentAnalysis.sentimentBreakdown?.filter(s => s.sentiment === 'positive').length || 0,
        negative: sentimentAnalysis.sentimentBreakdown?.filter(s => s.sentiment === 'negative').length || 0,
        neutral: sentimentAnalysis.sentimentBreakdown?.filter(s => s.sentiment === 'neutral').length || 0
      }
    };

    res.json({
      message: 'Sentiment analysis completed successfully',
      sentimentResults,
      textCount: texts.length,
      analyzedAt: new Date()
    });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({ 
      message: 'Failed to analyze sentiment',
      error: error.message 
    });
  }
});

// @route   GET /api/analytics/dashboard
// @desc    Get analytics dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    // This would typically fetch real analytics data from your database
    // For now, we'll return mock data structure
    const dashboardData = {
      overview: {
        totalWebsites: 0,
        totalCampaigns: 0,
        totalFeedback: 0,
        averageSentiment: 'neutral'
      },
      recentActivity: [],
      performanceMetrics: {
        websiteViews: 0,
        emailOpenRate: 0,
        customerSatisfaction: 0,
        conversionRate: 0
      },
      topInsights: [],
      sentimentTrend: []
    };

    res.json({
      message: 'Dashboard data retrieved successfully',
      dashboardData,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// @route   POST /api/analytics/report/generate
// @desc    Generate comprehensive analytics report
// @access  Private
router.post('/report/generate', auth, async (req, res) => {
  try {
    const { reportType = 'monthly', dateRange, includeInsights = true } = req.body;
    
    // Get user's business info
    const user = await User.findById(req.user.id);
    const businessInfo = user.businessProfile;

    if (!businessInfo.businessName) {
      return res.status(400).json({ 
        message: 'Please complete your business profile first' 
      });
    }

    // Mock report data - in a real app, this would aggregate actual data
    const reportData = {
      reportType,
      dateRange: dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      businessInfo: {
        name: businessInfo.businessName,
        industry: businessInfo.industry
      },
      metrics: {
        websitePerformance: {
          totalViews: 0,
          uniqueVisitors: 0,
          bounceRate: 0,
          averageSessionDuration: 0
        },
        marketingPerformance: {
          emailsSent: 0,
          openRate: 0,
          clickRate: 0,
          conversionRate: 0
        },
        customerFeedback: {
          totalFeedback: 0,
          averageSentiment: 'neutral',
          satisfactionScore: 0
        }
      },
      insights: includeInsights ? [] : null,
      recommendations: []
    };

    // Generate insights if requested
    if (includeInsights) {
      try {
        const insights = await aiService.generateBusinessInsights({
          name: businessInfo.businessName,
          industry: businessInfo.industry,
          reportData: reportData.metrics
        });
        reportData.insights = insights;
      } catch (insightError) {
        console.error('Error generating insights for report:', insightError);
        reportData.insights = { error: 'Failed to generate insights' };
      }
    }

    res.json({
      message: 'Analytics report generated successfully',
      report: reportData,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ 
      message: 'Failed to generate analytics report',
      error: error.message 
    });
  }
});

// @route   POST /api/analytics/trends/analyze
// @desc    Analyze trends in business data
// @access  Private
router.post('/trends/analyze', auth, [
  body('dataPoints').isArray().withMessage('Data points must be an array'),
  body('metric').notEmpty().withMessage('Metric type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { dataPoints, metric, timeframe = '30d' } = req.body;

    // Simple trend analysis
    const trendAnalysis = {
      metric,
      timeframe,
      dataPoints: dataPoints.length,
      trend: 'stable', // This would be calculated based on actual data
      changePercentage: 0,
      insights: [],
      recommendations: []
    };

    // Calculate basic trend if we have enough data points
    if (dataPoints.length >= 2) {
      const firstValue = dataPoints[0].value;
      const lastValue = dataPoints[dataPoints.length - 1].value;
      const change = ((lastValue - firstValue) / firstValue) * 100;
      
      trendAnalysis.changePercentage = Math.round(change * 100) / 100;
      
      if (change > 5) {
        trendAnalysis.trend = 'increasing';
      } else if (change < -5) {
        trendAnalysis.trend = 'decreasing';
      }
    }

    res.json({
      message: 'Trend analysis completed successfully',
      trendAnalysis,
      analyzedAt: new Date()
    });
  } catch (error) {
    console.error('Error analyzing trends:', error);
    res.status(500).json({ 
      message: 'Failed to analyze trends',
      error: error.message 
    });
  }
});

// @route   POST /api/analytics/metrics/record
// @desc    Record business metrics
// @access  Private
router.post('/metrics/record', auth, [
  body('metrics').isObject().withMessage('Metrics must be an object'),
  body('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { metrics, period = 'daily', date } = req.body;

    const businessMetrics = new BusinessMetrics({
      userId: req.user.id,
      metrics,
      period,
      date: date ? new Date(date) : new Date()
    });

    await businessMetrics.save();

    res.json({
      message: 'Metrics recorded successfully',
      metrics: businessMetrics,
      recordedAt: new Date()
    });
  } catch (error) {
    console.error('Error recording metrics:', error);
    res.status(500).json({
      message: 'Failed to record metrics',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/metrics
// @desc    Get business metrics for a period
// @access  Private
router.get('/metrics', auth, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      period = 'daily',
      limit = 100
    } = req.query;

    const query = { userId: req.user.id };

    if (period) query.period = period;

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default to last 30 days
      query.date = {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      };
    }

    const metrics = await BusinessMetrics.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({
      message: 'Metrics retrieved successfully',
      metrics,
      count: metrics.length
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      message: 'Failed to fetch metrics',
      error: error.message
    });
  }
});

// @route   POST /api/analytics/ai-analysis
// @desc    Generate AI-powered business analysis
// @access  Private
router.post('/ai-analysis', auth, async (req, res) => {
  try {
    const {
      websiteId,
      businessInfo,
      analysisType = 'comprehensive',
      dateRange,
      includeCompetitive = false,
      includeCustomerSegments = false,
      includePredictions = false
    } = req.body;

    // If websiteId is provided, analyze specific website
    if (websiteId) {
      const Website = require('../models/Website');
      const website = await Website.findOne({ _id: websiteId, userId: req.user.id });

      if (!website) {
        return res.status(404).json({
          message: 'Website not found'
        });
      }

      // Generate comprehensive website marketing analysis
      const analysis = await analyticsAIService.analyzeWebsiteMarketing({
        businessInfo: website.businessInfo,
        content: website.content,
        seo: website.seo
      });

      return res.json({
        message: 'Website marketing analysis completed successfully',
        analysis,
        websiteId,
        generatedAt: new Date()
      });
    }

    // Get user's business info for general analysis
    const user = await User.findById(req.user.id);
    const userBusinessInfo = businessInfo || user.businessProfile;

    if (!userBusinessInfo.businessName) {
      return res.status(400).json({
        message: 'Please complete your business profile first'
      });
    }

    // Fetch recent metrics
    const startDate = dateRange?.start ? new Date(dateRange.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.end ? new Date(dateRange.end) : new Date();

    const metrics = await BusinessMetrics.find({
      userId: req.user.id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    // Prepare data for AI analysis
    const analysisData = {
      businessName: businessInfo.businessName,
      industry: businessInfo.industry,
      revenue: metrics.map(m => ({ date: m.date, value: m.metrics.revenue?.amount || 0 })),
      customers: metrics.map(m => ({ date: m.date, value: m.metrics.customers?.total || 0 })),
      websiteTraffic: metrics.map(m => ({ date: m.date, value: m.metrics.website?.visitors || 0 })),
      marketingCampaigns: [],
      customerFeedback: [],
      timeframe: `${Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))}d`
    };

    // Generate AI analysis
    const analysis = await analyticsAIService.analyzeBusinessMetrics(analysisData);

    // Save the analysis report
    const report = new AnalyticsReport({
      userId: req.user.id,
      reportType: 'performance',
      title: `AI Business Analysis - ${new Date().toLocaleDateString()}`,
      dateRange: { start: startDate, end: endDate },
      data: {
        summary: analysis.overallPerformance,
        insights: analysis.keyInsights,
        recommendations: analysis.recommendations,
        metrics: analysisData
      },
      aiAnalysis: analysis,
      status: 'completed'
    });

    await report.save();

    res.json({
      message: 'AI analysis completed successfully',
      analysis,
      reportId: report._id,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating AI analysis:', error);
    res.status(500).json({
      message: 'Failed to generate AI analysis',
      error: error.message
    });
  }
});

// @route   POST /api/analytics/competitive-analysis
// @desc    Generate competitive analysis
// @access  Private
router.post('/competitive-analysis', auth, [
  body('competitors').optional().isArray(),
  body('marketPosition').optional().isString()
], async (req, res) => {
  try {
    const { competitors = [], marketPosition = 'unknown' } = req.body;

    // Get user's business info
    const user = await User.findById(req.user.id);
    const businessInfo = user.businessProfile;

    if (!businessInfo.businessName) {
      return res.status(400).json({
        message: 'Please complete your business profile first'
      });
    }

    const analysisData = {
      industry: businessInfo.industry,
      businessName: businessInfo.businessName,
      marketPosition,
      competitors
    };

    // Generate competitive analysis using AI
    const analysis = await analyticsAIService.generateCompetitiveAnalysis(analysisData);

    // Save competitive analysis
    const competitiveAnalysis = new CompetitiveAnalysis({
      userId: req.user.id,
      competitors: competitors.map(comp => ({ name: comp })),
      analysis: {
        marketPosition,
        competitiveAdvantages: analysis.competitivePosition?.strengths || [],
        threats: analysis.competitivePosition?.threats || [],
        opportunities: analysis.competitivePosition?.opportunities || [],
        recommendations: analysis.recommendations || []
      },
      industry: businessInfo.industry
    });

    await competitiveAnalysis.save();

    res.json({
      message: 'Competitive analysis completed successfully',
      analysis,
      analysisId: competitiveAnalysis._id,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating competitive analysis:', error);
    res.status(500).json({
      message: 'Failed to generate competitive analysis',
      error: error.message
    });
  }
});

// @route   POST /api/analytics/kpi/create
// @desc    Create a new KPI to track
// @access  Private
router.post('/kpi/create', auth, [
  body('name').notEmpty().withMessage('KPI name is required'),
  body('category').isIn(['financial', 'operational', 'customer', 'marketing', 'growth']),
  body('target').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, category, description, target, unit } = req.body;

    const kpi = new KPITracking({
      userId: req.user.id,
      name,
      category,
      description,
      target,
      unit
    });

    await kpi.save();

    res.json({
      message: 'KPI created successfully',
      kpi,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error creating KPI:', error);
    res.status(500).json({
      message: 'Failed to create KPI',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/kpi
// @desc    Get user's KPIs
// @access  Private
router.get('/kpi', auth, async (req, res) => {
  try {
    const { category, active = true } = req.query;

    const query = { userId: req.user.id };
    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';

    const kpis = await KPITracking.find(query).sort({ category: 1, name: 1 });

    res.json({
      message: 'KPIs retrieved successfully',
      kpis,
      count: kpis.length
    });
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({
      message: 'Failed to fetch KPIs',
      error: error.message
    });
  }
});

// @route   PUT /api/analytics/kpi/:id/update
// @desc    Update KPI value
// @access  Private
router.put('/kpi/:id/update', auth, [
  body('value').isNumeric().withMessage('Value must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { value, note } = req.body;

    const kpi = await KPITracking.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!kpi) {
      return res.status(404).json({ message: 'KPI not found' });
    }

    // Update current value and add to history
    kpi.currentValue = value;
    kpi.history.push({
      date: new Date(),
      value,
      note
    });

    // Calculate trend
    if (kpi.history.length >= 2) {
      const recent = kpi.history.slice(-3);
      const trend = recent[recent.length - 1].value > recent[0].value ? 'increasing' :
                   recent[recent.length - 1].value < recent[0].value ? 'decreasing' : 'stable';
      kpi.trend = trend;
    }

    await kpi.save();

    res.json({
      message: 'KPI updated successfully',
      kpi,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating KPI:', error);
    res.status(500).json({
      message: 'Failed to update KPI',
      error: error.message
    });
  }
});

// @route   POST /api/analytics/feedback/submit
// @desc    Submit customer feedback for analysis
// @access  Private
router.post('/feedback/submit', auth, [
  body('content').notEmpty().withMessage('Feedback content is required'),
  body('source').isIn(['website', 'email', 'social', 'survey', 'review', 'support'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { content, source, metadata = {} } = req.body;

    // Analyze sentiment using AI
    const sentimentAnalysis = await aiService.analyzeFeedback([content]);

    const feedback = new CustomerFeedback({
      userId: req.user.id,
      source,
      content,
      sentiment: {
        score: sentimentAnalysis.sentimentBreakdown?.[0]?.score || 0,
        label: sentimentAnalysis.sentimentBreakdown?.[0]?.sentiment || 'neutral',
        confidence: sentimentAnalysis.confidenceScore || 0.5
      },
      metadata,
      processed: true
    });

    await feedback.save();

    res.json({
      message: 'Feedback submitted and analyzed successfully',
      feedback,
      sentiment: feedback.sentiment,
      submittedAt: new Date()
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/feedback
// @desc    Get customer feedback with sentiment analysis
// @access  Private
router.get('/feedback', auth, async (req, res) => {
  try {
    const {
      source,
      sentiment,
      limit = 50,
      days = 30
    } = req.query;

    const query = { userId: req.user.id };

    if (source) query.source = source;
    if (sentiment) query['sentiment.label'] = sentiment;

    // Filter by date
    query.createdAt = {
      $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    };

    const feedback = await CustomerFeedback.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Get sentiment summary
    const sentimentSummary = await CustomerFeedback.getSentimentSummary(req.user.id, days);

    res.json({
      message: 'Feedback retrieved successfully',
      feedback,
      sentimentSummary,
      count: feedback.length
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      message: 'Failed to fetch feedback',
      error: error.message
    });
  }
});

// @route   POST /api/analytics/competitive-analysis
// @desc    Generate competitive analysis using AI
// @access  Private
router.post('/competitive-analysis', auth, async (req, res) => {
  try {
    const { businessInfo, industry, targetMarket } = req.body;

    if (!businessInfo || !industry) {
      return res.status(400).json({
        message: 'Business information and industry are required'
      });
    }

    // Generate competitive analysis
    const analysis = await analyticsAIService.generateCompetitiveAnalysis({
      businessInfo,
      industry,
      targetMarket
    });

    res.json({
      message: 'Competitive analysis completed successfully',
      analysis,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating competitive analysis:', error);
    res.status(500).json({
      message: 'Failed to generate competitive analysis',
      error: error.message
    });
  }
});

// @route   POST /api/analytics/predictions
// @desc    Generate business predictions using AI
// @access  Private
router.post('/predictions', auth, async (req, res) => {
  try {
    const {
      metric = 'revenue',
      timeframe = 'quarterly',
      includeScenarios = true
    } = req.body;

    // Get user's business info
    const user = await User.findById(req.user.id);
    const businessInfo = user.businessProfile;

    if (!businessInfo.businessName) {
      return res.status(400).json({
        message: 'Please complete your business profile first'
      });
    }

    // Fetch historical data
    const historicalData = await BusinessMetrics.find({
      userId: req.user.id,
      date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    }).sort({ date: 1 });

    const dataPoints = historicalData.map(m => ({
      date: m.date,
      value: m.metrics[metric]?.amount || m.metrics[metric]?.total || 0
    }));

    // Generate predictions using AI
    const predictions = await analyticsAIService.predictBusinessTrends({
      historicalData: dataPoints,
      industry: businessInfo.industry,
      seasonality: true,
      externalFactors: []
    });

    res.json({
      message: 'Predictions generated successfully',
      predictions,
      metric,
      timeframe,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating predictions:', error);
    res.status(500).json({
      message: 'Failed to generate predictions',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/website/:websiteId
// @desc    Get comprehensive analytics for a specific website
// @access  Private
router.get('/website/:websiteId', auth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { dateRange = 30 } = req.query;

    // Verify website ownership
    const website = await Website.findOne({ _id: websiteId, userId: req.user.id });
    if (!website) {
      return res.status(404).json({
        message: 'Website not found or access denied'
      });
    }

    // Get or initialize analytics
    let analytics = await WebsiteAnalytics.findOne({ websiteId, userId: req.user.id });
    if (!analytics) {
      analytics = await websiteAnalyticsService.initializeWebsiteAnalytics(websiteId, req.user.id);
    }

    // Get dashboard data
    const dashboardData = await websiteAnalyticsService.getWebsiteAnalyticsDashboard(
      websiteId,
      req.user.id,
      parseInt(dateRange)
    );

    res.json({
      message: 'Website analytics retrieved successfully',
      website: {
        id: website._id,
        name: website.businessInfo.name,
        domain: website.domain,
        status: website.status
      },
      analytics: dashboardData,
      dateRange: parseInt(dateRange)
    });
  } catch (error) {
    console.error('Error fetching website analytics:', error);
    res.status(500).json({
      message: 'Failed to fetch website analytics',
      error: error.message
    });
  }
});

// @route   POST /api/analytics/website/:websiteId/initialize
// @desc    Initialize analytics tracking for a website
// @access  Private
router.post('/website/:websiteId/initialize', auth, async (req, res) => {
  try {
    const { websiteId } = req.params;

    // Verify website ownership
    const website = await Website.findOne({ _id: websiteId, userId: req.user.id });
    if (!website) {
      return res.status(404).json({
        message: 'Website not found or access denied'
      });
    }

    // Initialize analytics
    const analytics = await websiteAnalyticsService.initializeWebsiteAnalytics(websiteId, req.user.id);

    res.json({
      message: 'Website analytics initialized successfully',
      analytics: {
        websiteId: analytics.websiteId,
        initialized: true,
        trackingEnabled: true
      }
    });
  } catch (error) {
    console.error('Error initializing website analytics:', error);
    res.status(500).json({
      message: 'Failed to initialize website analytics',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/portfolio
// @desc    Get analytics summary for all user websites
// @access  Private
router.get('/portfolio', auth, async (req, res) => {
  try {
    const { dateRange = 30 } = req.query;

    // Get all user websites
    const websites = await Website.find({ userId: req.user.id });

    const portfolioData = await Promise.all(
      websites.map(async (website) => {
        try {
          let analytics = await WebsiteAnalytics.findOne({ websiteId: website._id });

          if (!analytics) {
            analytics = await websiteAnalyticsService.initializeWebsiteAnalytics(website._id, req.user.id);
          }

          const dashboardData = await websiteAnalyticsService.getWebsiteAnalyticsDashboard(
            website._id,
            req.user.id,
            parseInt(dateRange)
          );

          return {
            website: {
              id: website._id,
              name: website.businessInfo.name,
              industry: website.businessInfo.industry,
              domain: website.domain,
              status: website.status,
              createdAt: website.createdAt
            },
            analytics: {
              overview: dashboardData.overview,
              alerts: dashboardData.alerts.length,
              lastUpdated: dashboardData.lastUpdated
            }
          };
        } catch (error) {
          console.error(`Error getting analytics for website ${website._id}:`, error);
          return {
            website: {
              id: website._id,
              name: website.businessInfo.name,
              industry: website.businessInfo.industry,
              domain: website.domain,
              status: website.status,
              createdAt: website.createdAt
            },
            analytics: null,
            error: 'Failed to load analytics'
          };
        }
      })
    );

    // Calculate portfolio summary
    const summary = portfolioData.reduce((acc, item) => {
      if (item.analytics) {
        acc.totalPageViews += item.analytics.overview.totalPageViews || 0;
        acc.totalUniqueVisitors += item.analytics.overview.uniqueVisitors || 0;
        acc.totalAlerts += item.analytics.alerts || 0;
        acc.avgSEOScore += item.analytics.overview.seoScore || 0;
        acc.websiteCount++;
      }
      return acc;
    }, {
      totalPageViews: 0,
      totalUniqueVisitors: 0,
      totalAlerts: 0,
      avgSEOScore: 0,
      websiteCount: 0
    });

    if (summary.websiteCount > 0) {
      summary.avgSEOScore = summary.avgSEOScore / summary.websiteCount;
    }

    res.json({
      message: 'Portfolio analytics retrieved successfully',
      summary,
      websites: portfolioData,
      dateRange: parseInt(dateRange)
    });
  } catch (error) {
    console.error('Error fetching portfolio analytics:', error);
    res.status(500).json({
      message: 'Failed to fetch portfolio analytics',
      error: error.message
    });
  }
});

module.exports = router;
