const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  negativePrompt: {
    type: String,
    trim: true
  },
  style: {
    type: String,
    enum: [
      'realistic', 'artistic', 'cartoon', 'minimalist', 'vintage', 'modern',
      'professional', 'lifestyle', 'studio', 'outdoor', 'luxury',
      'abstract', 'surreal', 'photographic', 'digital_art', 'oil_painting',
      'watercolor', 'sketch', 'anime', 'cyberpunk', 'steampunk'
    ],
    default: 'realistic'
  },
  mood: {
    type: String,
    enum: [
      'neutral', 'happy', 'sad', 'energetic', 'calm', 'dramatic',
      'mysterious', 'bright', 'dark', 'warm', 'cool', 'vibrant',
      'muted', 'elegant', 'playful', 'serious', 'romantic', 'futuristic'
    ],
    default: 'neutral'
  },
  colors: [{
    type: String,
    trim: true
  }],
  composition: {
    type: String,
    enum: [
      'centered', 'rule_of_thirds', 'symmetrical', 'asymmetrical',
      'close_up', 'wide_shot', 'portrait', 'landscape', 'diagonal',
      'leading_lines', 'framing', 'patterns'
    ],
    default: 'centered'
  },
  aspectRatio: {
    type: String,
    enum: ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9', '2:3', '3:2'],
    default: '1:1'
  },
  quality: {
    type: String,
    enum: ['draft', 'standard', 'high', 'ultra'],
    default: 'high'
  },
  subject: {
    type: String,
    trim: true
  },
  environment: {
    type: String,
    trim: true
  },
  lighting: {
    type: String,
    enum: [
      'natural', 'studio', 'dramatic', 'soft', 'hard', 'golden_hour',
      'blue_hour', 'neon', 'candlelight', 'backlit', 'rim_lighting',
      'ambient', 'directional', 'diffused'
    ],
    default: 'natural'
  },
  status: {
    type: String,
    enum: ['prompt_generated', 'generating', 'generated', 'failed', 'archived'],
    default: 'prompt_generated'
  },
  imageUrl: {
    type: String,
    trim: true
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    styleKeywords: [{
      type: String,
      trim: true
    }],
    technicalSpecs: {
      resolution: String,
      aspectRatio: String,
      quality: String,
      format: String
    },
    variations: [{
      type: String,
      trim: true
    }],
    tips: [{
      type: String,
      trim: true
    }],
    generationTime: Number,
    model: String,
    version: String,
    seed: Number,
    steps: Number,
    guidance: Number
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    downloads: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    }
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  generatedAt: {
    type: Date
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

// Indexes for better query performance
imageSchema.index({ userId: 1, createdAt: -1 });
imageSchema.index({ status: 1 });
imageSchema.index({ style: 1 });
imageSchema.index({ tags: 1 });
imageSchema.index({ isPublic: 1, isFeatured: 1 });

// Update the updatedAt field before saving
imageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for formatted creation date
imageSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString();
});

// Virtual for image stats summary
imageSchema.virtual('statsSummary').get(function() {
  return {
    totalEngagement: this.analytics.views + this.analytics.likes + this.analytics.shares,
    engagementRate: this.analytics.views > 0 ? 
      ((this.analytics.likes + this.analytics.shares) / this.analytics.views * 100).toFixed(2) : 0
  };
});

// Method to increment view count
imageSchema.methods.incrementViews = function() {
  this.analytics.views += 1;
  return this.save();
};

// Method to increment download count
imageSchema.methods.incrementDownloads = function() {
  this.analytics.downloads += 1;
  return this.save();
};

// Method to toggle like
imageSchema.methods.toggleLike = function() {
  this.analytics.likes += 1;
  return this.save();
};

// Static method to get popular images
imageSchema.statics.getPopular = function(limit = 10) {
  return this.find({ isPublic: true })
    .sort({ 'analytics.views': -1, 'analytics.likes': -1 })
    .limit(limit);
};

// Static method to get featured images
imageSchema.statics.getFeatured = function(limit = 5) {
  return this.find({ isFeatured: true, isPublic: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search images
imageSchema.statics.searchImages = function(query, options = {}) {
  const searchRegex = new RegExp(query, 'i');
  const filter = {
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } },
      { subject: searchRegex }
    ]
  };

  if (options.style) filter.style = options.style;
  if (options.mood) filter.mood = options.mood;
  if (options.isPublic !== undefined) filter.isPublic = options.isPublic;

  return this.find(filter)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20);
};

module.exports = mongoose.model('Image', imageSchema);
