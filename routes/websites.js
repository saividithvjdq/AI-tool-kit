const express = require('express');
const { body, validationResult } = require('express-validator');
const Website = require('../models/Website');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const geminiImageService = require('../services/geminiImageService');

// Optional thumbnail service - only load if available
let thumbnailService = null;
try {
  thumbnailService = require('../services/thumbnailService');
} catch (error) {
  console.warn('Thumbnail service not available in websites routes - puppeteer not installed');
}

const router = express.Router();

// @route   POST /api/websites/generate
// @desc    Generate a new website using AI
// @access  Private
router.post('/generate', auth, [
  body('businessInfo.name').notEmpty().withMessage('Business name is required'),
  body('businessInfo.industry').notEmpty().withMessage('Industry is required'),
  body('businessInfo.description').notEmpty().withMessage('Business description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { businessInfo, preferences = {} } = req.body;
    const startTime = Date.now();

    // Generate website content using AI
    const aiContent = await aiService.generateWebsiteContent(businessInfo);

    // Create color scheme
    const colorScheme = preferences.colorScheme || {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937'
    };

    // Create new website
    const website = new Website({
      userId: req.user.id,
      businessInfo,
      design: {
        template: preferences.template || 'modern',
        colorScheme,
        fonts: preferences.fonts || {
          heading: 'Inter',
          body: 'Inter'
        },
        layout: preferences.layout || 'single-page'
      },
      content: aiContent,
      seo: aiContent.seo || {
        title: `${businessInfo.name} - ${businessInfo.industry}`,
        description: businessInfo.description,
        keywords: [businessInfo.industry, businessInfo.name, ...businessInfo.keyServices]
      },
      domain: {
        subdomain: businessInfo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
      },
      performance: {
        lastGenerated: new Date(),
        generationTime: Date.now() - startTime
      }
    });

    await website.save();

    // Generate public URL
    const username = req.user.name.replace(/\s+/g, '').toLowerCase();
    const publicUrl = `${process.env.CLIENT_URL || 'http://localhost:3001'}/websites/${username}`;

    res.status(201).json({
      message: 'Website generated successfully',
      website: {
        ...website.toObject(),
        publicUrl
      },
      generationTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Website generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate website',
      error: error.message 
    });
  }
});

// @route   GET /api/websites
// @desc    Get all websites for the user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { userId: req.user.id };
    
    if (status) {
      query.status = status;
    }

    const websites = await Website.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Website.countDocuments(query);

    res.json({
      websites,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching websites:', error);
    res.status(500).json({ message: 'Failed to fetch websites' });
  }
});

// @route   GET /api/websites/:id
// @desc    Get a specific website
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    res.json(website);
  } catch (error) {
    console.error('Error fetching website:', error);
    res.status(500).json({ message: 'Failed to fetch website' });
  }
});

// @route   PUT /api/websites/:id
// @desc    Update a website
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    const updates = req.body;
    Object.assign(website, updates);
    
    await website.save();

    res.json({
      message: 'Website updated successfully',
      website
    });
  } catch (error) {
    console.error('Error updating website:', error);
    res.status(500).json({ message: 'Failed to update website' });
  }
});

// @route   DELETE /api/websites/:id
// @desc    Delete a website
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const website = await Website.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    res.json({ message: 'Website deleted successfully' });
  } catch (error) {
    console.error('Error deleting website:', error);
    res.status(500).json({ message: 'Failed to delete website' });
  }
});

// @route   POST /api/websites/:id/publish
// @desc    Publish a website
// @access  Private
router.post('/:id/publish', auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    website.status = 'published';
    website.publishedAt = new Date();
    await website.save();

    // Generate public URL
    const user = await User.findById(website.userId);
    const username = user.name.replace(/\s+/g, '').toLowerCase();
    const publicUrl = `${process.env.CLIENT_URL || 'http://localhost:3001'}/websites/${username}`;

    res.json({
      message: 'Website published successfully',
      website: {
        ...website.toObject(),
        publicUrl
      },
      url: publicUrl
    });
  } catch (error) {
    console.error('Error publishing website:', error);
    res.status(500).json({ message: 'Failed to publish website' });
  }
});

// @route   POST /api/websites/:id/unpublish
// @desc    Unpublish a website
// @access  Private
router.post('/:id/unpublish', auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    website.status = 'draft';
    await website.save();

    res.json({
      message: 'Website unpublished successfully',
      website
    });
  } catch (error) {
    console.error('Error unpublishing website:', error);
    res.status(500).json({ message: 'Failed to unpublish website' });
  }
});

// @route   POST /api/websites/:id/regenerate
// @desc    Regenerate website content using AI
// @access  Private
router.post('/:id/regenerate', auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    const startTime = Date.now();
    
    // Regenerate content using AI
    const aiContent = await aiService.generateWebsiteContent(website.businessInfo);
    
    // Update website content
    website.content = { ...website.content, ...aiContent };
    website.performance.lastGenerated = new Date();
    website.performance.generationTime = Date.now() - startTime;
    
    await website.save();

    res.json({
      message: 'Website content regenerated successfully',
      website,
      generationTime: Date.now() - startTime
    });
  } catch (error) {
    console.error('Error regenerating website:', error);
    res.status(500).json({ message: 'Failed to regenerate website content' });
  }
});

// @route   GET /api/websites/public/:username
// @desc    Get public website by username (latest published website)
// @access  Public
router.get('/public/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Find user by matching the username generation logic
    // Username is generated by: name.replace(/\s+/g, '').toLowerCase()
    // So we need to find a user whose name, when converted, matches the username
    console.log('Looking for username:', username);
    const users = await User.find({});
    console.log('Available users:', users.map(u => ({
      name: u.name,
      generatedUsername: u.name.replace(/\s+/g, '').toLowerCase()
    })));

    const user = users.find(u =>
      u.name.replace(/\s+/g, '').toLowerCase() === username.toLowerCase()
    );
    console.log('Found user:', user ? user.name : 'None');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find latest published website for this user
    const website = await Website.findOne({
      userId: user._id,
      status: 'published'
    }).sort({ publishedAt: -1 }); // Get the most recently published website

    if (!website) {
      return res.status(404).json({ message: 'No published website found for this user' });
    }

    res.json({
      website: {
        id: website._id,
        businessInfo: website.businessInfo,
        content: website.content,
        template: website.template,
        colorScheme: website.colorScheme,
        publishedAt: website.publishedAt,
        owner: {
          name: user.name,
          username: username
        }
      }
    });
  } catch (error) {
    console.error('Error fetching public website:', error);
    res.status(500).json({ message: 'Failed to fetch website' });
  }
});

// @route   GET /api/websites/user/:username
// @desc    Get all published websites by username
// @access  Public
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Find user by matching the username generation logic
    // Username is generated by: name.replace(/\s+/g, '').toLowerCase()
    // So we need to find a user whose name, when converted, matches the username
    const users = await User.find({});
    const user = users.find(u =>
      u.name.replace(/\s+/g, '').toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find all published websites for this user
    const websites = await Website.find({
      userId: user._id,
      status: 'published'
    }).sort({ publishedAt: -1 });

    res.json({
      user: {
        name: user.name,
        username: username
      },
      websites: websites.map(website => ({
        id: website._id,
        businessInfo: website.businessInfo,
        template: website.template,
        publishedAt: website.publishedAt,
        url: `/websites/${username}`,
        isLatest: website._id.toString() === websites[0]._id.toString() // Mark the latest one
      }))
    });
  } catch (error) {
    console.error('Error fetching user websites:', error);
    res.status(500).json({ message: 'Failed to fetch websites' });
  }
});

// @route   GET /api/websites/debug/users
// @desc    Debug route to list all users (development only)
// @access  Public
router.get('/debug/users', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(404).json({ message: 'Not found' });
    }

    const users = await User.find({}, 'name email').limit(10);
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// @route   POST /api/websites/generate-images
// @desc    Generate images for website using Gemini AI
// @access  Private
router.post('/generate-images', auth, [
  body('businessName').notEmpty().withMessage('Business name is required'),
  body('industry').notEmpty().withMessage('Industry is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { businessName, industry, style, description } = req.body;

    console.log('Generating images for website:', { businessName, industry, style });

    // Generate website images using Gemini AI
    const imageResult = await geminiImageService.generateWebsiteImages({
      businessName,
      industry,
      style: style || 'professional',
      description: description || `A ${industry} business focused on quality and customer satisfaction`
    });

    if (!imageResult.success) {
      return res.status(500).json({
        message: 'Failed to generate images',
        error: 'Image generation service error'
      });
    }

    res.json({
      message: 'Images generated successfully',
      images: imageResult.images,
      metadata: {
        businessName,
        industry,
        style,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error generating website images:', error);
    res.status(500).json({
      message: 'Failed to generate images',
      error: error.message
    });
  }
});

// @route   POST /api/websites/generate-single-image
// @desc    Generate a single image using Gemini AI
// @access  Private
router.post('/generate-single-image', auth, [
  body('prompt').notEmpty().withMessage('Image prompt is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      prompt,
      aspectRatio = '1:1',
      style = 'professional',
      quality = 'high',
      numberOfImages = 1
    } = req.body;

    console.log('Generating single image with prompt:', prompt);

    // Generate image using Gemini AI
    const imageResult = await geminiImageService.generateImage(prompt, {
      aspectRatio,
      style,
      quality,
      numberOfImages
    });

    if (!imageResult.success) {
      return res.status(500).json({
        message: 'Failed to generate image',
        error: 'Image generation service error'
      });
    }

    res.json({
      message: 'Image generated successfully',
      images: imageResult.images,
      prompt: imageResult.prompt,
      metadata: imageResult.metadata
    });
  } catch (error) {
    console.error('Error generating single image:', error);
    res.status(500).json({
      message: 'Failed to generate image',
      error: error.message
    });
  }
});

// @route   DELETE /api/websites/images/:fileName
// @desc    Delete a generated image
// @access  Private
router.delete('/images/:fileName', auth, async (req, res) => {
  try {
    const { fileName } = req.params;

    const result = await geminiImageService.deleteImage(fileName);

    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to delete image',
        error: result.error
      });
    }

    res.json({
      message: 'Image deleted successfully',
      fileName
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

// Utility function to sanitize business name for URL
const sanitizeBusinessName = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim('-'); // Remove leading/trailing hyphens
};

// Utility function to sanitize username for URL
const sanitizeUsername = (username) => {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
};

// @route   PUT /api/websites/:id/publish
// @desc    Publish a website to make it publicly accessible
// @access  Private
router.put('/:id/publish', auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    // Get user info for URL generation
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update website status to published
    website.status = 'published';
    await website.save();

    // Generate public URL
    const publicUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/${sanitizeUsername(user.username)}/${sanitizeBusinessName(website.businessInfo.name)}`;

    res.json({
      message: 'Website published successfully',
      website,
      publicUrl
    });
  } catch (error) {
    console.error('Error publishing website:', error);
    res.status(500).json({ message: 'Failed to publish website' });
  }
});

// @route   PUT /api/websites/:id/unpublish
// @desc    Unpublish a website to make it private
// @access  Private
router.put('/:id/unpublish', auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    // Update website status to draft
    website.status = 'draft';
    await website.save();

    res.json({
      message: 'Website unpublished successfully',
      website
    });
  } catch (error) {
    console.error('Error unpublishing website:', error);
    res.status(500).json({ message: 'Failed to unpublish website' });
  }
});

// @route   GET /api/websites/:id/public-url
// @desc    Get the public URL for a website
// @access  Private
router.get('/:id/public-url', auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    // Get user info for URL generation
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate public URL
    const publicUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/${sanitizeUsername(user.username)}/${sanitizeBusinessName(website.businessInfo.name)}`;

    res.json({
      publicUrl,
      isPublished: website.status === 'published'
    });
  } catch (error) {
    console.error('Error getting public URL:', error);
    res.status(500).json({ message: 'Failed to get public URL' });
  }
});

// @route   POST /api/websites/:id/generate-thumbnail
// @desc    Generate thumbnail for a website
// @access  Private
router.post('/:id/generate-thumbnail', auth, async (req, res) => {
  try {
    const website = await Website.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!website) {
      return res.status(404).json({ message: 'Website not found' });
    }

    // Check if thumbnail service is available
    if (!thumbnailService) {
      return res.status(503).json({
        message: 'Thumbnail service not available - puppeteer not installed',
        error: 'Service unavailable'
      });
    }

    // Generate thumbnail
    const result = await thumbnailService.generateWebsiteThumbnail(website);

    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to generate thumbnail',
        error: result.error
      });
    }

    res.json({
      message: 'Thumbnail generated successfully',
      thumbnail: website.thumbnail
    });
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).json({ message: 'Failed to generate thumbnail' });
  }
});

module.exports = router;
