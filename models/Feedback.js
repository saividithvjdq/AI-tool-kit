const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
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
  
  // Feedback content
  rating: {
    overall: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    design: {
      type: Number,
      min: 1,
      max: 5
    },
    usability: {
      type: Number,
      min: 1,
      max: 5
    },
    content: {
      type: Number,
      min: 1,
      max: 5
    },
    performance: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  comments: {
    general: {
      type: String,
      maxlength: 2000
    },
    likes: {
      type: String,
      maxlength: 1000
    },
    improvements: {
      type: String,
      maxlength: 1000
    },
    suggestions: {
      type: String,
      maxlength: 1000
    }
  },
  
  // Submitter information (optional for anonymous feedback)
  submitter: {
    name: {
      type: String,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255
    },
    isAnonymous: {
      type: Boolean,
      default: true
    }
  },
  
  // AI Analysis Results
  aiAnalysis: {
    sentiment: {
      overall: {
        type: String,
        enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative']
      },
      score: {
        type: Number,
        min: -1,
        max: 1
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      }
    },
    
    emotions: [{
      emotion: {
        type: String,
        enum: ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'trust', 'anticipation']
      },
      intensity: {
        type: Number,
        min: 0,
        max: 1
      }
    }],
    
    keywords: [{
      word: String,
      frequency: Number,
      sentiment: String,
      relevance: Number
    }],
    
    categories: [{
      category: {
        type: String,
        enum: ['design', 'functionality', 'content', 'performance', 'navigation', 'mobile', 'accessibility', 'general']
      },
      confidence: Number,
      mentions: [String]
    }],
    
    actionableInsights: [{
      priority: {
        type: String,
        enum: ['high', 'medium', 'low']
      },
      category: String,
      insight: String,
      suggestedAction: String,
      impact: String
    }],
    
    processedAt: {
      type: Date,
      default: Date.now
    },
    
    processingModel: {
      type: String,
      default: 'groq-llama'
    }
  },
  
  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    sessionId: String,
    timeOnSite: Number, // seconds
    pagesViewed: Number,
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown']
    },
    browserInfo: {
      name: String,
      version: String
    },
    location: {
      country: String,
      region: String,
      city: String
    }
  },
  
  // Status and workflow
  status: {
    type: String,
    enum: ['pending', 'processed', 'reviewed', 'addressed', 'archived'],
    default: 'pending'
  },
  
  isPublic: {
    type: Boolean,
    default: false
  },
  
  isSpam: {
    type: Boolean,
    default: false
  },
  
  // Response from website owner
  response: {
    message: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Helpful votes from other users
  helpfulVotes: {
    up: {
      type: Number,
      default: 0
    },
    down: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
feedbackSchema.index({ websiteId: 1, createdAt: -1 });
feedbackSchema.index({ userId: 1 });
feedbackSchema.index({ 'rating.overall': 1 });
feedbackSchema.index({ 'aiAnalysis.sentiment.overall': 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ isSpam: 1 });

// Virtual for average rating
feedbackSchema.virtual('averageRating').get(function() {
  const ratings = this.rating;
  const validRatings = Object.values(ratings).filter(r => typeof r === 'number' && r > 0);
  if (validRatings.length === 0) return 0;
  return validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
});

// Virtual for feedback summary
feedbackSchema.virtual('summary').get(function() {
  return {
    rating: this.rating.overall,
    sentiment: this.aiAnalysis?.sentiment?.overall || 'neutral',
    hasComments: !!(this.comments.general || this.comments.likes || this.comments.improvements),
    category: this.aiAnalysis?.categories?.[0]?.category || 'general',
    priority: this.aiAnalysis?.actionableInsights?.[0]?.priority || 'medium'
  };
});

// Method to calculate sentiment score
feedbackSchema.methods.calculateSentimentScore = function() {
  const sentimentMap = {
    'very_positive': 1,
    'positive': 0.5,
    'neutral': 0,
    'negative': -0.5,
    'very_negative': -1
  };
  
  return sentimentMap[this.aiAnalysis?.sentiment?.overall] || 0;
};

// Static method to get feedback analytics for a website
feedbackSchema.statics.getWebsiteAnalytics = async function(websiteId, dateRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - dateRange);
  
  return this.aggregate([
    {
      $match: {
        websiteId: mongoose.Types.ObjectId(websiteId),
        createdAt: { $gte: startDate },
        isSpam: false
      }
    },
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: 1 },
        averageRating: { $avg: '$rating.overall' },
        sentimentDistribution: {
          $push: '$aiAnalysis.sentiment.overall'
        },
        categoryMentions: {
          $push: '$aiAnalysis.categories.category'
        },
        priorityInsights: {
          $push: '$aiAnalysis.actionableInsights.priority'
        }
      }
    },
    {
      $project: {
        totalFeedback: 1,
        averageRating: { $round: ['$averageRating', 2] },
        sentimentCounts: {
          very_positive: {
            $size: {
              $filter: {
                input: '$sentimentDistribution',
                cond: { $eq: ['$$this', 'very_positive'] }
              }
            }
          },
          positive: {
            $size: {
              $filter: {
                input: '$sentimentDistribution',
                cond: { $eq: ['$$this', 'positive'] }
              }
            }
          },
          neutral: {
            $size: {
              $filter: {
                input: '$sentimentDistribution',
                cond: { $eq: ['$$this', 'neutral'] }
              }
            }
          },
          negative: {
            $size: {
              $filter: {
                input: '$sentimentDistribution',
                cond: { $eq: ['$$this', 'negative'] }
              }
            }
          },
          very_negative: {
            $size: {
              $filter: {
                input: '$sentimentDistribution',
                cond: { $eq: ['$$this', 'very_negative'] }
              }
            }
          }
        }
      }
    }
  ]);
};

// Static method to get trending feedback topics
feedbackSchema.statics.getTrendingTopics = async function(websiteId, limit = 10) {
  return this.aggregate([
    {
      $match: {
        websiteId: mongoose.Types.ObjectId(websiteId),
        isSpam: false,
        'aiAnalysis.keywords': { $exists: true, $ne: [] }
      }
    },
    { $unwind: '$aiAnalysis.keywords' },
    {
      $group: {
        _id: '$aiAnalysis.keywords.word',
        frequency: { $sum: '$aiAnalysis.keywords.frequency' },
        avgSentiment: { $avg: '$aiAnalysis.keywords.sentiment' },
        relevance: { $avg: '$aiAnalysis.keywords.relevance' }
      }
    },
    { $sort: { frequency: -1, relevance: -1 } },
    { $limit: limit }
  ]);
};

feedbackSchema.set('toJSON', { virtuals: true });
feedbackSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
