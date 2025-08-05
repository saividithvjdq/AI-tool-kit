const mongoose = require('mongoose');

// Agent Activity Log Schema
const agentActivitySchema = new mongoose.Schema({
  agentId: {
    type: String,
    required: true,
    enum: ['coordinator', 'website-generator', 'image-generator', 'marketing-agent', 'analytics-agent']
  },
  action: {
    type: String,
    required: true,
    enum: ['workflow-started', 'workflow-completed', 'created', 'updated', 'processed', 'analyzed', 'generated', 'optimized']
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'failed'],
    default: 'pending'
  },
  data: mongoose.Schema.Types.Mixed,
  error: String,
  processingTime: Number, // in milliseconds
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Website Context Schema - Central coordination hub
const websiteContextSchema = new mongoose.Schema({
  // Core identification
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Context versioning and locking
  version: {
    type: Number,
    default: 1
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedBy: {
    agentId: String,
    timestamp: Date,
    reason: String
  },
  
  // Original prompt and business context
  originalPrompt: {
    type: String,
    required: true
  },
  businessContext: {
    name: String,
    industry: String,
    description: String,
    targetAudience: String,
    keyServices: [String],
    tone: String,
    style: String,
    keywords: [String]
  },
  
  // Website Generator Agent Data
  websiteAgent: {
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    generatedContent: {
      html: String,
      css: String,
      javascript: String,
      structure: mongoose.Schema.Types.Mixed,
      metadata: mongoose.Schema.Types.Mixed
    },
    seoData: {
      title: String,
      description: String,
      keywords: [String],
      metaTags: mongoose.Schema.Types.Mixed
    },
    lastProcessed: Date,
    processingTime: Number,
    error: String
  },
  
  // Image Generator Agent Data
  imageAgent: {
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    imageRequirements: [{
      type: {
        type: String,
        enum: ['hero', 'about', 'services', 'contact', 'gallery', 'logo', 'icon']
      },
      prompt: String,
      style: String,
      dimensions: String,
      priority: Number
    }],
    generatedImages: [{
      type: String,
      url: String,
      filename: String,
      prompt: String,
      metadata: mongoose.Schema.Types.Mixed,
      generatedAt: Date
    }],
    lastProcessed: Date,
    processingTime: Number,
    error: String
  },
  
  // Marketing Agent Data
  marketingAgent: {
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'optimizing', 'completed', 'failed'],
      default: 'pending'
    },
    seoAnalysis: {
      score: Number,
      recommendations: [String],
      keywords: [{
        keyword: String,
        difficulty: Number,
        volume: Number,
        relevance: Number
      }],
      competitorAnalysis: mongoose.Schema.Types.Mixed
    },
    marketingStrategy: {
      targetAudience: mongoose.Schema.Types.Mixed,
      contentStrategy: [String],
      campaignSuggestions: [mongoose.Schema.Types.Mixed],
      socialMediaStrategy: mongoose.Schema.Types.Mixed
    },
    lastProcessed: Date,
    processingTime: Number,
    error: String
  },
  
  // Analytics Agent Data
  analyticsAgent: {
    status: {
      type: String,
      enum: ['pending', 'tracking', 'analyzing', 'completed', 'failed'],
      default: 'pending'
    },
    trackingSetup: {
      googleAnalyticsId: String,
      facebookPixelId: String,
      customEvents: [mongoose.Schema.Types.Mixed],
      conversionGoals: [mongoose.Schema.Types.Mixed]
    },
    performanceMetrics: {
      pageSpeed: Number,
      seoScore: Number,
      accessibilityScore: Number,
      bestPracticesScore: Number,
      lastAudit: Date
    },
    recommendations: [{
      category: String,
      priority: String,
      description: String,
      impact: String,
      effort: String
    }],
    lastProcessed: Date,
    processingTime: Number,
    error: String
  },
  
  // Agent coordination and workflow
  workflow: {
    currentStage: {
      type: String,
      enum: ['website-generation', 'image-generation', 'marketing-optimization', 'analytics-setup', 'completed', 'failed'],
      default: 'website-generation'
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'failed'],
      default: 'pending'
    },
    completedStages: [String],
    nextActions: [{
      agentId: String,
      action: String,
      priority: Number,
      scheduledFor: Date,
      retryCount: {
        type: Number,
        default: 0
      },
      maxRetries: {
        type: Number,
        default: 3
      }
    }],
    dependencies: [{
      agentId: String,
      dependsOn: [String],
      status: String
    }],
    errors: [{
      stage: String,
      agentId: String,
      error: String,
      retryCount: {
        type: Number,
        default: 0
      },
      maxRetries: {
        type: Number,
        default: 3
      },
      firstOccurred: Date,
      lastAttempt: Date,
      lastError: String
    }],
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    failedAt: Date,
    failureReason: String,
    totalProcessingTime: Number
  },
  
  // Activity and audit trail
  activityLog: [agentActivitySchema],
  
  // Notifications and events
  pendingNotifications: [{
    targetAgent: String,
    type: String,
    message: String,
    data: mongoose.Schema.Types.Mixed,
    createdAt: {
      type: Date,
      default: Date.now
    },
    processed: {
      type: Boolean,
      default: false
    }
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAgentActivity: Date
}, {
  timestamps: true
});

// Indexes for performance (websiteId already has unique index)
websiteContextSchema.index({ userId: 1 });
websiteContextSchema.index({ 'workflow.currentStage': 1 });
websiteContextSchema.index({ 'pendingNotifications.targetAgent': 1, 'pendingNotifications.processed': 1 });
websiteContextSchema.index({ lastAgentActivity: -1 });
websiteContextSchema.index({ version: 1 });

// Middleware to update version and timestamp
websiteContextSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
    this.updatedAt = new Date();
    this.lastAgentActivity = new Date();
  }
  next();
});

// Methods for context management
websiteContextSchema.methods.lockContext = function(agentId, reason = 'Processing') {
  this.isLocked = true;
  this.lockedBy = {
    agentId,
    timestamp: new Date(),
    reason
  };
  return this.save();
};

websiteContextSchema.methods.unlockContext = function() {
  this.isLocked = false;
  this.lockedBy = undefined;
  return this.save();
};

websiteContextSchema.methods.addActivity = function(agentId, action, status = 'completed', data = null, error = null) {
  this.activityLog.push({
    agentId,
    action,
    status,
    data,
    error,
    timestamp: new Date()
  });
  return this.save();
};

websiteContextSchema.methods.addNotification = function(targetAgent, type, message, data = null) {
  this.pendingNotifications.push({
    targetAgent,
    type,
    message,
    data,
    createdAt: new Date(),
    processed: false
  });
  return this.save();
};

websiteContextSchema.methods.getUnprocessedNotifications = function(agentId) {
  return this.pendingNotifications.filter(
    notification => notification.targetAgent === agentId && !notification.processed
  );
};

websiteContextSchema.methods.markNotificationsProcessed = function(agentId) {
  this.pendingNotifications.forEach(notification => {
    if (notification.targetAgent === agentId) {
      notification.processed = true;
    }
  });
  return this.save();
};

module.exports = mongoose.model('WebsiteContext', websiteContextSchema);
