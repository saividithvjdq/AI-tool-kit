const mongoose = require('mongoose');

const stockImageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    unique: true
  },
  originalName: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  industries: [{
    type: String,
    enum: [
      'technology', 'healthcare', 'finance', 'education', 'retail', 'food',
      'real-estate', 'automotive', 'travel', 'fitness', 'beauty', 'consulting',
      'legal', 'construction', 'photography', 'design', 'marketing', 'agriculture',
      'manufacturing', 'entertainment', 'nonprofit', 'government', 'logistics',
      'energy', 'telecommunications', 'insurance', 'hospitality', 'fashion',
      'sports', 'media', 'transportation', 'security', 'cleaning', 'repair',
      'wellness', 'pets', 'childcare', 'eldercare', 'home-services'
    ]
  }],
  category: {
    type: String,
    enum: ['hero', 'about', 'services', 'contact', 'gallery', 'team', 'testimonials', 'background'],
    required: true
  },
  style: {
    type: String,
    enum: ['professional', 'modern', 'creative', 'minimal', 'corporate', 'friendly', 'luxury', 'casual'],
    default: 'professional'
  },
  colorScheme: {
    dominant: String,
    palette: [String]
  },
  dimensions: {
    width: Number,
    height: Number,
    aspectRatio: String // e.g., "16:9", "4:3", "1:1"
  },
  fileSize: {
    type: Number // in bytes
  },
  mimeType: {
    type: String,
    default: 'image/jpeg'
  },
  quality: {
    type: String,
    enum: ['low', 'medium', 'high', 'ultra'],
    default: 'high'
  },
  usage: {
    downloadCount: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    popularityScore: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    photographer: String,
    source: String,
    license: {
      type: String,
      enum: ['free', 'premium', 'royalty-free', 'creative-commons'],
      default: 'free'
    },
    attribution: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better performance
stockImageSchema.index({ industries: 1, category: 1 });
stockImageSchema.index({ tags: 1 });
stockImageSchema.index({ style: 1, category: 1 });
stockImageSchema.index({ 'usage.popularityScore': -1 });
stockImageSchema.index({ isActive: 1 });

// Virtual for full URL
stockImageSchema.virtual('fullUrl').get(function() {
  return this.url.startsWith('http') ? this.url : `${process.env.BASE_URL || 'http://localhost:5000'}${this.url}`;
});

// Method to increment usage
stockImageSchema.methods.incrementUsage = function() {
  this.usage.downloadCount += 1;
  this.usage.lastUsed = new Date();
  this.usage.popularityScore = this.usage.downloadCount * 0.1 + (Date.now() - this.createdAt) * 0.00001;
  return this.save();
};

// Static method to find images by industry and category
stockImageSchema.statics.findByIndustryAndCategory = function(industry, category, limit = 10) {
  return this.find({
    industries: industry,
    category: category,
    isActive: true
  })
  .sort({ 'usage.popularityScore': -1 })
  .limit(limit);
};

// Static method to get recommended images for a business
stockImageSchema.statics.getRecommendedImages = function(businessInfo) {
  const { industry, keyServices = [], style = 'professional' } = businessInfo;
  
  // Create search criteria
  const searchCriteria = {
    isActive: true,
    $or: [
      { industries: industry },
      { tags: { $in: keyServices.map(s => s.toLowerCase()) } }
    ]
  };

  if (style) {
    searchCriteria.style = style;
  }

  return this.aggregate([
    { $match: searchCriteria },
    {
      $addFields: {
        relevanceScore: {
          $add: [
            { $cond: [{ $in: [industry, '$industries'] }, 10, 0] },
            { $size: { $setIntersection: ['$tags', keyServices.map(s => s.toLowerCase())] } },
            { $cond: [{ $eq: ['$style', style] }, 5, 0] },
            { $multiply: ['$usage.popularityScore', 0.1] }
          ]
        }
      }
    },
    { $sort: { relevanceScore: -1, 'usage.popularityScore': -1 } },
    {
      $group: {
        _id: '$category',
        images: { $push: '$$ROOT' },
        topImage: { $first: '$$ROOT' }
      }
    },
    {
      $project: {
        category: '$_id',
        recommendedImages: { $slice: ['$images', 3] }, // Top 3 per category
        topImage: 1
      }
    }
  ]);
};

stockImageSchema.set('toJSON', { virtuals: true });
stockImageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('StockImage', stockImageSchema);
