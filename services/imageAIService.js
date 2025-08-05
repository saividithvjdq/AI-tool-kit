const Groq = require('groq-sdk');

class ImageAIService {
  constructor() {
    if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('placeholder')) {
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
      });
      this.groqAvailable = true;
    } else {
      console.warn('GROQ API key not configured - using fallback responses');
      this.groq = null;
      this.groqAvailable = false;
    }
  }

  async generatePrompt(requirements) {
    try {
      if (!this.groqAvailable) {
        // Fallback response when GROQ is not available
        return {
          success: true,
          prompt: `${requirements.description || 'Creative image'}, ${requirements.style || 'realistic'} style, high quality, detailed`,
          originalRequirements: requirements,
          enhancedPrompt: `${requirements.description || 'Creative image'}, ${requirements.style || 'realistic'} style, high quality, detailed, professional`,
          metadata: {
            model: 'fallback',
            generatedAt: new Date(),
            requirements,
            note: 'Using fallback - GROQ API not configured'
          }
        };
      }

      const prompt = `You are an expert AI image prompt engineer. Create a detailed, specific prompt for AI image generation based on these requirements:

Requirements: ${JSON.stringify(requirements)}

Generate a detailed prompt that includes:
- Main subject and composition
- Style and artistic direction
- Lighting and mood
- Technical specifications
- Quality descriptors

Return only the prompt text, no explanations.`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 500
      });

      const generatedPrompt = completion.choices[0]?.message?.content?.trim();
      
      return {
        success: true,
        prompt: generatedPrompt,
        originalRequirements: requirements,
        enhancedPrompt: this.enhancePrompt(generatedPrompt, requirements.style),
        metadata: {
          model: 'llama3-8b-8192',
          generatedAt: new Date(),
          requirements
        }
      };
    } catch (error) {
      console.error('Error generating prompt:', error);
      throw new Error(`Prompt generation failed: ${error.message}`);
    }
  }

  async enhancePrompt(basePrompt, style = 'realistic') {
    const styleEnhancements = {
      realistic: 'photorealistic, high quality, detailed, professional photography',
      artistic: 'artistic, creative, stylized, expressive',
      cartoon: 'cartoon style, animated, colorful, playful',
      sketch: 'pencil sketch, hand drawn, artistic, monochrome',
      digital: 'digital art, modern, clean, vector style',
      vintage: 'vintage, retro, aged, classic photography',
      minimalist: 'minimalist, clean, simple, elegant composition'
    };

    const enhancement = styleEnhancements[style] || styleEnhancements.realistic;
    return `${basePrompt}, ${enhancement}, high resolution, masterpiece`;
  }

  async analyzeConcepts(description) {
    try {
      const prompt = `Analyze this image concept and provide creative suggestions:

Description: "${description}"

Provide a JSON response with:
{
  "mainConcepts": ["concept1", "concept2", "concept3"],
  "styleVariations": ["style1", "style2", "style3"],
  "compositionIdeas": ["composition1", "composition2", "composition3"],
  "colorPalettes": ["palette1", "palette2", "palette3"],
  "moodSuggestions": ["mood1", "mood2", "mood3"],
  "technicalTips": ["tip1", "tip2", "tip3"]
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.8,
        max_tokens: 800
      });

      const response = completion.choices[0]?.message?.content?.trim();
      
      try {
        const analysis = JSON.parse(response);
        return {
          success: true,
          analysis,
          originalDescription: description,
          generatedAt: new Date()
        };
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          success: true,
          analysis: {
            mainConcepts: ['Creative concept', 'Artistic vision', 'Visual storytelling'],
            styleVariations: ['Realistic', 'Artistic', 'Abstract'],
            compositionIdeas: ['Centered composition', 'Rule of thirds', 'Dynamic angle'],
            colorPalettes: ['Warm tones', 'Cool tones', 'Monochromatic'],
            moodSuggestions: ['Inspiring', 'Peaceful', 'Dynamic'],
            technicalTips: ['High resolution', 'Good lighting', 'Sharp focus']
          },
          originalDescription: description,
          generatedAt: new Date(),
          fallback: true
        };
      }
    } catch (error) {
      console.error('Error analyzing concepts:', error);
      throw new Error(`Concept analysis failed: ${error.message}`);
    }
  }

  async generateImageVariations(basePrompt, count = 4) {
    try {
      const variations = [];
      
      const styleModifiers = [
        'photorealistic, professional photography',
        'artistic, painterly style',
        'digital art, modern illustration',
        'cinematic, dramatic lighting'
      ];

      for (let i = 0; i < count; i++) {
        const modifier = styleModifiers[i % styleModifiers.length];
        const enhancedPrompt = `${basePrompt}, ${modifier}, high quality, detailed`;
        
        variations.push({
          id: i + 1,
          prompt: enhancedPrompt,
          style: modifier.split(',')[0],
          seed: Math.floor(Math.random() * 1000000)
        });
      }

      return {
        success: true,
        variations,
        basePrompt,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating variations:', error);
      throw new Error(`Variation generation failed: ${error.message}`);
    }
  }

  async optimizePrompt(prompt, targetStyle, aspectRatio) {
    try {
      const optimizationPrompt = `Optimize this image generation prompt for better results:

Original prompt: "${prompt}"
Target style: ${targetStyle}
Aspect ratio: ${aspectRatio}

Improve the prompt by:
1. Adding specific technical details
2. Enhancing style descriptors
3. Including composition guidance
4. Adding quality modifiers

Return only the optimized prompt, no explanations.`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: optimizationPrompt }],
        model: 'llama3-8b-8192',
        temperature: 0.6,
        max_tokens: 400
      });

      const optimizedPrompt = completion.choices[0]?.message?.content?.trim();
      
      return {
        success: true,
        originalPrompt: prompt,
        optimizedPrompt,
        targetStyle,
        aspectRatio,
        improvements: [
          'Enhanced technical specifications',
          'Improved style descriptors',
          'Better composition guidance',
          'Quality modifiers added'
        ],
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error optimizing prompt:', error);
      throw new Error(`Prompt optimization failed: ${error.message}`);
    }
  }

  async generateImageMetadata(prompt, style, dimensions) {
    return {
      prompt,
      style,
      dimensions,
      suggestedSettings: {
        steps: style === 'realistic' ? 30 : 20,
        guidance: style === 'artistic' ? 12 : 7.5,
        sampler: 'DPM++ 2M Karras'
      },
      qualityTags: ['high resolution', 'detailed', 'professional'],
      estimatedTime: '30-60 seconds',
      generatedAt: new Date()
    };
  }

  // Helper method to validate prompts
  validatePrompt(prompt) {
    if (!prompt || prompt.trim().length < 10) {
      return {
        valid: false,
        error: 'Prompt must be at least 10 characters long'
      };
    }

    if (prompt.length > 1000) {
      return {
        valid: false,
        error: 'Prompt must be less than 1000 characters'
      };
    }

    return { valid: true };
  }

  // Helper method to get style recommendations
  getStyleRecommendations(category) {
    const recommendations = {
      photography: ['Portrait', 'Landscape', 'Street', 'Macro', 'Documentary'],
      art: ['Oil painting', 'Watercolor', 'Digital art', 'Sketch', 'Abstract'],
      design: ['Logo', 'Icon', 'Poster', 'Banner', 'Infographic'],
      illustration: ['Character', 'Concept art', 'Children\'s book', 'Technical', 'Fashion']
    };

    return recommendations[category] || recommendations.art;
  }

  // Generate optimized image prompt
  async generateImagePrompt(requirements) {
    try {
      if (!this.groqAvailable) {
        // Fallback response when GROQ is not available
        const fallbackPrompt = `${requirements.description || 'Creative image'}, ${requirements.style || 'realistic'} style, ${requirements.mood || 'neutral'} mood, high quality, detailed`;
        
        return {
          success: true,
          optimizedPrompt: fallbackPrompt,
          negativePrompt: 'blurry, low quality, distorted, ugly, bad anatomy',
          styleKeywords: [requirements.style, requirements.mood].filter(Boolean),
          technicalSpecs: {
            aspectRatio: requirements.aspectRatio || '1:1',
            quality: requirements.quality || 'high',
            style: requirements.style || 'realistic'
          },
          variations: [
            `${fallbackPrompt}, professional photography`,
            `${fallbackPrompt}, artistic style`,
            `${fallbackPrompt}, digital art`
          ],
          tips: [
            'Use specific descriptive words',
            'Include technical quality terms',
            'Specify lighting and composition'
          ]
        };
      }

      const prompt = `Create a detailed image generation prompt based on these requirements:
      
Description: ${requirements.description || 'No description provided'}
Style: ${requirements.style || 'realistic'}
Mood: ${requirements.mood || 'neutral'}
Colors: ${requirements.colors || 'natural'}
Composition: ${requirements.composition || 'balanced'}
Aspect Ratio: ${requirements.aspectRatio || '1:1'}
Quality: ${requirements.quality || 'high'}
Subject: ${requirements.subject || 'general'}
Environment: ${requirements.environment || 'neutral'}
Lighting: ${requirements.lighting || 'natural'}

Generate a detailed, specific prompt for AI image generation.`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 400
      });

      const optimizedPrompt = completion.choices[0]?.message?.content?.trim();
      
      return {
        success: true,
        optimizedPrompt,
        negativePrompt: 'blurry, low quality, distorted, ugly, bad anatomy',
        styleKeywords: [requirements.style, requirements.mood].filter(Boolean),
        technicalSpecs: {
          aspectRatio: requirements.aspectRatio,
          quality: requirements.quality,
          style: requirements.style
        },
        variations: [
          `${optimizedPrompt}, professional photography`,
          `${optimizedPrompt}, artistic style`,
          `${optimizedPrompt}, digital art`
        ],
        tips: [
          'Use specific descriptive words',
          'Include technical quality terms',
          'Specify lighting and composition'
        ]
      };
    } catch (error) {
      console.error('Error generating image prompt:', error);
      throw new Error(`Image prompt generation failed: ${error.message}`);
    }
  }

  // Enhance existing image prompt
  async enhanceImagePrompt(originalPrompt, enhancementType = 'general') {
    try {
      const enhancementPrompt = `Enhance this image generation prompt to make it more detailed and effective:

Original prompt: "${originalPrompt}"
Enhancement type: ${enhancementType}

Make it more specific, add technical details, and improve clarity.`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: enhancementPrompt }],
        model: 'llama3-8b-8192',
        temperature: 0.6,
        max_tokens: 300
      });

      const enhancedPrompt = completion.choices[0]?.message?.content?.trim();
      
      return {
        success: true,
        originalPrompt,
        enhancedPrompt,
        enhancementType,
        improvements: [
          'Added technical specifications',
          'Enhanced descriptive details',
          'Improved clarity and focus'
        ]
      };
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      throw new Error(`Prompt enhancement failed: ${error.message}`);
    }
  }

  // Generate multiple image concepts
  async generateImageConcepts(theme, count = 3) {
    try {
      const concepts = [];
      
      for (let i = 0; i < count; i++) {
        const concept = {
          id: i + 1,
          title: `${theme} Concept ${i + 1}`,
          prompt: `${theme}, concept ${i + 1}, creative interpretation, high quality`,
          style: ['realistic', 'artistic', 'modern'][i % 3],
          description: `Creative concept ${i + 1} for ${theme}`
        };
        concepts.push(concept);
      }

      return {
        success: true,
        theme,
        concepts,
        count: concepts.length
      };
    } catch (error) {
      console.error('Error generating concepts:', error);
      throw new Error(`Concept generation failed: ${error.message}`);
    }
  }

  // Analyze image requirements
  async analyzeImageRequirements(description) {
    try {
      const analysisPrompt = `Analyze this image description and provide suggestions:

Description: "${description}"

Provide analysis of style, composition, and technical recommendations.`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: analysisPrompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 400
      });

      const analysis = completion.choices[0]?.message?.content?.trim();
      
      return {
        success: true,
        description,
        analysis,
        suggestions: [
          'Consider the lighting carefully',
          'Think about composition rules',
          'Choose appropriate style'
        ],
        recommendedStyles: ['realistic', 'artistic', 'professional'],
        technicalTips: [
          'Use high resolution settings',
          'Specify aspect ratio clearly',
          'Include quality descriptors'
        ]
      };
    } catch (error) {
      console.error('Error analyzing requirements:', error);
      throw new Error(`Requirements analysis failed: ${error.message}`);
    }
  }

  // Generate multiple images
  async generateMultipleImages(prompt, count = 1, options = {}) {
    try {
      const images = [];
      
      for (let i = 0; i < count; i++) {
        const image = await this.generateImageFromPrompt(prompt, options);
        images.push(image);
      }

      return images;
    } catch (error) {
      console.error('Error generating multiple images:', error);
      throw new Error(`Multiple image generation failed: ${error.message}`);
    }
  }

  // Generate image from prompt
  async generateImageFromPrompt(prompt, options = {}) {
    try {
      const {
        width = 1024,
        height = 1024,
        steps = 20,
        guidance = 7.5
      } = options;

      // Mock image generation for now
      const mockImage = {
        imageUrl: `https://via.placeholder.com/${width}x${height}/4f46e5/ffffff?text=Generated+Image`,
        thumbnailUrl: `https://via.placeholder.com/256x256/4f46e5/ffffff?text=Thumbnail`,
        processingTime: Math.random() * 30 + 10,
        model: 'ai-image-generator',
        version: '1.0',
        seed: Math.floor(Math.random() * 1000000),
        steps,
        guidance,
        prompt,
        width,
        height
      };

      return mockImage;
    } catch (error) {
      console.error('Error generating image from prompt:', error);
      throw new Error(`Image generation failed: ${error.message}`);
    }
  }

  // Method to get generation statistics
  getServiceInfo() {
    return {
      name: 'Image AI Service',
      version: '1.0.0',
      capabilities: [
        'Prompt generation',
        'Concept analysis',
        'Style variations',
        'Prompt optimization'
      ],
      supportedStyles: [
        'realistic', 'artistic', 'cartoon', 'sketch', 
        'digital', 'vintage', 'minimalist'
      ],
      maxPromptLength: 1000,
      status: 'active'
    };
  }
}

module.exports = new ImageAIService();
