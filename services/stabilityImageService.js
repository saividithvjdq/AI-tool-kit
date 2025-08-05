const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');
const FormData = require('form-data');

class StabilityImageService {
  constructor() {
    this.apiKey = process.env.STABILITY_API_KEY;
    this.baseUrl = 'https://api.stability.ai';
    this.uploadsDir = path.join(__dirname, '../uploads/generated-images');
    this.ensureUploadsDir();

    if (!this.apiKey) {
      console.warn('STABILITY_API_KEY not found in environment variables');
    }
  }

  async ensureUploadsDir() {
    try {
      await fs.access(this.uploadsDir);
    } catch (error) {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  async generateImage(prompt, options = {}) {
    try {
      const {
        numberOfImages = 1,
        aspectRatio = '1:1',
        outputMimeType = 'image/jpeg',
        style = '',
        quality = 'high'
      } = options;

      // Enhance the prompt based on style and quality
      const enhancedPrompt = this.enhancePrompt(prompt, style, quality);

      console.log('Generating image with Stability AI:', enhancedPrompt);

      // Use Stability AI API for image generation
      const response = await this.generateWithStabilityAI(enhancedPrompt, {
        numberOfImages,
        aspectRatio,
        outputMimeType
      });

      const generatedImages = [];

      for (let i = 0; i < response.generatedImages.length; i++) {
        const imageData = response.generatedImages[i];
        if (imageData?.image?.imageBytes) {
          const fileName = `generated_${Date.now()}_${i}.${outputMimeType.split('/')[1]}`;
          const filePath = path.join(this.uploadsDir, fileName);

          // Convert base64 to buffer and save
          const buffer = Buffer.from(imageData.image.imageBytes, 'base64');
          await fs.writeFile(filePath, buffer);

          const imageUrl = `/uploads/generated-images/${fileName}`;

          generatedImages.push({
            url: imageUrl,
            fileName,
            filePath,
            prompt: enhancedPrompt,
            aspectRatio,
            mimeType: outputMimeType,
            size: buffer.length,
            generatedAt: new Date()
          });
        }
      }

      return {
        success: true,
        images: generatedImages,
        prompt: enhancedPrompt,
        metadata: {
          numberOfImages,
          aspectRatio,
          outputMimeType,
          style,
          quality
        }
      };
    } catch (error) {
      console.error('Error generating image with Stability AI:', error);
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  async generateWebsiteImages(websiteData) {
    try {
      const { businessName, industry, style, description } = websiteData;
      
      const imagePrompts = [
        {
          type: 'hero',
          prompt: `Professional hero image for ${businessName}, a ${industry} business. ${description}. Modern, clean, high-quality business photography style.`,
          aspectRatio: '16:9'
        },
        {
          type: 'about',
          prompt: `About us section image for ${businessName} in ${industry}. Professional team or workspace, welcoming and trustworthy atmosphere.`,
          aspectRatio: '4:3'
        },
        {
          type: 'services',
          prompt: `Services illustration for ${businessName}, ${industry} company. Clean, modern, professional representation of business services.`,
          aspectRatio: '1:1'
        },
        {
          type: 'contact',
          prompt: `Contact section background for ${businessName}. Professional office or business environment, inviting and accessible.`,
          aspectRatio: '16:9'
        }
      ];

      const generatedImages = {};

      for (const imagePrompt of imagePrompts) {
        try {
          const result = await this.generateImage(imagePrompt.prompt, {
            aspectRatio: imagePrompt.aspectRatio,
            style: style || 'professional',
            quality: 'high'
          });

          if (result.success && result.images.length > 0) {
            generatedImages[imagePrompt.type] = result.images[0];
          }
        } catch (error) {
          console.error(`Failed to generate ${imagePrompt.type} image:`, error);
          // Continue with other images even if one fails
        }
      }

      return {
        success: true,
        images: generatedImages,
        websiteData
      };
    } catch (error) {
      console.error('Error generating website images:', error);
      throw new Error(`Website image generation failed: ${error.message}`);
    }
  }

  enhancePrompt(originalPrompt, style, quality) {
    let enhanced = originalPrompt;

    // Add style modifiers
    const styleModifiers = {
      professional: 'professional, clean, modern, business-appropriate',
      creative: 'creative, artistic, innovative, visually striking',
      minimal: 'minimalist, clean, simple, elegant',
      corporate: 'corporate, formal, sophisticated, executive',
      friendly: 'friendly, approachable, warm, welcoming',
      tech: 'high-tech, futuristic, digital, innovative'
    };

    if (style && styleModifiers[style]) {
      enhanced += `, ${styleModifiers[style]}`;
    }

    // Add quality modifiers
    const qualityModifiers = {
      high: 'high resolution, professional photography, studio lighting, sharp focus',
      ultra: 'ultra high resolution, award-winning photography, perfect lighting, exceptional detail',
      standard: 'good quality, well-lit, clear focus'
    };

    if (quality && qualityModifiers[quality]) {
      enhanced += `, ${qualityModifiers[quality]}`;
    }

    // Add general enhancement
    enhanced += ', no text, no watermarks, commercial use';

    return enhanced;
  }

  // Generate images using Stability AI API
  async generateWithStabilityAI(prompt, options) {
    try {
      const { numberOfImages = 1, aspectRatio = '1:1', outputMimeType = 'image/jpeg' } = options;

      if (!this.apiKey) {
        throw new Error('Stability AI API key not configured');
      }

      const generatedImages = [];
      const [width, height] = this.getImageDimensions(aspectRatio);

      // Determine the best Stability AI endpoint based on quality requirements
      const endpoint = this.getStabilityEndpoint('core'); // Using Stable Image Core as default

      for (let i = 0; i < numberOfImages; i++) {
        try {
          console.log(`Generating image ${i + 1}/${numberOfImages} with Stability AI...`);
          console.log(`Using endpoint: ${endpoint}`);
          console.log(`Prompt: ${prompt}`);

          const formData = new FormData();
          formData.append('prompt', prompt);
          formData.append('output_format', outputMimeType === 'image/png' ? 'png' : 'jpeg');
          formData.append('aspect_ratio', aspectRatio);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Accept': 'image/*',
              ...formData.getHeaders()
            },
            body: formData
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Stability AI API error: ${response.status} - ${errorText}`);
          }

          // Get the image as buffer
          const imageBuffer = await response.buffer();
          const base64Image = imageBuffer.toString('base64');

          generatedImages.push({
            image: {
              imageBytes: base64Image
            }
          });

        } catch (error) {
          console.log(`Failed to generate image ${i + 1} with Stability AI:`, error.message);

          // Use fallback service if Stability AI fails
          const fallbackImage = await this.generateWithFallbackService(prompt, options);
          generatedImages.push({
            image: {
              imageBytes: fallbackImage
            }
          });
        }
      }

      return { generatedImages };
    } catch (error) {
      console.error('Error with Stability AI generation:', error);
      throw error;
    }
  }

  // Get the appropriate Stability AI endpoint
  getStabilityEndpoint(model = 'core') {
    const endpoints = {
      'ultra': `${this.baseUrl}/v2beta/stable-image/generate/ultra`,
      'core': `${this.baseUrl}/v2beta/stable-image/generate/core`,
      'sd3': `${this.baseUrl}/v2beta/stable-image/generate/sd3`
    };

    return endpoints[model] || endpoints.core;
  }

  // Fallback to a working image generation service
  async generateWithFallbackService(prompt, options) {
    try {
      const { aspectRatio = '1:1' } = options;
      const [width, height] = this.getImageDimensions(aspectRatio);

      // Use Pollinations AI as a reliable fallback
      const cleanPrompt = encodeURIComponent(prompt.replace(/[^\w\s-.,]/g, '').trim());
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;

      console.log('Using Pollinations AI fallback:', imageUrl);

      // Fetch the image and convert to base64
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image from fallback service');
      }

      const imageBuffer = await response.buffer();
      return imageBuffer.toString('base64');

    } catch (error) {
      console.error('Fallback service failed:', error);
      // Final fallback to placeholder
      return await this.generatePlaceholderImage(prompt, options);
    }
  }

  // Simulate image generation for development/testing
  async simulateImageGeneration(prompt, options) {
    // This simulates the Gemini API response structure
    // In production, this would be replaced with actual Gemini API calls

    const { numberOfImages = 1 } = options;
    const generatedImages = [];

    for (let i = 0; i < numberOfImages; i++) {
      // Generate a placeholder image as base64
      const placeholderImage = await this.generatePlaceholderImage(prompt, options);

      generatedImages.push({
        image: {
          imageBytes: placeholderImage
        }
      });
    }

    return {
      generatedImages
    };
  }

  async generatePlaceholderImage(prompt, options) {
    // Generate a simple colored rectangle as base64 for testing
    // In production, this would be actual Gemini-generated image data
    
    const { aspectRatio = '1:1' } = options;
    const [width, height] = this.getImageDimensions(aspectRatio);
    
    // Create a simple SVG placeholder
    const color = this.getColorFromPrompt(prompt);
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle" dy=".3em">
          Generated Image
        </text>
      </svg>
    `;

    // Convert SVG to base64
    return Buffer.from(svg).toString('base64');
  }

  getImageDimensions(aspectRatio) {
    const ratios = {
      '1:1': [512, 512],
      '16:9': [512, 288],
      '9:16': [288, 512],
      '4:3': [512, 384],
      '3:2': [512, 341]
    };
    
    return ratios[aspectRatio] || ratios['1:1'];
  }

  getColorFromPrompt(prompt) {
    // Generate a color based on prompt hash for consistent placeholder colors
    const hash = crypto.createHash('md5').update(prompt).digest('hex');
    const hue = parseInt(hash.substr(0, 2), 16) * 360 / 255;
    return `hsl(${hue}, 70%, 50%)`;
  }

  async deleteImage(fileName) {
    try {
      const filePath = path.join(this.uploadsDir, fileName);
      await fs.unlink(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting image:', error);
      return { success: false, error: error.message };
    }
  }

  async getImageInfo(fileName) {
    try {
      const filePath = path.join(this.uploadsDir, fileName);
      const stats = await fs.stat(filePath);
      
      return {
        fileName,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        url: `/uploads/generated-images/${fileName}`
      };
    } catch (error) {
      console.error('Error getting image info:', error);
      throw new Error(`Image not found: ${fileName}`);
    }
  }
}

module.exports = new StabilityImageService();
