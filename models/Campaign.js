const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['email', 'social', 'sms', 'automation'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  subject: {
    type: String,
    required: function() { return this.type === 'email'; }
  },
  content: {
    html: String,
    text: String,
    aiGenerated: {
      type: Boolean,
      default: false
    },
    prompt: String // Store the original prompt used for AI generation
  },
  audience: {
    segments: [{
      type: String,
      enum: ['all', 'new_leads', 'customers', 'inactive', 'high_value', 'custom']
    }],
    customFilters: {
      tags: [String],
      location: String,
      ageRange: {
        min: Number,
        max: Number
      },
      interests: [String]
    },
    totalRecipients: {
      type: Number,
      default: 0
    }
  },
  schedule: {
    type: {
      type: String,
      enum: ['immediate', 'scheduled', 'recurring'],
      default: 'immediate'
    },
    sendAt: Date,
    timezone: {
      type: String,
      default: 'UTC'
    },
    recurring: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly']
      },
      interval: Number, // Every X days/weeks/months
      endDate: Date
    }
  },
  analytics: {
    sent: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    unsubscribed: {
      type: Number,
      default: 0
    },
    bounced: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    }
  },
  settings: {
    trackOpens: {
      type: Boolean,
      default: true
    },
    trackClicks: {
      type: Boolean,
      default: true
    },
    allowUnsubscribe: {
      type: Boolean,
      default: true
    },
    replyTo: String,
    fromName: String,
    fromEmail: String
  },
  automation: {
    trigger: {
      type: String,
      enum: ['signup', 'purchase', 'abandoned_cart', 'birthday', 'custom_event']
    },
    conditions: [{
      field: String,
      operator: String,
      value: String
    }],
    actions: [{
      type: String,
      delay: Number, // in hours
      content: {
        subject: String,
        html: String,
        text: String
      }
    }]
  }
}, {
  timestamps: true
});

// Indexes for better performance
campaignSchema.index({ userId: 1, websiteId: 1, status: 1 });
campaignSchema.index({ websiteId: 1, status: 1 });
campaignSchema.index({ 'schedule.sendAt': 1 });
campaignSchema.index({ type: 1, status: 1 });

// Virtual for open rate
campaignSchema.virtual('openRate').get(function() {
  if (this.analytics.delivered === 0) return 0;
  return (this.analytics.opened / this.analytics.delivered * 100).toFixed(2);
});

// Virtual for click rate
campaignSchema.virtual('clickRate').get(function() {
  if (this.analytics.delivered === 0) return 0;
  return (this.analytics.clicked / this.analytics.delivered * 100).toFixed(2);
});

// Virtual for conversion rate
campaignSchema.virtual('conversionRate').get(function() {
  if (this.analytics.clicked === 0) return 0;
  return (this.analytics.revenue > 0 ? (this.analytics.clicked / this.analytics.sent * 100) : 0).toFixed(2);
});

campaignSchema.set('toJSON', { virtuals: true });
campaignSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Campaign', campaignSchema);
