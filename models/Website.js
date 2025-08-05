const mongoose = require('mongoose');

const websiteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessInfo: {
    name: {
      type: String,
      required: true
    },
    industry: String,
    description: String,
    targetAudience: String,
    keyServices: [String],
    contactInfo: {
      email: String,
      phone: String,
      address: String
    }
  },
  design: {
    template: {
      type: String,
      default: 'modern'
    },
    colorScheme: {
      primary: String,
      secondary: String,
      accent: String,
      background: String,
      text: String
    },
    fonts: {
      heading: String,
      body: String
    },
    layout: {
      type: String,
      enum: ['single-page', 'multi-page'],
      default: 'single-page'
    }
  },
  content: {
    hero: {
      headline: String,
      subheadline: String,
      ctaText: String,
      backgroundImage: String
    },
    about: {
      title: String,
      content: String,
      image: String
    },
    services: [{
      title: String,
      description: String,
      icon: String,
      image: String
    }],
    testimonials: [{
      name: String,
      content: String,
      rating: Number,
      image: String
    }],
    contact: {
      title: String,
      content: String,
      formFields: [String]
    },
    footer: {
      copyright: String,
      links: [{
        text: String,
        url: String
      }]
    }
  },
  seo: {
    title: String,
    description: String,
    keywords: [String],
    ogImage: String
  },
  analytics: {
    googleAnalyticsId: String,
    facebookPixelId: String
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  domain: {
    subdomain: String,
    customDomain: String,
    isCustomDomainActive: {
      type: Boolean,
      default: false
    }
  },
  performance: {
    lastGenerated: Date,
    generationTime: Number,
    pageSpeed: Number
  },
  thumbnail: {
    filename: String,
    url: String,
    generatedAt: Date,
    dimensions: {
      width: Number,
      height: Number
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
websiteSchema.index({ userId: 1, status: 1 });
websiteSchema.index({ 'domain.subdomain': 1 });
websiteSchema.index({ 'domain.customDomain': 1 });

module.exports = mongoose.model('Website', websiteSchema);
