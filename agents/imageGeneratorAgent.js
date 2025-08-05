const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const contextManager = require('../services/contextManager');
const stockImageService = require('../services/stockImageService');
const Image = require('../models/Image');
const Website = require('../models/Website');
const NotificationService = require('../services/notificationService');

const router = express.Router();
const AGENT_ID = 'image-generator';

class ImageGeneratorAgent {
  constructor() {
    this.agentId = AGENT_ID;
    this.status = 'active';
    this.capabilities = [
      'hero-image-generation',
      'service-image-generation',
      'logo-creation',
      'icon-generation',
      'background-images'
    ];
    
    // Listen for context events
    contextManager.on('context-updated', this.handleContextUpdated.bind(this));
    
    // Start polling for notifications
    this.startNotificationPolling();
  }

  // Handle context updates from other agents
  async handleContextUpdated(event) {
    if (event.agentId === 'website-generator') {
      console.log(`[${this.agentId}] Website generation completed, checking for image requirements`);
      await this.checkForImageRequirements(event.websiteId);
    }
  }

  // Start polling for notifications
  startNotificationPolling() {
    setInterval(async () => {
      try {
        const notifications = await contextManager.getNotifications(this.agentId);
        for (const notification of notifications) {
          if (notification.type === 'stage-ready' && notification.data.stage === 'image-generation') {
            await this.processImageGeneration(notification.websiteId);
            await contextManager.markNotificationsProcessed(notification.websiteId, this.agentId);
          }
        }
      } catch (error) {
        console.error(`[${this.agentId}] Error polling notifications:`, error);
      }
    }, 5000); // Poll every 5 seconds
  }

  // Check if image generation is needed
  async checkForImageRequirements(websiteId) {
    try {
      const context = await contextManager.getContext(websiteId);
      
      if (context.workflow.currentStage === 'image-generation' && 
          context.imageAgent.status === 'pending') {
        await this.processImageGeneration(websiteId);
      }
    } catch (error) {
      console.error(`[${this.agentId}] Error checking image requirements:`, error);
    }
  }

  // Main image generation process
  async processImageGeneration(websiteId) {
    const startTime = Date.now();
    
    try {
      console.log(`[${this.agentId}] Starting image generation for website: ${websiteId}`);
      
      // Update status to analyzing
      await contextManager.updateContext(websiteId, this.agentId, {
        'imageAgent.status': 'analyzing'
      });

      // Get context and analyze requirements
      const context = await contextManager.getContext(websiteId);
      const imageRequirements = await this.analyzeImageRequirements(context);
      
      // Update context with requirements
      await contextManager.updateContext(websiteId, this.agentId, {
        'imageAgent.imageRequirements': imageRequirements,
        'imageAgent.status': 'generating'
      });

      // Generate images
      const generatedImages = await this.generateImages(imageRequirements, context);
      
      // Save images to database
      const savedImages = await this.saveImagesToDatabase(generatedImages, context.userId);
      
      // Update context with generated images
      const processingTime = Date.now() - startTime;
      await contextManager.updateContext(websiteId, this.agentId, {
        'imageAgent.status': 'completed',
        'imageAgent.generatedImages': savedImages,
        'imageAgent.lastProcessed': new Date(),
        'imageAgent.processingTime': processingTime
      });

      // Update website HTML with generated images
      await this.updateWebsiteWithImages(websiteId, savedImages);

      // Log activity
      await contextManager.logActivity(
        websiteId,
        this.agentId,
        'generated',
        'completed',
        { imageCount: savedImages.length, processingTime }
      );

      // Complete this stage and trigger next stage
      await contextManager.completeStage(websiteId, this.agentId);

      // Send notification
      try {
        await NotificationService.notifyImagesGenerated(context.userId, {
          images: savedImages
        });
      } catch (notificationError) {
        console.error('Failed to send image generation notification:', notificationError);
      }

      console.log(`[${this.agentId}] Image generation completed for ${websiteId}`);

      return { success: true, images: savedImages, processingTime };
    } catch (error) {
      console.error(`[${this.agentId}] Error generating images:`, error);
      
      // Update context with error
      await contextManager.updateContext(websiteId, this.agentId, {
        'imageAgent.status': 'failed',
        'imageAgent.error': error.message,
        'imageAgent.lastProcessed': new Date()
      });

      // Log error activity
      await contextManager.logActivity(
        websiteId,
        this.agentId,
        'generated',
        'failed',
        null,
        error.message
      );

      // Handle workflow error with retry logic
      await contextManager.handleWorkflowError(websiteId, this.agentId, error, 'image-generation');

      throw error;
    }
  }

  // Analyze what images are needed based on website content
  async analyzeImageRequirements(context) {
    const businessContext = context.businessContext;
    const websiteContent = context.websiteAgent.generatedContent;
    
    const requirements = [];

    // Hero image - highest priority
    requirements.push({
      type: 'hero',
      prompt: `Professional hero image for ${businessContext.name}, a ${businessContext.industry} business. ${businessContext.description}. Modern, clean, high-quality business photography style.`,
      style: businessContext.style || 'professional',
      dimensions: '16:9',
      priority: 1
    });

    // About section image
    if (websiteContent?.structure?.about) {
      requirements.push({
        type: 'about',
        prompt: `About us section image for ${businessContext.name} in ${businessContext.industry}. Professional team or workspace, welcoming and trustworthy atmosphere.`,
        style: 'professional',
        dimensions: '4:3',
        priority: 2
      });
    }

    // Service images
    if (businessContext.keyServices && businessContext.keyServices.length > 0) {
      businessContext.keyServices.slice(0, 3).forEach((service, index) => {
        requirements.push({
          type: 'services',
          prompt: `Professional image representing ${service} service for ${businessContext.industry} business. Clean, modern, business-appropriate style.`,
          style: 'professional',
          dimensions: '1:1',
          priority: 3 + index
        });
      });
    }

    // Contact section background
    requirements.push({
      type: 'contact',
      prompt: `Contact section background for ${businessContext.name}. Professional office or business environment, inviting and accessible.`,
      style: 'professional',
      dimensions: '16:9',
      priority: 6
    });

    return requirements;
  }

  // Select curated images based on business context
  async generateImages(requirements, context) {
    const selectedImages = [];

    try {
      console.log(`[${this.agentId}] Selecting curated images for business...`);

      // Use stock image service to select appropriate images
      const result = await stockImageService.selectImagesForWebsite(context.businessContext);

      if (result.success) {
        // Convert stock images to the expected format
        for (const [type, imageData] of Object.entries(result.images)) {
          selectedImages.push({
            type,
            url: imageData.url,
            filename: imageData.filename,
            title: imageData.title,
            description: imageData.description,
            metadata: {
              style: context.businessContext.style || 'professional',
              dimensions: type === 'hero' ? '16:9' : '4:3',
              priority: type === 'hero' ? 1 : 2,
              generatedAt: new Date(),
              service: 'stock-images',
              stockImageId: imageData._id
            }
          });
        }

        console.log(`[${this.agentId}] Selected ${selectedImages.length} curated images`);
      } else {
        console.error(`[${this.agentId}] Error selecting images:`, result.error);
      }
    } catch (error) {
      console.error(`[${this.agentId}] Error in image selection:`, error);
    }

    return selectedImages;
  }

  // Save images to database
  async saveImagesToDatabase(generatedImages, userId) {
    const savedImages = [];
    
    for (const imageData of generatedImages) {
      try {
        const image = new Image({
          userId,
          title: `${imageData.type.charAt(0).toUpperCase() + imageData.type.slice(1)} Image`,
          description: `AI-generated ${imageData.type} image`,
          prompt: imageData.prompt,
          style: imageData.metadata.style,
          filename: imageData.filename,
          originalName: imageData.filename,
          url: imageData.url,
          mimeType: 'image/jpeg',
          aspectRatio: imageData.metadata.dimensions,
          quality: 'high',
          generationModel: 'stability-core',
          generationService: 'stability-ai',
          userId,
          category: imageData.type,
          isGenerated: true,
          status: 'completed',
          metadata: imageData.metadata
        });

        const savedImage = await image.save();
        savedImages.push({
          ...imageData,
          _id: savedImage._id
        });
      } catch (error) {
        console.error(`[${this.agentId}] Error saving image to database:`, error);
        // Continue with other images
      }
    }
    
    return savedImages;
  }

  // Update website HTML with generated images
  async updateWebsiteWithImages(websiteId, generatedImages) {
    try {
      const website = await Website.findById(websiteId);
      if (!website) {
        throw new Error('Website not found');
      }

      let updatedHTML = website.content.html;

      // Replace image placeholders with actual image URLs
      for (const image of generatedImages) {
        const placeholder = this.getPlaceholderForImageType(image.type);
        if (placeholder && image.url) {
          updatedHTML = updatedHTML.replace(placeholder, image.url);
        }
      }

      // Update website content
      website.content.html = updatedHTML;
      website.content.images = generatedImages;
      await website.save();

      console.log(`[${this.agentId}] Updated website HTML with ${generatedImages.length} images`);
    } catch (error) {
      console.error(`[${this.agentId}] Error updating website with images:`, error);
      throw error;
    }
  }

  // Get placeholder string for image type
  getPlaceholderForImageType(imageType) {
    const placeholderMap = {
      'hero': '{{HERO_IMAGE_PLACEHOLDER}}',
      'about': '{{ABOUT_IMAGE_PLACEHOLDER}}',
      'services': '{{SERVICE_1_IMAGE_PLACEHOLDER}}', // For first service
      'contact': '{{CONTACT_IMAGE_PLACEHOLDER}}'
    };

    return placeholderMap[imageType] || null;
  }

  // Utility method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get agent status
  getStatus() {
    return {
      agentId: this.agentId,
      status: this.status,
      capabilities: this.capabilities,
      version: '1.0.0',
      lastActivity: new Date()
    };
  }
}

// Create agent instance
const imageGeneratorAgent = new ImageGeneratorAgent();

// API Routes
router.post('/generate', auth, [
  body('websiteId').notEmpty().withMessage('Website ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { websiteId } = req.body;
    
    // Trigger image generation
    const result = await imageGeneratorAgent.processImageGeneration(websiteId);
    
    res.json({
      message: 'Image generation completed',
      result
    });
  } catch (error) {
    console.error('Error generating images:', error);
    res.status(500).json({
      message: 'Failed to generate images',
      error: error.message
    });
  }
});

router.get('/status/:websiteId', auth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const context = await contextManager.getContext(websiteId);
    
    res.json({
      message: 'Image generation status retrieved',
      status: context.imageAgent
    });
  } catch (error) {
    console.error('Error getting image status:', error);
    res.status(500).json({
      message: 'Failed to get image status',
      error: error.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json(imageGeneratorAgent.getStatus());
});

module.exports = { router, agent: imageGeneratorAgent };
