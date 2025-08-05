const StockImage = require('../models/StockImage');
const path = require('path');
const fs = require('fs').promises;

class StockImageService {
  constructor() {
    this.defaultImages = this.getDefaultImageSet();
  }

  // Get default image set for different industries and categories
  getDefaultImageSet() {
    return {
      technology: {
        hero: [
          {
            filename: 'tech-hero-1.jpg',
            url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=1200&h=600&fit=crop',
            title: 'Modern Technology Workspace',
            description: 'Clean, modern workspace with laptops and technology',
            tags: ['technology', 'workspace', 'modern', 'computers', 'office'],
            style: 'professional'
          },
          {
            filename: 'tech-hero-2.jpg',
            url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=600&fit=crop',
            title: 'Digital Innovation',
            description: 'Abstract digital technology background',
            tags: ['technology', 'digital', 'innovation', 'abstract', 'blue'],
            style: 'modern'
          }
        ],
        about: [
          {
            filename: 'tech-about-1.jpg',
            url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
            title: 'Tech Team Collaboration',
            description: 'Professional team working together on technology projects',
            tags: ['team', 'collaboration', 'technology', 'office', 'professional'],
            style: 'professional'
          }
        ],
        services: [
          {
            filename: 'tech-service-1.jpg',
            url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
            title: 'Data Analytics',
            description: 'Data visualization and analytics dashboard',
            tags: ['analytics', 'data', 'dashboard', 'charts', 'technology'],
            style: 'professional'
          }
        ]
      },
      healthcare: {
        hero: [
          {
            filename: 'health-hero-1.jpg',
            url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&h=600&fit=crop',
            title: 'Healthcare Professional',
            description: 'Caring healthcare professional in modern medical facility',
            tags: ['healthcare', 'medical', 'professional', 'care', 'hospital'],
            style: 'professional'
          }
        ],
        about: [
          {
            filename: 'health-about-1.jpg',
            url: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&h=600&fit=crop',
            title: 'Medical Team',
            description: 'Dedicated medical team providing quality healthcare',
            tags: ['medical', 'team', 'healthcare', 'doctors', 'professional'],
            style: 'professional'
          }
        ]
      },
      finance: {
        hero: [
          {
            filename: 'finance-hero-1.jpg',
            url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&h=600&fit=crop',
            title: 'Financial Growth',
            description: 'Professional financial planning and growth concepts',
            tags: ['finance', 'growth', 'business', 'professional', 'success'],
            style: 'professional'
          }
        ]
      },
      retail: {
        hero: [
          {
            filename: 'retail-hero-1.jpg',
            url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=600&fit=crop',
            title: 'Modern Retail Store',
            description: 'Clean, modern retail environment with excellent customer experience',
            tags: ['retail', 'store', 'shopping', 'modern', 'customer'],
            style: 'modern'
          }
        ]
      },
      food: {
        hero: [
          {
            filename: 'food-hero-1.jpg',
            url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=600&fit=crop',
            title: 'Gourmet Restaurant',
            description: 'Beautiful restaurant setting with delicious food presentation',
            tags: ['food', 'restaurant', 'dining', 'gourmet', 'cuisine'],
            style: 'professional'
          }
        ]
      },
      fitness: {
        hero: [
          {
            filename: 'fitness-hero-1.jpg',
            url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=600&fit=crop',
            title: 'Modern Gym',
            description: 'State-of-the-art fitness facility with modern equipment',
            tags: ['fitness', 'gym', 'exercise', 'health', 'modern'],
            style: 'modern'
          }
        ]
      }
    };
  }

  // Initialize default images in database
  async initializeDefaultImages() {
    try {
      const existingCount = await StockImage.countDocuments();
      if (existingCount > 0) {
        console.log('Stock images already initialized');
        return;
      }

      const imagesToInsert = [];

      for (const [industry, categories] of Object.entries(this.defaultImages)) {
        for (const [category, images] of Object.entries(categories)) {
          for (const imageData of images) {
            imagesToInsert.push({
              ...imageData,
              originalName: imageData.filename,
              industries: [industry],
              category,
              dimensions: {
                width: category === 'hero' ? 1200 : 800,
                height: category === 'hero' ? 600 : 600,
                aspectRatio: category === 'hero' ? '16:9' : '4:3'
              },
              mimeType: 'image/jpeg',
              quality: 'high',
              metadata: {
                source: 'unsplash',
                license: 'free'
              },
              isActive: true
            });
          }
        }
      }

      await StockImage.insertMany(imagesToInsert);
      console.log(`✅ Initialized ${imagesToInsert.length} default stock images`);
    } catch (error) {
      console.error('Error initializing default images:', error);
    }
  }

  // Get recommended images for a business
  async getRecommendedImages(businessInfo) {
    try {
      const recommendations = await StockImage.getRecommendedImages(businessInfo);
      
      // If no specific recommendations found, get default images
      if (recommendations.length === 0) {
        return await this.getDefaultRecommendations(businessInfo);
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting recommended images:', error);
      return await this.getDefaultRecommendations(businessInfo);
    }
  }

  // Get default recommendations when no specific matches found
  async getDefaultRecommendations(businessInfo) {
    const { industry = 'technology' } = businessInfo;
    
    const categories = ['hero', 'about', 'services'];
    const recommendations = [];

    for (const category of categories) {
      const images = await StockImage.find({
        $or: [
          { industries: industry },
          { industries: 'technology' } // Fallback to technology
        ],
        category,
        isActive: true
      }).limit(3).sort({ 'usage.popularityScore': -1 });

      if (images.length > 0) {
        recommendations.push({
          category,
          recommendedImages: images,
          topImage: images[0]
        });
      }
    }

    return recommendations;
  }

  // Select images for website generation
  async selectImagesForWebsite(businessInfo) {
    try {
      const recommendations = await this.getRecommendedImages(businessInfo);
      const selectedImages = {};

      for (const categoryData of recommendations) {
        const { category, topImage } = categoryData;
        if (topImage) {
          selectedImages[category] = {
            _id: topImage._id,
            url: topImage.url,
            title: topImage.title,
            description: topImage.description,
            filename: topImage.filename
          };

          // Increment usage count
          await StockImage.findByIdAndUpdate(topImage._id, {
            $inc: { 'usage.downloadCount': 1 },
            $set: { 'usage.lastUsed': new Date() }
          });
        }
      }

      return {
        success: true,
        images: selectedImages,
        totalSelected: Object.keys(selectedImages).length
      };
    } catch (error) {
      console.error('Error selecting images for website:', error);
      return {
        success: false,
        error: error.message,
        images: {}
      };
    }
  }

  // Search images by criteria
  async searchImages(criteria = {}) {
    try {
      const {
        industry,
        category,
        tags,
        style,
        limit = 20,
        page = 1
      } = criteria;

      const query = { isActive: true };

      if (industry) query.industries = industry;
      if (category) query.category = category;
      if (style) query.style = style;
      if (tags && tags.length > 0) {
        query.tags = { $in: tags.map(tag => tag.toLowerCase()) };
      }

      const skip = (page - 1) * limit;

      const images = await StockImage.find(query)
        .sort({ 'usage.popularityScore': -1, createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await StockImage.countDocuments(query);

      return {
        success: true,
        images,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error searching images:', error);
      return {
        success: false,
        error: error.message,
        images: []
      };
    }
  }

  // Get image by ID
  async getImageById(imageId) {
    try {
      const image = await StockImage.findById(imageId);
      return {
        success: !!image,
        image
      };
    } catch (error) {
      console.error('Error getting image by ID:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new StockImageService();
