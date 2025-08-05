const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const imageAIService = require('../services/imageAIService');
const stabilityImageService = require('../services/stabilityImageService'); // Now using Stability AI
const Image = require('../models/Image');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// @route   POST /api/images/generate
// @desc    Generate image using AI from text prompt
// @access  Private
router.post('/generate', auth, [
  body('prompt').notEmpty().withMessage('Image prompt is required'),
  body('style').optional().isString(),
  body('size').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { prompt, style = 'realistic', size = '1024x1024' } = req.body;

    // Note: This is a placeholder for image generation
    // In a real implementation, you would integrate with services like:
    // - DALL-E API
    // - Midjourney API
    // - Stable Diffusion API
    // - Google's Imagen API

    const mockImageData = {
      imageUrl: `https://via.placeholder.com/${size}/4f46e5/ffffff?text=AI+Generated+Image`,
      prompt,
      style,
      size,
      generatedAt: new Date(),
      metadata: {
        model: 'ai-image-generator',
        version: '1.0',
        processingTime: Math.random() * 5 + 2 // Mock processing time
      }
    };

    res.json({
      message: 'Image generated successfully',
      image: mockImageData
    });
  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ 
      message: 'Failed to generate image',
      error: error.message 
    });
  }
});

// @route   POST /api/images/enhance
// @desc    Enhance uploaded image using AI
// @access  Private
router.post('/enhance', auth, upload.single('image'), [
  body('enhancementType').optional().isString(),
  body('quality').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    const { enhancementType = 'general', quality = 80 } = req.body;

    // Note: This is a placeholder for image enhancement
    // In a real implementation, you would process the uploaded image
    // using AI services for enhancement, upscaling, etc.

    const enhancedImageData = {
      originalSize: req.file.size,
      originalMimetype: req.file.mimetype,
      enhancementType,
      quality,
      enhancedImageUrl: `https://via.placeholder.com/1024x1024/4f46e5/ffffff?text=Enhanced+Image`,
      enhancedAt: new Date(),
      metadata: {
        processingTime: Math.random() * 10 + 5,
        improvements: ['noise_reduction', 'sharpening', 'color_enhancement']
      }
    };

    res.json({
      message: 'Image enhanced successfully',
      enhancedImage: enhancedImageData
    });
  } catch (error) {
    console.error('Error enhancing image:', error);
    res.status(500).json({ 
      message: 'Failed to enhance image',
      error: error.message 
    });
  }
});

// @route   POST /api/images/product/generate
// @desc    Generate product images from description
// @access  Private
router.post('/product/generate', auth, [
  body('productName').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Product description is required'),
  body('category').optional().isString(),
  body('style').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { productName, description, category = 'general', style = 'professional' } = req.body;

    // Create enhanced prompt for product image generation
    const enhancedPrompt = `Professional product photography of ${productName}. ${description}. ${style} style, high quality, commercial photography, clean background, well-lit, ${category} product.`;

    // Mock product image generation
    const productImages = [
      {
        imageUrl: `https://via.placeholder.com/800x800/4f46e5/ffffff?text=${encodeURIComponent(productName)}+1`,
        variant: 'main',
        style: 'front_view'
      },
      {
        imageUrl: `https://via.placeholder.com/800x800/64748b/ffffff?text=${encodeURIComponent(productName)}+2`,
        variant: 'alternate',
        style: 'side_view'
      },
      {
        imageUrl: `https://via.placeholder.com/800x800/f59e0b/ffffff?text=${encodeURIComponent(productName)}+3`,
        variant: 'lifestyle',
        style: 'in_use'
      }
    ];

    res.json({
      message: 'Product images generated successfully',
      productName,
      images: productImages,
      prompt: enhancedPrompt,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating product images:', error);
    res.status(500).json({ 
      message: 'Failed to generate product images',
      error: error.message 
    });
  }
});

// @route   POST /api/images/sketch-to-image
// @desc    Convert sketch to realistic image
// @access  Private
router.post('/sketch-to-image', auth, upload.single('sketch'), [
  body('prompt').optional().isString(),
  body('style').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No sketch file uploaded' });
    }

    const { prompt = '', style = 'realistic' } = req.body;

    // Note: This would integrate with sketch-to-image AI services
    // like ControlNet, Scribble Diffusion, etc.

    const convertedImageData = {
      originalSketch: {
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      convertedImageUrl: `https://via.placeholder.com/1024x1024/4f46e5/ffffff?text=Sketch+to+Image+Result`,
      prompt,
      style,
      convertedAt: new Date(),
      metadata: {
        processingTime: Math.random() * 15 + 10,
        model: 'sketch-to-image-ai',
        confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
      }
    };

    res.json({
      message: 'Sketch converted to image successfully',
      convertedImage: convertedImageData
    });
  } catch (error) {
    console.error('Error converting sketch to image:', error);
    res.status(500).json({ 
      message: 'Failed to convert sketch to image',
      error: error.message 
    });
  }
});

// @route   GET /api/images/styles
// @desc    Get available image styles and options
// @access  Private
router.get('/styles', auth, (req, res) => {
  const imageStyles = {
    general: [
      'realistic',
      'artistic',
      'cartoon',
      'minimalist',
      'vintage',
      'modern'
    ],
    product: [
      'professional',
      'lifestyle',
      'studio',
      'outdoor',
      'minimalist',
      'luxury'
    ],
    enhancement: [
      'general',
      'portrait',
      'landscape',
      'product',
      'artistic',
      'vintage_restoration'
    ]
  };

  const imageSizes = [
    '512x512',
    '768x768',
    '1024x1024',
    '1024x768',
    '768x1024',
    '1920x1080'
  ];

  res.json({
    styles: imageStyles,
    sizes: imageSizes,
    supportedFormats: ['JPEG', 'PNG', 'WebP'],
    maxFileSize: '10MB'
  });
});

// @route   POST /api/images/background/remove
// @desc    Remove background from image
// @access  Private
router.post('/background/remove', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded' });
    }

    // Note: This would integrate with background removal services
    // like Remove.bg API, or AI models for background removal

    const processedImageData = {
      originalImage: {
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      processedImageUrl: `https://via.placeholder.com/1024x1024/transparent/000000?text=Background+Removed`,
      processedAt: new Date(),
      metadata: {
        processingTime: Math.random() * 8 + 3,
        backgroundRemoved: true,
        format: 'PNG' // Transparent background requires PNG
      }
    };

    res.json({
      message: 'Background removed successfully',
      processedImage: processedImageData
    });
  } catch (error) {
    console.error('Error removing background:', error);
    res.status(500).json({ 
      message: 'Failed to remove background',
      error: error.message 
    });
  }
});

// @route   POST /api/images/generate-prompt
// @desc    Generate optimized image prompt using AI
// @access  Private
router.post('/generate-prompt', auth, [
  body('description').notEmpty().withMessage('Description is required'),
  body('style').optional().isString(),
  body('mood').optional().isString()
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
      description,
      style,
      mood,
      colors,
      composition,
      aspectRatio,
      quality,
      subject,
      environment,
      lighting
    } = req.body;

    const promptData = await imageAIService.generateImagePrompt({
      description,
      style,
      mood,
      colors,
      composition,
      aspectRatio,
      quality,
      subject,
      environment,
      lighting
    });

    // Save the generated prompt to database if Image model exists
    let imageRecord = null;
    try {
      imageRecord = new Image({
        userId: req.user.id,
        title: description.substring(0, 100),
        description,
        prompt: promptData.optimizedPrompt,
        negativePrompt: promptData.negativePrompt,
        style,
        mood,
        colors,
        composition,
        aspectRatio,
        quality,
        subject,
        environment,
        lighting,
        status: 'prompt_generated',
        metadata: {
          styleKeywords: promptData.styleKeywords,
          technicalSpecs: promptData.technicalSpecs,
          variations: promptData.variations,
          tips: promptData.tips
        }
      });

      await imageRecord.save();
    } catch (dbError) {
      console.log('Image model not available, skipping database save');
    }

    res.json({
      message: 'Image prompt generated successfully',
      image: imageRecord,
      promptData
    });
  } catch (error) {
    console.error('Error generating image prompt:', error);
    res.status(500).json({
      message: 'Failed to generate image prompt',
      error: error.message
    });
  }
});

// @route   POST /api/images/enhance-prompt
// @desc    Enhance existing image prompt
// @access  Private
router.post('/enhance-prompt', auth, [
  body('originalPrompt').notEmpty().withMessage('Original prompt is required'),
  body('enhancementType').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { originalPrompt, enhancementType } = req.body;

    const enhancedData = await imageAIService.enhanceImagePrompt(originalPrompt, enhancementType);

    res.json({
      message: 'Prompt enhanced successfully',
      enhancedData
    });
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    res.status(500).json({
      message: 'Failed to enhance prompt',
      error: error.message
    });
  }
});

// @route   POST /api/images/generate-concepts
// @desc    Generate multiple image concepts for a theme
// @access  Private
router.post('/generate-concepts', auth, [
  body('theme').notEmpty().withMessage('Theme is required'),
  body('count').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { theme, count } = req.body;

    const conceptsData = await imageAIService.generateImageConcepts(theme, count);

    res.json({
      message: 'Image concepts generated successfully',
      conceptsData
    });
  } catch (error) {
    console.error('Error generating concepts:', error);
    res.status(500).json({
      message: 'Failed to generate concepts',
      error: error.message
    });
  }
});

// @route   POST /api/images/analyze-requirements
// @desc    Analyze image description and provide suggestions
// @access  Private
router.post('/analyze-requirements', auth, [
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { description } = req.body;

    const analysisData = await imageAIService.analyzeImageRequirements(description);

    res.json({
      message: 'Requirements analyzed successfully',
      analysisData
    });
  } catch (error) {
    console.error('Error analyzing requirements:', error);
    res.status(500).json({
      message: 'Failed to analyze requirements',
      error: error.message
    });
  }
});

// @route   POST /api/images/generate-from-prompt
// @desc    Generate actual image from prompt
// @access  Private
router.post('/generate-from-prompt', auth, [
  body('prompt').notEmpty().withMessage('Prompt is required'),
  body('imageId').optional().isString()
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
      imageId,
      width = 1024,
      height = 1024,
      steps = 20,
      guidance = 7.5,
      count = 1
    } = req.body;

    // Update image status to generating if imageId provided
    if (imageId) {
      try {
        await Image.findOneAndUpdate(
          { _id: imageId, userId: req.user.id },
          { status: 'generating', generatedAt: new Date() }
        );
      } catch (dbError) {
        console.log('Could not update image status');
      }
    }

    const options = { width, height, steps, guidance };

    let generatedImages;
    if (count > 1) {
      generatedImages = await imageAIService.generateMultipleImages(prompt, count, options);
    } else {
      const singleImage = await imageAIService.generateImageFromPrompt(prompt, options);
      generatedImages = [singleImage];
    }

    // Update image record with generated image data
    if (imageId) {
      try {
        const updatedImage = await Image.findOneAndUpdate(
          { _id: imageId, userId: req.user.id },
          {
            status: 'generated',
            imageUrl: generatedImages[0].imageUrl,
            thumbnailUrl: generatedImages[0].thumbnailUrl,
            'metadata.generationTime': generatedImages[0].processingTime,
            'metadata.model': generatedImages[0].model,
            'metadata.version': generatedImages[0].version,
            'metadata.seed': generatedImages[0].seed,
            'metadata.steps': generatedImages[0].steps,
            'metadata.guidance': generatedImages[0].guidance
          },
          { new: true }
        );

        res.json({
          message: 'Images generated successfully',
          images: generatedImages,
          imageRecord: updatedImage
        });
      } catch (dbError) {
        console.log('Could not update image record, returning generated images only');
        res.json({
          message: 'Images generated successfully',
          images: generatedImages
        });
      }
    } else {
      res.json({
        message: 'Images generated successfully',
        images: generatedImages
      });
    }
  } catch (error) {
    console.error('Error generating image:', error);

    // Update image status to failed if imageId provided
    if (req.body.imageId) {
      try {
        await Image.findOneAndUpdate(
          { _id: req.body.imageId, userId: req.user.id },
          { status: 'failed' }
        );
      } catch (dbError) {
        console.log('Could not update image status to failed');
      }
    }

    res.status(500).json({
      message: 'Failed to generate image',
      error: error.message
    });
  }
});

// @route   POST /api/images/test-generation
// @desc    Test image generation with a simple prompt
// @access  Private
router.post('/test-generation', auth, async (req, res) => {
  try {
    const testPrompt = req.body.prompt || "a beautiful sunset over mountains, digital art, high quality";

    console.log('Testing image generation with prompt:', testPrompt);

    const testImage = await imageAIService.generateImageFromPrompt(testPrompt, {
      width: 512,
      height: 512
    });

    res.json({
      message: 'Test image generated successfully',
      image: testImage,
      testUrl: testImage.imageUrl
    });
  } catch (error) {
    console.error('Error in test generation:', error);
    res.status(500).json({
      message: 'Test generation failed',
      error: error.message
    });
  }
});

// @route   POST /api/images/generate-with-stability
// @desc    Generate images using Stability AI
// @access  Private
router.post('/generate-with-stability', auth, [
  body('prompt').notEmpty().withMessage('Prompt is required'),
  body('prompt').isLength({ min: 3, max: 2000 }).withMessage('Prompt must be between 3 and 2000 characters')
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
      style = 'realistic',
      quality = 'high',
      aspectRatio = '1:1',
      numberOfImages = 1
    } = req.body;

    console.log('Generating images with Stability AI:', { prompt, style, quality, aspectRatio, numberOfImages });

    // Generate images using Stability AI
    const result = await stabilityImageService.generateImage(prompt, {
      style,
      quality,
      aspectRatio,
      numberOfImages: Math.min(numberOfImages, 4), // Limit to 4 images max
      outputMimeType: 'image/jpeg'
    });

    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to generate images',
        error: 'Image generation service error'
      });
    }

    // Save image metadata to database
    const savedImages = [];
    for (const imageData of result.images) {
      try {
        const image = new Image({
          filename: imageData.fileName,
          originalName: `generated_${Date.now()}.jpg`,
          url: imageData.url,
          size: imageData.size,
          mimeType: 'image/jpeg',
          width: parseInt(aspectRatio.split(':')[0]) * 256,
          height: parseInt(aspectRatio.split(':')[1]) * 256,
          aspectRatio,
          prompt: imageData.prompt,
          enhancedPrompt: imageData.prompt,
          style,
          quality,
          generationModel: 'stability-core',
          generationService: 'stability-ai',
          processingTime: Date.now() - new Date(imageData.generatedAt).getTime(),
          userId: req.user.id,
          category: 'generated',
          isGenerated: true,
          status: 'completed'
        });

        const savedImage = await image.save();
        savedImages.push(savedImage);
      } catch (saveError) {
        console.error('Error saving image metadata:', saveError);
        // Continue with other images even if one fails to save
      }
    }

    res.json({
      message: 'Images generated successfully with Stability AI',
      images: result.images,
      savedImages,
      metadata: {
        prompt,
        style,
        quality,
        aspectRatio,
        numberOfImages: result.images.length,
        generatedAt: new Date(),
        service: 'stability-ai'
      }
    });

  } catch (error) {
    console.error('Error generating images with Stability AI:', error);
    res.status(500).json({
      message: 'Failed to generate images',
      error: error.message
    });
  }
});

// @route   POST /api/images/generate-with-gemini
// @desc    Generate images using Stability AI (legacy Gemini endpoint for compatibility)
// @access  Private
router.post('/generate-with-gemini', auth, [
  body('prompt').notEmpty().withMessage('Prompt is required'),
  body('prompt').isLength({ min: 3, max: 2000 }).withMessage('Prompt must be between 3 and 2000 characters')
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
      style = 'realistic',
      quality = 'high',
      aspectRatio = '1:1',
      numberOfImages = 1
    } = req.body;

    console.log('Generating images with Stability AI (legacy Gemini endpoint):', { prompt, style, quality, aspectRatio, numberOfImages });

    // Generate images using Stability AI
    const result = await stabilityImageService.generateImage(prompt, {
      style,
      quality,
      aspectRatio,
      numberOfImages: Math.min(numberOfImages, 4), // Limit to 4 images max
      outputMimeType: 'image/jpeg'
    });

    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to generate images',
        error: 'Image generation service error'
      });
    }

    // Save image metadata to database
    const savedImages = [];
    for (const imageData of result.images) {
      try {
        const image = new Image({
          filename: imageData.fileName,
          originalName: `generated_${Date.now()}.jpg`,
          mimetype: 'image/jpeg',
          size: imageData.size || 0,
          userId: req.user.id,
          prompt: prompt,
          style: style,
          quality: quality,
          aspectRatio: aspectRatio,
          generatedWith: 'stability-ai',
          metadata: {
            service: 'stability-ai',
            model: 'stable-diffusion',
            generatedAt: new Date(),
            settings: { style, quality, aspectRatio }
          }
        });

        await image.save();
        savedImages.push({
          id: image._id,
          url: imageData.url,
          filename: imageData.fileName,
          prompt: prompt,
          style: style,
          metadata: image.metadata
        });
      } catch (saveError) {
        console.error('Error saving image metadata:', saveError);
        // Continue with other images even if one fails to save
      }
    }

    res.json({
      message: 'Images generated successfully with Stability AI',
      images: savedImages,
      totalGenerated: result.images.length,
      service: 'stability-ai'
    });

  } catch (error) {
    console.error('Error generating images:', error);
    res.status(500).json({
      message: 'Failed to generate images',
      error: error.message
    });
  }
});

// @route   POST /api/images/generate-website-images-gemini
// @desc    Generate a complete set of website images using Gemini AI
// @access  Private
router.post('/generate-website-images-gemini', auth, [
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

    const { businessName, industry, style = 'professional', description } = req.body;

    console.log('Generating website images with Stability AI:', { businessName, industry, style });

    // Generate website images using Stability AI
    const result = await stabilityImageService.generateWebsiteImages({
      businessName,
      industry,
      style,
      description: description || `A ${industry} business focused on quality and customer satisfaction`
    });

    if (!result.success) {
      return res.status(500).json({
        message: 'Failed to generate website images',
        error: 'Image generation service error'
      });
    }

    // Save all generated images to database
    const savedImages = {};
    for (const [type, imageData] of Object.entries(result.images)) {
      try {
        const image = new Image({
          filename: imageData.fileName,
          originalName: `${businessName}_${type}_${Date.now()}.jpg`,
          url: imageData.url,
          size: imageData.size,
          mimeType: imageData.mimeType,
          aspectRatio: imageData.aspectRatio,
          prompt: imageData.prompt,
          enhancedPrompt: imageData.prompt,
          style,
          quality: 'high',
          generationModel: 'stability-core',
          generationService: 'stability-ai',
          processingTime: Date.now() - new Date(imageData.generatedAt).getTime(),
          userId: req.user.id,
          category: type, // hero, about, services, contact
          isGenerated: true,
          status: 'completed',
          tags: [businessName, industry, type]
        });

        const savedImage = await image.save();
        savedImages[type] = savedImage;
      } catch (saveError) {
        console.error(`Error saving ${type} image metadata:`, saveError);
        // Continue with other images even if one fails to save
      }
    }

    res.json({
      message: 'Website images generated successfully with Stability AI',
      images: result.images,
      savedImages,
      metadata: {
        businessName,
        industry,
        style,
        generatedAt: new Date(),
        service: 'stability-ai'
      }
    });

  } catch (error) {
    console.error('Error generating website images with Stability AI:', error);
    res.status(500).json({
      message: 'Failed to generate website images',
      error: error.message
    });
  }
});

module.exports = router;
