const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const contextManager = require('../services/contextManager');
const NotificationService = require('../services/notificationService');
const marketingAIService = require('../services/marketingAIService');

const router = express.Router();
const AGENT_ID = 'marketing-agent';

class MarketingAgent {
  constructor() {
    this.agentId = AGENT_ID;
    this.status = 'active';
    this.capabilities = [
      'seo-analysis',
      'keyword-research',
      'content-optimization',
      'marketing-strategy',
      'competitor-analysis'
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
          if (notification.type === 'stage-ready' && notification.data.stage === 'marketing-optimization') {
            await this.processMarketingOptimization(notification.websiteId);
            await contextManager.markNotificationsProcessed(notification.websiteId, this.agentId);
          }
        }
      } catch (error) {
        console.error(`[${this.agentId}] Error polling notifications:`, error);
      }
    }, 5000); // Poll every 5 seconds
  }

  // Main marketing optimization process
  async processMarketingOptimization(websiteId) {
    const startTime = Date.now();
    
    try {
      console.log(`[${this.agentId}] Starting marketing optimization for website: ${websiteId}`);
      
      // Update status to analyzing
      await contextManager.updateContext(websiteId, this.agentId, {
        'marketingAgent.status': 'analyzing'
      });

      // Get context
      const context = await contextManager.getContext(websiteId);
      
      // Perform SEO analysis
      const seoAnalysis = await this.performSEOAnalysis(context);
      
      // Generate marketing strategy
      const marketingStrategy = await this.generateMarketingStrategy(context);
      
      // Update status to optimizing
      await contextManager.updateContext(websiteId, this.agentId, {
        'marketingAgent.status': 'optimizing'
      });
      
      // Apply optimizations
      const optimizations = await this.applyOptimizations(context, seoAnalysis, marketingStrategy);
      
      // Update context with results
      const processingTime = Date.now() - startTime;
      await contextManager.updateContext(websiteId, this.agentId, {
        'marketingAgent.status': 'completed',
        'marketingAgent.seoAnalysis': seoAnalysis,
        'marketingAgent.marketingStrategy': marketingStrategy,
        'marketingAgent.lastProcessed': new Date(),
        'marketingAgent.processingTime': processingTime
      });

      // Log activity
      await contextManager.logActivity(
        websiteId,
        this.agentId,
        'optimized',
        'completed',
        { seoScore: seoAnalysis.score, processingTime }
      );

      // Complete this stage and trigger next stage
      await contextManager.completeStage(websiteId, this.agentId);

      // Send notification
      try {
        await NotificationService.notifyMarketingOptimized(context.userId, {
          websiteId,
          improvementCount: optimizations.length,
          seoScore: seoAnalysis.score
        });
      } catch (notificationError) {
        console.error('Failed to send marketing optimization notification:', notificationError);
      }

      console.log(`[${this.agentId}] Marketing optimization completed for ${websiteId}`);

      return { success: true, seoAnalysis, marketingStrategy, processingTime };
    } catch (error) {
      console.error(`[${this.agentId}] Error in marketing optimization:`, error);
      
      // Update context with error
      await contextManager.updateContext(websiteId, this.agentId, {
        'marketingAgent.status': 'failed',
        'marketingAgent.error': error.message,
        'marketingAgent.lastProcessed': new Date()
      });

      // Log error activity
      await contextManager.logActivity(
        websiteId,
        this.agentId,
        'optimized',
        'failed',
        null,
        error.message
      );

      throw error;
    }
  }

  // Perform SEO analysis
  async performSEOAnalysis(context) {
    try {
      const businessContext = context.businessContext;
      const websiteContent = context.websiteAgent.generatedContent;
      
      // Analyze keywords
      const keywords = await this.analyzeKeywords(businessContext);
      
      // Analyze content structure
      const contentAnalysis = this.analyzeContent(websiteContent);
      
      // Generate SEO recommendations
      const recommendations = this.generateSEORecommendations(contentAnalysis, keywords);
      
      // Calculate SEO score
      const score = this.calculateSEOScore(contentAnalysis, keywords);
      
      return {
        score,
        recommendations,
        keywords,
        contentAnalysis,
        competitorAnalysis: await this.performCompetitorAnalysis(businessContext),
        lastAnalyzed: new Date()
      };
    } catch (error) {
      console.error(`[${this.agentId}] Error in SEO analysis:`, error);
      throw error;
    }
  }

  // Analyze keywords for the business
  async analyzeKeywords(businessContext) {
    const primaryKeywords = [
      businessContext.name,
      businessContext.industry,
      ...(businessContext.keyServices || [])
    ];

    const keywords = [];
    
    for (const keyword of primaryKeywords) {
      keywords.push({
        keyword: keyword.toLowerCase(),
        difficulty: Math.floor(Math.random() * 100), // Mock difficulty score
        volume: Math.floor(Math.random() * 10000) + 100, // Mock search volume
        relevance: this.calculateKeywordRelevance(keyword, businessContext)
      });
    }

    // Add long-tail keywords
    const longTailKeywords = this.generateLongTailKeywords(businessContext);
    keywords.push(...longTailKeywords);

    return keywords.sort((a, b) => b.relevance - a.relevance);
  }

  // Calculate keyword relevance
  calculateKeywordRelevance(keyword, businessContext) {
    let relevance = 50; // Base relevance
    
    if (keyword.toLowerCase().includes(businessContext.name.toLowerCase())) {
      relevance += 30;
    }
    
    if (keyword.toLowerCase().includes(businessContext.industry.toLowerCase())) {
      relevance += 20;
    }
    
    if (businessContext.keyServices?.some(service => 
      keyword.toLowerCase().includes(service.toLowerCase()))) {
      relevance += 25;
    }
    
    return Math.min(relevance, 100);
  }

  // Generate long-tail keywords
  generateLongTailKeywords(businessContext) {
    const longTailKeywords = [];
    const industry = businessContext.industry.toLowerCase();
    const location = businessContext.location || 'local';
    
    const templates = [
      `best ${industry} services`,
      `${industry} near me`,
      `professional ${industry}`,
      `${industry} company`,
      `${location} ${industry}`,
      `affordable ${industry} services`
    ];

    templates.forEach(template => {
      longTailKeywords.push({
        keyword: template,
        difficulty: Math.floor(Math.random() * 50) + 20,
        volume: Math.floor(Math.random() * 1000) + 50,
        relevance: Math.floor(Math.random() * 30) + 60
      });
    });

    return longTailKeywords;
  }

  // Analyze website content
  analyzeContent(websiteContent) {
    const analysis = {
      hasTitle: !!websiteContent?.seo?.title,
      hasDescription: !!websiteContent?.seo?.description,
      hasKeywords: !!(websiteContent?.seo?.keywords?.length > 0),
      hasHeadings: !!websiteContent?.html?.includes('<h1>'),
      hasImages: !!websiteContent?.html?.includes('<img'),
      hasInternalLinks: !!websiteContent?.html?.includes('href="#'),
      contentLength: websiteContent?.html?.length || 0,
      readabilityScore: this.calculateReadabilityScore(websiteContent?.html || ''),
      mobileOptimized: !!websiteContent?.html?.includes('viewport'),
      hasStructuredData: !!websiteContent?.seo?.structuredData
    };

    return analysis;
  }

  // Calculate readability score (simplified)
  calculateReadabilityScore(html) {
    const textContent = html.replace(/<[^>]*>/g, '');
    const words = textContent.split(/\s+/).length;
    const sentences = textContent.split(/[.!?]+/).length;
    
    if (sentences === 0) return 0;
    
    const avgWordsPerSentence = words / sentences;
    
    // Simple readability score (higher is better)
    if (avgWordsPerSentence < 15) return 85;
    if (avgWordsPerSentence < 20) return 75;
    if (avgWordsPerSentence < 25) return 65;
    return 55;
  }

  // Generate SEO recommendations
  generateSEORecommendations(contentAnalysis, keywords) {
    const recommendations = [];

    if (!contentAnalysis.hasTitle) {
      recommendations.push('Add a compelling page title with primary keywords');
    }

    if (!contentAnalysis.hasDescription) {
      recommendations.push('Add a meta description that summarizes the page content');
    }

    if (!contentAnalysis.hasKeywords) {
      recommendations.push('Include relevant keywords in meta tags');
    }

    if (contentAnalysis.contentLength < 300) {
      recommendations.push('Increase content length to at least 300 words for better SEO');
    }

    if (!contentAnalysis.hasStructuredData) {
      recommendations.push('Add structured data markup for better search visibility');
    }

    if (contentAnalysis.readabilityScore < 70) {
      recommendations.push('Improve content readability by using shorter sentences');
    }

    // Keyword-specific recommendations
    const topKeywords = keywords.slice(0, 3);
    recommendations.push(`Focus on these high-value keywords: ${topKeywords.map(k => k.keyword).join(', ')}`);

    return recommendations;
  }

  // Calculate overall SEO score
  calculateSEOScore(contentAnalysis, keywords) {
    let score = 0;
    
    if (contentAnalysis.hasTitle) score += 15;
    if (contentAnalysis.hasDescription) score += 15;
    if (contentAnalysis.hasKeywords) score += 10;
    if (contentAnalysis.hasHeadings) score += 10;
    if (contentAnalysis.hasImages) score += 5;
    if (contentAnalysis.mobileOptimized) score += 15;
    if (contentAnalysis.hasStructuredData) score += 10;
    if (contentAnalysis.contentLength > 300) score += 10;
    if (contentAnalysis.readabilityScore > 70) score += 10;
    
    return Math.min(score, 100);
  }

  // Perform competitor analysis
  async performCompetitorAnalysis(businessContext) {
    // Mock competitor analysis
    return {
      competitors: [
        {
          name: `Competitor A in ${businessContext.industry}`,
          strengths: ['Strong SEO', 'Good content'],
          weaknesses: ['Poor mobile experience'],
          estimatedTraffic: Math.floor(Math.random() * 10000) + 1000
        }
      ],
      opportunities: [
        'Target long-tail keywords',
        'Improve local SEO',
        'Create more content'
      ],
      threats: [
        'High competition for main keywords',
        'Established competitors'
      ]
    };
  }

  // Generate marketing strategy
  async generateMarketingStrategy(context) {
    const businessContext = context.businessContext;
    
    return {
      targetAudience: {
        primary: `${businessContext.industry} customers`,
        demographics: 'Adults 25-55',
        interests: businessContext.keyServices || [],
        painPoints: [`Need for quality ${businessContext.industry} services`]
      },
      contentStrategy: [
        'Create blog posts about industry trends',
        'Develop case studies',
        'Share customer testimonials',
        'Create how-to guides'
      ],
      campaignSuggestions: [
        {
          type: 'Google Ads',
          budget: '$500-1000/month',
          keywords: businessContext.keyServices?.slice(0, 3) || [],
          expectedROI: '200-300%'
        },
        {
          type: 'Social Media',
          platforms: ['Facebook', 'LinkedIn'],
          frequency: '3-5 posts/week',
          focus: 'Brand awareness and engagement'
        }
      ],
      socialMediaStrategy: {
        platforms: ['Facebook', 'LinkedIn', 'Instagram'],
        postingFrequency: 'Daily',
        contentTypes: ['Educational', 'Behind-the-scenes', 'Customer stories'],
        hashtags: [`#${businessContext.industry}`, `#${businessContext.name.replace(/\s+/g, '')}`]
      }
    };
  }

  // Apply optimizations
  async applyOptimizations(context, seoAnalysis, marketingStrategy) {
    // This would typically update the website content with SEO improvements
    // For now, we'll return the optimization plan
    
    return {
      seoOptimizations: seoAnalysis.recommendations,
      keywordTargets: seoAnalysis.keywords.slice(0, 5),
      contentImprovements: [
        'Add keyword-rich headings',
        'Optimize image alt tags',
        'Improve internal linking',
        'Add call-to-action buttons'
      ],
      technicalImprovements: [
        'Optimize page loading speed',
        'Improve mobile responsiveness',
        'Add schema markup',
        'Optimize images'
      ]
    };
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
const marketingAgent = new MarketingAgent();

// API Routes
router.post('/optimize', auth, [
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
    
    // Trigger marketing optimization
    const result = await marketingAgent.processMarketingOptimization(websiteId);
    
    res.json({
      message: 'Marketing optimization completed',
      result
    });
  } catch (error) {
    console.error('Error in marketing optimization:', error);
    res.status(500).json({
      message: 'Failed to optimize marketing',
      error: error.message
    });
  }
});

router.get('/status/:websiteId', auth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const context = await contextManager.getContext(websiteId);
    
    res.json({
      message: 'Marketing status retrieved',
      status: context.marketingAgent
    });
  } catch (error) {
    console.error('Error getting marketing status:', error);
    res.status(500).json({
      message: 'Failed to get marketing status',
      error: error.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json(marketingAgent.getStatus());
});

module.exports = { router, agent: marketingAgent };
