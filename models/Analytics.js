const mongoose = require('mongoose');

// Business Metrics Schema
const businessMetricsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  metrics: {
    revenue: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
      source: String
    },
    customers: {
      total: { type: Number, default: 0 },
      new: { type: Number, default: 0 },
      returning: { type: Number, default: 0 },
      churn: { type: Number, default: 0 }
    },
    website: {
      visitors: { type: Number, default: 0 },
      pageViews: { type: Number, default: 0 },
      bounceRate: { type: Number, default: 0 },
      avgSessionDuration: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 }
    },
    marketing: {
      emailsSent: { type: Number, default: 0 },
      emailsOpened: { type: Number, default: 0 },
      emailsClicked: { type: Number, default: 0 },
      socialEngagement: { type: Number, default: 0 },
      adSpend: { type: Number, default: 0 },
      adClicks: { type: Number, default: 0 }
    },
    operations: {
      orders: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      fulfillmentTime: { type: Number, default: 0 },
      customerSatisfaction: { type: Number, default: 0 }
    }
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'daily'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Analytics Report Schema
const analyticsReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportType: {
    type: String,
    enum: ['performance', 'competitive', 'customer', 'predictive', 'kpi'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  data: {
    summary: mongoose.Schema.Types.Mixed,
    insights: [mongoose.Schema.Types.Mixed],
    recommendations: [mongoose.Schema.Types.Mixed],
    metrics: mongoose.Schema.Types.Mixed,
    charts: [mongoose.Schema.Types.Mixed]
  },
  aiAnalysis: {
    overallScore: Number,
    keyInsights: [mongoose.Schema.Types.Mixed],
    predictions: mongoose.Schema.Types.Mixed,
    recommendations: [mongoose.Schema.Types.Mixed]
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Customer Feedback Schema
const customerFeedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source: {
    type: String,
    enum: ['website', 'email', 'social', 'survey', 'review', 'support'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sentiment: {
    score: { type: Number, min: -1, max: 1 },
    label: { type: String, enum: ['positive', 'negative', 'neutral'] },
    confidence: { type: Number, min: 0, max: 1 }
  },
  categories: [{
    name: String,
    confidence: Number
  }],
  metadata: {
    customerEmail: String,
    customerName: String,
    productId: String,
    orderId: String,
    rating: { type: Number, min: 1, max: 5 }
  },
  processed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// KPI Tracking Schema
const kpiTrackingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['financial', 'operational', 'customer', 'marketing', 'growth'],
    required: true
  },
  description: String,
  target: {
    value: Number,
    period: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] }
  },
  currentValue: Number,
  unit: String,
  trend: {
    type: String,
    enum: ['increasing', 'decreasing', 'stable'],
    default: 'stable'
  },
  history: [{
    date: Date,
    value: Number,
    note: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Competitive Analysis Schema
const competitiveAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  competitors: [{
    name: String,
    website: String,
    strengths: [String],
    weaknesses: [String],
    marketShare: Number,
    pricing: mongoose.Schema.Types.Mixed
  }],
  analysis: {
    marketPosition: String,
    competitiveAdvantages: [String],
    threats: [String],
    opportunities: [String],
    recommendations: [mongoose.Schema.Types.Mixed]
  },
  industry: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
businessMetricsSchema.index({ userId: 1, date: -1 });
businessMetricsSchema.index({ userId: 1, period: 1, date: -1 });

analyticsReportSchema.index({ userId: 1, createdAt: -1 });
analyticsReportSchema.index({ userId: 1, reportType: 1 });

customerFeedbackSchema.index({ userId: 1, createdAt: -1 });
customerFeedbackSchema.index({ userId: 1, sentiment: 1 });
customerFeedbackSchema.index({ userId: 1, processed: 1 });

kpiTrackingSchema.index({ userId: 1, category: 1 });
kpiTrackingSchema.index({ userId: 1, isActive: 1 });

competitiveAnalysisSchema.index({ userId: 1, lastUpdated: -1 });

// Pre-save middleware
businessMetricsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

kpiTrackingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for calculating KPI performance
kpiTrackingSchema.virtual('performance').get(function() {
  if (!this.target || !this.target.value || !this.currentValue) return null;
  
  const percentage = (this.currentValue / this.target.value) * 100;
  return {
    percentage: Math.round(percentage * 100) / 100,
    status: percentage >= 100 ? 'achieved' : percentage >= 80 ? 'on-track' : 'behind'
  };
});

// Static methods
businessMetricsSchema.statics.getMetricsForPeriod = function(userId, startDate, endDate) {
  return this.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

customerFeedbackSchema.statics.getSentimentSummary = function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), createdAt: { $gte: startDate } } },
    { $group: {
      _id: '$sentiment.label',
      count: { $sum: 1 },
      avgScore: { $avg: '$sentiment.score' }
    }}
  ]);
};

kpiTrackingSchema.statics.getActiveKPIs = function(userId) {
  return this.find({ userId, isActive: true }).sort({ category: 1, name: 1 });
};

// Export models
const BusinessMetrics = mongoose.model('BusinessMetrics', businessMetricsSchema);
const AnalyticsReport = mongoose.model('AnalyticsReport', analyticsReportSchema);
const CustomerFeedback = mongoose.model('CustomerFeedback', customerFeedbackSchema);
const KPITracking = mongoose.model('KPITracking', kpiTrackingSchema);
const CompetitiveAnalysis = mongoose.model('CompetitiveAnalysis', competitiveAnalysisSchema);

module.exports = {
  BusinessMetrics,
  AnalyticsReport,
  CustomerFeedback,
  KPITracking,
  CompetitiveAnalysis
};
