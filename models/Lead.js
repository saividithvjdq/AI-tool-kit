const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'],
    default: 'new'
  },
  source: {
    type: String,
    enum: ['website', 'social_media', 'email_campaign', 'referral', 'advertisement', 'event', 'manual'],
    default: 'manual'
  },
  tags: [String],
  customFields: {
    type: Map,
    of: String
  },
  location: {
    country: String,
    state: String,
    city: String,
    zipCode: String
  },
  demographics: {
    age: Number,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
    interests: [String]
  },
  engagement: {
    totalEmails: {
      type: Number,
      default: 0
    },
    emailsOpened: {
      type: Number,
      default: 0
    },
    linksClicked: {
      type: Number,
      default: 0
    },
    lastEmailOpened: Date,
    lastLinkClicked: Date,
    engagementScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  lifecycle: {
    stage: {
      type: String,
      enum: ['subscriber', 'lead', 'marketing_qualified', 'sales_qualified', 'opportunity', 'customer', 'evangelist'],
      default: 'subscriber'
    },
    firstContact: {
      type: Date,
      default: Date.now
    },
    lastContact: Date,
    lastActivity: Date
  },
  preferences: {
    emailFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'never'],
      default: 'weekly'
    },
    topics: [String],
    unsubscribed: {
      type: Boolean,
      default: false
    },
    unsubscribedAt: Date,
    unsubscribeReason: String
  },
  value: {
    estimatedValue: {
      type: Number,
      default: 0
    },
    actualValue: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  notes: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  activities: [{
    type: {
      type: String,
      enum: ['email_sent', 'email_opened', 'link_clicked', 'form_submitted', 'page_visited', 'purchase', 'call', 'meeting', 'note_added']
    },
    description: String,
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better performance
leadSchema.index({ userId: 1, email: 1 }, { unique: true });
leadSchema.index({ userId: 1, status: 1 });
leadSchema.index({ userId: 1, 'lifecycle.stage': 1 });
leadSchema.index({ userId: 1, tags: 1 });
leadSchema.index({ 'engagement.engagementScore': -1 });

// Virtual for full name
leadSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName || this.lastName || this.email;
});

// Virtual for engagement rate
leadSchema.virtual('engagementRate').get(function() {
  if (this.engagement.totalEmails === 0) return 0;
  return (this.engagement.emailsOpened / this.engagement.totalEmails * 100).toFixed(2);
});

// Method to calculate engagement score
leadSchema.methods.calculateEngagementScore = function() {
  let score = 0;
  
  // Email engagement (40% of score)
  if (this.engagement.totalEmails > 0) {
    const emailEngagement = (this.engagement.emailsOpened / this.engagement.totalEmails) * 40;
    score += emailEngagement;
  }
  
  // Click engagement (30% of score)
  if (this.engagement.emailsOpened > 0) {
    const clickEngagement = (this.engagement.linksClicked / this.engagement.emailsOpened) * 30;
    score += clickEngagement;
  }
  
  // Recency (20% of score)
  if (this.engagement.lastEmailOpened) {
    const daysSinceLastOpen = (Date.now() - this.engagement.lastEmailOpened) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 20 - (daysSinceLastOpen / 7)); // Decrease by 1 point per week
    score += recencyScore;
  }
  
  // Profile completeness (10% of score)
  let completeness = 0;
  if (this.firstName) completeness += 2;
  if (this.lastName) completeness += 2;
  if (this.phone) completeness += 2;
  if (this.company) completeness += 2;
  if (this.jobTitle) completeness += 2;
  score += completeness;
  
  this.engagement.engagementScore = Math.min(100, Math.max(0, score));
  return this.engagement.engagementScore;
};

// Method to add activity
leadSchema.methods.addActivity = function(type, description, metadata = {}) {
  this.activities.push({
    type,
    description,
    metadata,
    timestamp: new Date()
  });
  
  this.lifecycle.lastActivity = new Date();
  
  // Update engagement metrics based on activity type
  if (type === 'email_sent') {
    this.engagement.totalEmails += 1;
  } else if (type === 'email_opened') {
    this.engagement.emailsOpened += 1;
    this.engagement.lastEmailOpened = new Date();
  } else if (type === 'link_clicked') {
    this.engagement.linksClicked += 1;
    this.engagement.lastLinkClicked = new Date();
  }
  
  // Recalculate engagement score
  this.calculateEngagementScore();
};

leadSchema.set('toJSON', { virtuals: true });
leadSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Lead', leadSchema);
