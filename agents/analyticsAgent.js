const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const contextManager = require('../services/contextManager');
const NotificationService = require('../services/notificationService');
const analyticsAIService = require('../services/analyticsAIService');
const { BusinessMetrics, AnalyticsReport } = require('../models/Analytics');

const router = express.Router();
const AGENT_ID = 'analytics-agent';

class AnalyticsAgent {
  constructor() {
    this.agentId = AGENT_ID;
    this.status = 'active';
    this.capabilities = [
      'performance-tracking',
      'conversion-analysis',
      'user-behavior-analysis',
      'seo-monitoring',
      'recommendation-engine'
    ];
    
    // Start polling for notifications
    this.startNotificationPolling();
  }

  // Start polling for notifications
  startNotificationPolling() {
    setInterval(async () => {
      try {
        const notifications = await contextManager.getNotifications(this.agentId);
        for (const notification of notifications) {
          if (notification.type === 'stage-ready' && notification.data.stage === 'analytics-setup') {
            await this.processAnalyticsSetup(notification.websiteId);
            await contextManager.markNotificationsProcessed(notification.websiteId, this.agentId);
          }
        }
      } catch (error) {
        console.error(`[${this.agentId}] Error polling notifications:`, error);
      }
    }, 5000); // Poll every 5 seconds
  }

  // Main analytics setup process
  async processAnalyticsSetup(websiteId) {
    const startTime = Date.now();
    
    try {
      console.log(`[${this.agentId}] Starting analytics setup for website: ${websiteId}`);
      
      // Update status to tracking
      await contextManager.updateContext(websiteId, this.agentId, {
        'analyticsAgent.status': 'tracking'
      });

      // Get context
      const context = await contextManager.getContext(websiteId);
      
      // Setup tracking
      const trackingSetup = await this.setupTracking(context);
      
      // Update status to analyzing
      await contextManager.updateContext(websiteId, this.agentId, {
        'analyticsAgent.status': 'analyzing',
        'analyticsAgent.trackingSetup': trackingSetup
      });
      
      // Perform initial performance audit
      const performanceMetrics = await this.performInitialAudit(context);
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(context, performanceMetrics);
      
      // Create initial analytics report
      const analyticsReport = await this.createInitialReport(context, performanceMetrics, recommendations);
      
      // Update context with results
      const processingTime = Date.now() - startTime;
      await contextManager.updateContext(websiteId, this.agentId, {
        'analyticsAgent.status': 'completed',
        'analyticsAgent.performanceMetrics': performanceMetrics,
        'analyticsAgent.recommendations': recommendations,
        'analyticsAgent.lastProcessed': new Date(),
        'analyticsAgent.processingTime': processingTime
      });

      // Log activity
      await contextManager.logActivity(
        websiteId,
        this.agentId,
        'analyzed',
        'completed',
        { performanceScore: performanceMetrics.seoScore, processingTime }
      );

      // Complete this stage (final stage)
      await contextManager.completeStage(websiteId, this.agentId);

      // Send notification
      try {
        await NotificationService.notifyAnalyticsSetup(context.userId, {
          websiteId,
          performanceScore: performanceMetrics.seoScore
        });
      } catch (notificationError) {
        console.error('Failed to send analytics setup notification:', notificationError);
      }

      console.log(`[${this.agentId}] Analytics setup completed for ${websiteId}`);

      return { success: true, performanceMetrics, recommendations, analyticsReport, processingTime };
    } catch (error) {
      console.error(`[${this.agentId}] Error in analytics setup:`, error);
      
      // Update context with error
      await contextManager.updateContext(websiteId, this.agentId, {
        'analyticsAgent.status': 'failed',
        'analyticsAgent.error': error.message,
        'analyticsAgent.lastProcessed': new Date()
      });

      // Log error activity
      await contextManager.logActivity(
        websiteId,
        this.agentId,
        'analyzed',
        'failed',
        null,
        error.message
      );

      throw error;
    }
  }

  // Setup tracking configuration
  async setupTracking(context) {
    const businessContext = context.businessContext;
    
    // Generate tracking IDs (in real implementation, these would be actual IDs)
    const googleAnalyticsId = `GA-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const facebookPixelId = `FB-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    // Define custom events based on business type
    const customEvents = this.defineCustomEvents(businessContext);
    
    // Define conversion goals
    const conversionGoals = this.defineConversionGoals(businessContext);
    
    return {
      googleAnalyticsId,
      facebookPixelId,
      customEvents,
      conversionGoals,
      setupDate: new Date(),
      trackingCode: this.generateTrackingCode(googleAnalyticsId, customEvents)
    };
  }

  // Define custom events based on business type
  defineCustomEvents(businessContext) {
    const baseEvents = [
      {
        name: 'page_view',
        description: 'Track page views',
        category: 'engagement'
      },
      {
        name: 'contact_form_submit',
        description: 'Track contact form submissions',
        category: 'conversion'
      },
      {
        name: 'phone_click',
        description: 'Track phone number clicks',
        category: 'conversion'
      },
      {
        name: 'email_click',
        description: 'Track email link clicks',
        category: 'conversion'
      }
    ];

    // Add industry-specific events
    const industryEvents = this.getIndustrySpecificEvents(businessContext.industry);
    
    return [...baseEvents, ...industryEvents];
  }

  // Get industry-specific tracking events
  getIndustrySpecificEvents(industry) {
    const industryEventMap = {
      'restaurant': [
        { name: 'menu_view', description: 'Track menu views', category: 'engagement' },
        { name: 'reservation_attempt', description: 'Track reservation attempts', category: 'conversion' }
      ],
      'retail': [
        { name: 'product_view', description: 'Track product views', category: 'engagement' },
        { name: 'add_to_cart', description: 'Track add to cart events', category: 'conversion' }
      ],
      'service': [
        { name: 'service_inquiry', description: 'Track service inquiries', category: 'conversion' },
        { name: 'quote_request', description: 'Track quote requests', category: 'conversion' }
      ]
    };

    return industryEventMap[industry.toLowerCase()] || [];
  }

  // Define conversion goals
  defineConversionGoals(businessContext) {
    return [
      {
        name: 'Contact Form Submission',
        type: 'event',
        value: 10,
        description: 'User submits contact form'
      },
      {
        name: 'Phone Call',
        type: 'event',
        value: 15,
        description: 'User clicks phone number'
      },
      {
        name: 'Email Contact',
        type: 'event',
        value: 8,
        description: 'User clicks email link'
      },
      {
        name: 'Service Page View',
        type: 'pageview',
        value: 5,
        description: 'User views services page'
      }
    ];
  }

  // Generate tracking code
  generateTrackingCode(googleAnalyticsId, customEvents) {
    return `
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${googleAnalyticsId}');
  
  // Custom event tracking
  ${customEvents.map(event => `
  function track${event.name.replace(/_/g, '')}() {
    gtag('event', '${event.name}', {
      'event_category': '${event.category}',
      'event_label': '${event.description}'
    });
  }`).join('\n')}
</script>

<!-- Custom Event Listeners -->
<script>
  document.addEventListener('DOMContentLoaded', function() {
    // Track contact form submissions
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', function() {
        trackcontactformsubmit();
      });
    }
    
    // Track phone clicks
    const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
    phoneLinks.forEach(link => {
      link.addEventListener('click', function() {
        trackphoneclick();
      });
    });
    
    // Track email clicks
    const emailLinks = document.querySelectorAll('a[href^="mailto:"]');
    emailLinks.forEach(link => {
      link.addEventListener('click', function() {
        trackemailclick();
      });
    });
  });
</script>`;
  }

  // Perform initial performance audit
  async performInitialAudit(context) {
    const websiteContent = context.websiteAgent.generatedContent;
    const marketingData = context.marketingAgent;
    
    // Simulate performance metrics (in real implementation, use tools like Lighthouse)
    const pageSpeed = this.calculatePageSpeed(websiteContent);
    const seoScore = marketingData?.seoAnalysis?.score || 0;
    const accessibilityScore = this.calculateAccessibilityScore(websiteContent);
    const bestPracticesScore = this.calculateBestPracticesScore(websiteContent);
    
    return {
      pageSpeed,
      seoScore,
      accessibilityScore,
      bestPracticesScore,
      overallScore: Math.round((pageSpeed + seoScore + accessibilityScore + bestPracticesScore) / 4),
      lastAudit: new Date(),
      auditDetails: {
        loadTime: Math.random() * 3 + 1, // 1-4 seconds
        firstContentfulPaint: Math.random() * 2 + 0.5, // 0.5-2.5 seconds
        largestContentfulPaint: Math.random() * 3 + 1, // 1-4 seconds
        cumulativeLayoutShift: Math.random() * 0.1, // 0-0.1
        firstInputDelay: Math.random() * 100 + 50 // 50-150ms
      }
    };
  }

  // Calculate page speed score
  calculatePageSpeed(websiteContent) {
    let score = 90; // Start with high score
    
    // Deduct points for potential issues
    if (websiteContent?.html?.length > 50000) score -= 10; // Large HTML
    if (websiteContent?.css?.length > 20000) score -= 5; // Large CSS
    if (!websiteContent?.html?.includes('async')) score -= 5; // No async scripts
    
    return Math.max(score, 50);
  }

  // Calculate accessibility score
  calculateAccessibilityScore(websiteContent) {
    let score = 80; // Start with good score
    
    if (websiteContent?.html?.includes('alt=')) score += 10; // Has alt tags
    if (websiteContent?.html?.includes('aria-')) score += 5; // Has ARIA attributes
    if (websiteContent?.html?.includes('role=')) score += 5; // Has role attributes
    
    return Math.min(score, 100);
  }

  // Calculate best practices score
  calculateBestPracticesScore(websiteContent) {
    let score = 85; // Start with good score
    
    if (websiteContent?.html?.includes('https://')) score += 5; // Uses HTTPS
    if (websiteContent?.html?.includes('viewport')) score += 5; // Mobile optimized
    if (websiteContent?.html?.includes('charset')) score += 5; // Has charset
    
    return Math.min(score, 100);
  }

  // Generate recommendations based on audit
  async generateRecommendations(context, performanceMetrics) {
    const recommendations = [];
    
    // Performance recommendations
    if (performanceMetrics.pageSpeed < 80) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        description: 'Optimize images and minify CSS/JS to improve page speed',
        impact: 'High',
        effort: 'Medium'
      });
    }
    
    if (performanceMetrics.seoScore < 80) {
      recommendations.push({
        category: 'SEO',
        priority: 'High',
        description: 'Improve meta tags and content structure for better SEO',
        impact: 'High',
        effort: 'Low'
      });
    }
    
    if (performanceMetrics.accessibilityScore < 90) {
      recommendations.push({
        category: 'Accessibility',
        priority: 'Medium',
        description: 'Add alt tags to images and improve keyboard navigation',
        impact: 'Medium',
        effort: 'Low'
      });
    }
    
    // Business-specific recommendations
    const businessRecommendations = this.getBusinessSpecificRecommendations(context.businessContext);
    recommendations.push(...businessRecommendations);
    
    return recommendations;
  }

  // Get business-specific recommendations
  getBusinessSpecificRecommendations(businessContext) {
    const recommendations = [];
    
    if (businessContext.industry === 'restaurant') {
      recommendations.push({
        category: 'Conversion',
        priority: 'High',
        description: 'Add online reservation system to increase bookings',
        impact: 'High',
        effort: 'High'
      });
    }
    
    if (businessContext.industry === 'retail') {
      recommendations.push({
        category: 'E-commerce',
        priority: 'High',
        description: 'Implement shopping cart and payment processing',
        impact: 'High',
        effort: 'High'
      });
    }
    
    recommendations.push({
      category: 'Marketing',
      priority: 'Medium',
      description: 'Set up Google My Business profile for local SEO',
      impact: 'Medium',
      effort: 'Low'
    });
    
    return recommendations;
  }

  // Create initial analytics report
  async createInitialReport(context, performanceMetrics, recommendations) {
    try {
      const report = new AnalyticsReport({
        userId: context.userId,
        reportType: 'performance',
        title: `Initial Performance Report - ${context.businessContext.name}`,
        dateRange: {
          start: new Date(),
          end: new Date()
        },
        data: {
          summary: {
            overallScore: performanceMetrics.overallScore,
            pageSpeed: performanceMetrics.pageSpeed,
            seoScore: performanceMetrics.seoScore,
            accessibilityScore: performanceMetrics.accessibilityScore
          },
          insights: [
            {
              title: 'Performance Analysis',
              description: `Your website scored ${performanceMetrics.overallScore}/100 in the initial audit`,
              type: 'performance'
            }
          ],
          recommendations: recommendations.map(rec => ({
            category: rec.category,
            description: rec.description,
            priority: rec.priority,
            impact: rec.impact
          })),
          metrics: performanceMetrics
        },
        status: 'completed'
      });

      await report.save();
      return report;
    } catch (error) {
      console.error(`[${this.agentId}] Error creating analytics report:`, error);
      throw error;
    }
  }

  // Get agent status
  getStatus() {
    return {
      agentId: this.agentId,
      status: this.status,
      capabilities: this.capabilities,
      version: '1.0.0',
      lastActivity: new Date()
    };
  }
}

// Create agent instance
const analyticsAgent = new AnalyticsAgent();

// API Routes
router.post('/setup', auth, [
  body('websiteId').notEmpty().withMessage('Website ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { websiteId } = req.body;
    
    // Trigger analytics setup
    const result = await analyticsAgent.processAnalyticsSetup(websiteId);
    
    res.json({
      message: 'Analytics setup completed',
      result
    });
  } catch (error) {
    console.error('Error in analytics setup:', error);
    res.status(500).json({
      message: 'Failed to setup analytics',
      error: error.message
    });
  }
});

router.get('/status/:websiteId', auth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const context = await contextManager.getContext(websiteId);
    
    res.json({
      message: 'Analytics status retrieved',
      status: context.analyticsAgent
    });
  } catch (error) {
    console.error('Error getting analytics status:', error);
    res.status(500).json({
      message: 'Failed to get analytics status',
      error: error.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json(analyticsAgent.getStatus());
});

module.exports = { router, agent: analyticsAgent };
