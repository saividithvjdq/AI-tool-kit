const mongoose = require('mongoose');

// Website Analytics Schema for real-time tracking
const websiteAnalyticsSchema = new mongoose.Schema({
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Traffic Metrics
  traffic: {
    pageViews: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 }, // percentage
    avgSessionDuration: { type: Number, default: 0 }, // seconds
    newVsReturning: {
      newVisitors: { type: Number, default: 0 },
      returningVisitors: { type: Number, default: 0 }
    },
    topPages: [{
      path: String,
      views: Number,
      uniqueViews: Number,
      avgTimeOnPage: Number
    }],
    referralSources: [{
      source: String,
      medium: String,
      visitors: Number,
      sessions: Number
    }],
    deviceBreakdown: {
      desktop: { type: Number, default: 0 },
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 }
    },
    geographicData: [{
      country: String,
      visitors: Number,
      sessions: Number
    }]
  },

  // SEO Performance
  seo: {
    overallScore: { type: Number, default: 0 }, // 0-100
    keywordRankings: [{
      keyword: String,
      position: Number,
      searchVolume: Number,
      difficulty: Number,
      url: String,
      lastChecked: Date
    }],
    backlinks: {
      total: { type: Number, default: 0 },
      dofollow: { type: Number, default: 0 },
      nofollow: { type: Number, default: 0 },
      domainAuthority: Number,
      newBacklinks: { type: Number, default: 0 }
    },
    technicalSEO: {
      pageSpeed: {
        desktop: Number,
        mobile: Number,
        lastChecked: Date
      },
      coreWebVitals: {
        lcp: Number, // Largest Contentful Paint
        fid: Number, // First Input Delay
        cls: Number, // Cumulative Layout Shift
        lastChecked: Date
      },
      indexability: {
        indexedPages: Number,
        totalPages: Number,
        crawlErrors: Number,
        lastCrawled: Date
      }
    }
  },

  // Conversion Tracking
  conversions: {
    totalConversions: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }, // percentage
    goals: [{
      name: String,
      type: String, // 'form_submission', 'email_signup', 'phone_call', 'download'
      completions: Number,
      value: Number,
      conversionRate: Number
    }],
    funnelAnalysis: [{
      step: String,
      visitors: Number,
      dropoffRate: Number
    }],
    revenue: {
      total: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      averageOrderValue: Number,
      revenuePerVisitor: Number
    }
  },

  // Social Media Engagement
  socialMedia: {
    shares: {
      facebook: { type: Number, default: 0 },
      twitter: { type: Number, default: 0 },
      linkedin: { type: Number, default: 0 },
      instagram: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    mentions: {
      total: { type: Number, default: 0 },
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 }
    },
    engagement: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      clickThroughRate: Number
    }
  },

  // Marketing Campaign Performance
  campaigns: [{
    campaignId: String,
    name: String,
    type: String, // 'email', 'social', 'ppc', 'content'
    status: String, // 'active', 'paused', 'completed'
    metrics: {
      impressions: Number,
      clicks: Number,
      conversions: Number,
      cost: Number,
      roi: Number,
      ctr: Number, // Click-through rate
      cpc: Number, // Cost per click
      cpa: Number  // Cost per acquisition
    },
    startDate: Date,
    endDate: Date
  }],

  // Performance Trends (daily aggregates)
  dailyMetrics: [{
    date: { type: Date, required: true },
    pageViews: Number,
    uniqueVisitors: Number,
    sessions: Number,
    bounceRate: Number,
    conversions: Number,
    revenue: Number,
    socialShares: Number,
    seoScore: Number
  }],

  // Alerts and Notifications
  alerts: [{
    type: String, // 'traffic_spike', 'traffic_drop', 'conversion_drop', 'seo_issue'
    severity: String, // 'low', 'medium', 'high', 'critical'
    message: String,
    data: mongoose.Schema.Types.Mixed,
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],

  // Last updated timestamps
  lastUpdated: {
    traffic: Date,
    seo: Date,
    conversions: Date,
    socialMedia: Date,
    campaigns: Date
  }
}, {
  timestamps: true
});

// Indexes for performance
websiteAnalyticsSchema.index({ websiteId: 1, userId: 1 });
websiteAnalyticsSchema.index({ 'dailyMetrics.date': 1 });
websiteAnalyticsSchema.index({ userId: 1, createdAt: -1 });

// Methods
websiteAnalyticsSchema.methods.updateTrafficMetrics = function(metrics) {
  this.traffic = { ...this.traffic, ...metrics };
  this.lastUpdated.traffic = new Date();
  return this.save();
};

websiteAnalyticsSchema.methods.updateSEOMetrics = function(metrics) {
  this.seo = { ...this.seo, ...metrics };
  this.lastUpdated.seo = new Date();
  return this.save();
};

websiteAnalyticsSchema.methods.addDailyMetric = function(date, metrics) {
  const existingIndex = this.dailyMetrics.findIndex(
    metric => metric.date.toDateString() === date.toDateString()
  );
  
  if (existingIndex >= 0) {
    this.dailyMetrics[existingIndex] = { date, ...metrics };
  } else {
    this.dailyMetrics.push({ date, ...metrics });
  }
  
  // Keep only last 90 days
  this.dailyMetrics = this.dailyMetrics
    .sort((a, b) => b.date - a.date)
    .slice(0, 90);
    
  return this.save();
};

websiteAnalyticsSchema.methods.addAlert = function(type, severity, message, data = {}) {
  this.alerts.unshift({
    type,
    severity,
    message,
    data,
    createdAt: new Date()
  });
  
  // Keep only last 50 alerts
  this.alerts = this.alerts.slice(0, 50);
  
  // Send email notification for high/critical alerts
  if (['high', 'critical'].includes(severity)) {
    this.sendEmailAlert(type, severity, message, data);
  }
  
  return this.save();
};

websiteAnalyticsSchema.methods.sendEmailAlert = async function(type, severity, message, data = {}) {
  try {
    const emailService = require('../services/emailService');
    
    // Get website and user info for email context
    await this.populate('websiteId userId');
    
    const alertData = {
      ownerEmail: this.userId.email,
      websiteName: this.websiteId.name || 'Your Website',
      websiteUrl: this.websiteId.url || '#',
      alertType: type,
      severity,
      message,
      ...data
    };

    await emailService.sendWebsiteNotification(this.websiteId._id, type, alertData);
  } catch (error) {
    console.error('Failed to send email alert:', error.message);
  }
};

// Static methods
websiteAnalyticsSchema.statics.getAnalyticsSummary = async function(userId, dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);
  
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalPageViews: { $sum: '$traffic.pageViews' },
        totalUniqueVisitors: { $sum: '$traffic.uniqueVisitors' },
        totalConversions: { $sum: '$conversions.totalConversions' },
        totalRevenue: { $sum: '$conversions.revenue.total' },
        avgBounceRate: { $avg: '$traffic.bounceRate' },
        avgSEOScore: { $avg: '$seo.overallScore' },
        websiteCount: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('WebsiteAnalytics', websiteAnalyticsSchema);
