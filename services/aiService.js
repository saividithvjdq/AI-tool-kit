const axios = require('axios');

class AIService {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqBaseUrl = 'https://api.groq.com/openai/v1';
    this.chatbotAPI = process.env.CHATBOT_API_KEY;
  }

  // Initialize Groq API client
  getModel(modelName = 'llama3-8b-8192') {
    return {
      model: modelName,
      apiKey: this.groqApiKey,
      baseUrl: this.groqBaseUrl
    };
  }

  // Generate website content based on business information
  async generateWebsiteContent(businessInfo) {
    try {
      console.log('🤖 Generating website content for:', businessInfo.name);

      // Check if GROQ API key is available
      if (!this.groqApiKey) {
        console.log('⚠️ GROQ API key not available, using fallback content');
        return this.getFallbackContent(businessInfo);
      }

      const prompt = `Create comprehensive website content for a business with the following information:

Business Name: ${businessInfo.name}
Industry: ${businessInfo.industry}
Description: ${businessInfo.description}
Target Audience: ${businessInfo.targetAudience || 'General public'}
Key Services: ${businessInfo.keyServices?.join(', ') || 'Not specified'}

Generate a complete website structure in JSON format with the following sections:
{
  "hero": {
    "headline": "Compelling main headline",
    "subheadline": "Supporting description",
    "ctaText": "Call to action button text"
  },
  "about": {
    "title": "About section title",
    "content": "2-3 paragraphs about the business"
  },
  "services": [
    {
      "title": "Service name",
      "description": "Service description",
      "icon": "briefcase"
    }
  ],
  "features": [
    {
      "title": "Feature name",
      "description": "Feature description"
    }
  ],
  "testimonials": [
    {
      "name": "Customer name",
      "company": "Customer company",
      "content": "Testimonial content",
      "rating": 5
    }
  ],
  "contact": {
    "title": "Contact section title",
    "description": "Contact description"
  },
  "seo": {
    "title": "SEO page title",
    "description": "Meta description",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
}

Make the content professional, engaging, and tailored to the specific business and industry.
Return only valid JSON without markdown formatting or code blocks.`;

      console.log('📡 Making API call to GROQ...');

      const response = await axios.post(`${this.groqBaseUrl}/chat/completions`, {
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.7,
        max_tokens: 2048,
      }, {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      console.log('✅ GROQ API response received');

      let text = response.data.choices[0]?.message?.content || '';

      // Clean the response text
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        const content = JSON.parse(text);
        console.log('✅ Content parsed successfully');
        return content;
      } catch (parseError) {
        console.log('⚠️ Failed to parse AI response, trying to extract JSON...');
        // Try to extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const content = JSON.parse(jsonMatch[0]);
          console.log('✅ JSON extracted and parsed successfully');
          return content;
        }
        console.error('❌ Failed to parse AI response:', text.substring(0, 200));
        console.log('🔄 Using fallback content...');
        return this.getFallbackContent(businessInfo);
      }
    } catch (error) {
      console.error('❌ Error generating website content:', error.message);
      console.log('🔄 Using fallback content...');
      return this.getFallbackContent(businessInfo);
    }
  }

  // Fallback content when AI service fails
  getFallbackContent(businessInfo) {
    console.log('📝 Generating fallback content for:', businessInfo.name);

    return {
      hero: {
        headline: `Welcome to ${businessInfo.name}`,
        subheadline: businessInfo.description || `Professional ${businessInfo.industry} services`,
        ctaText: "Get Started"
      },
      about: {
        title: "About Us",
        content: `${businessInfo.name} is a leading ${businessInfo.industry} company dedicated to providing exceptional services. We pride ourselves on quality, reliability, and customer satisfaction. Our team of professionals is committed to delivering results that exceed expectations.`
      },
      services: (businessInfo.keyServices || ['Consulting', 'Support', 'Solutions']).map(service => ({
        title: service,
        description: `Professional ${service.toLowerCase()} services tailored to your needs`,
        icon: "briefcase"
      })),
      features: [
        {
          title: "Professional Service",
          description: "High-quality professional services delivered by experienced team members"
        },
        {
          title: "Customer Focus",
          description: "We put our customers first and ensure their satisfaction with every project"
        },
        {
          title: "Reliable Support",
          description: "Ongoing support and maintenance to keep your business running smoothly"
        }
      ],
      testimonials: [
        {
          name: "John Smith",
          company: "ABC Corporation",
          content: `${businessInfo.name} provided excellent service and exceeded our expectations. Highly recommended!`,
          rating: 5
        }
      ],
      contact: {
        title: "Contact Us",
        description: "Get in touch with us today to learn more about our services"
      },
      seo: {
        title: `${businessInfo.name} - Professional ${businessInfo.industry} Services`,
        description: businessInfo.description || `Professional ${businessInfo.industry} services by ${businessInfo.name}`,
        keywords: [businessInfo.name, businessInfo.industry, "professional", "services"]
      }
    };
  }

  // Generate marketing email content
  async generateMarketingEmail(businessInfo, emailType, targetAudience) {
    try {
      const model = this.getModel();
      
      const prompt = `
        Create a ${emailType} marketing email for:
        
        Business: ${businessInfo.name}
        Industry: ${businessInfo.industry}
        Target Audience: ${targetAudience}
        
        Generate an email with:
        1. Compelling subject line
        2. Personalized greeting
        3. Engaging body content
        4. Clear call-to-action
        5. Professional signature
        
        Make it conversion-focused and appropriate for the industry.
        Return as JSON with fields: subject, greeting, body, cta, signature.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error generating marketing email:', error);
      throw new Error('Failed to generate marketing email');
    }
  }

  // Generate newsletter content
  async generateNewsletter(businessInfo, topics, previousNewsletters = []) {
    try {
      const model = this.getModel();
      
      const prompt = `
        Create a newsletter for ${businessInfo.name} in the ${businessInfo.industry} industry.
        
        Topics to cover: ${topics.join(', ')}
        
        Generate a newsletter with:
        1. Catchy subject line
        2. Welcome message
        3. 3-4 main articles/sections
        4. Industry insights
        5. Call-to-action
        6. Footer with unsubscribe
        
        Make it informative, engaging, and valuable to subscribers.
        Return as JSON with structured content.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error generating newsletter:', error);
      throw new Error('Failed to generate newsletter');
    }
  }

  // Analyze customer feedback sentiment
  async analyzeFeedback(feedbackTexts) {
    try {
      const model = this.getModel();
      
      const prompt = `
        Analyze the following customer feedback texts for sentiment, themes, and actionable insights:
        
        Feedback:
        ${feedbackTexts.map((text, index) => `${index + 1}. ${text}`).join('\n')}
        
        Provide analysis in JSON format with:
        1. Overall sentiment (positive, negative, neutral) with confidence score
        2. Key themes and topics mentioned
        3. Specific issues or complaints
        4. Positive highlights
        5. Actionable recommendations for business improvement
        6. Sentiment breakdown by individual feedback
        
        Be thorough and provide specific, actionable insights.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      throw new Error('Failed to analyze feedback');
    }
  }

  // Generate business insights
  async generateBusinessInsights(businessData) {
    try {
      const model = this.getModel();
      
      const prompt = `
        Analyze the following business data and provide strategic insights:
        
        Business: ${businessData.name}
        Industry: ${businessData.industry}
        Website Traffic: ${businessData.websiteTraffic || 'N/A'}
        Customer Feedback Count: ${businessData.feedbackCount || 0}
        Marketing Campaigns: ${businessData.campaignCount || 0}
        
        Generate insights in JSON format with:
        1. Performance summary
        2. Growth opportunities
        3. Marketing recommendations
        4. Customer engagement strategies
        5. Competitive advantages to leverage
        6. Areas for improvement
        
        Provide specific, actionable recommendations.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error generating business insights:', error);
      throw new Error('Failed to generate business insights');
    }
  }

  // Generate product descriptions
  async generateProductDescription(productInfo) {
    try {
      const model = this.getModel();
      
      const prompt = `
        Create a compelling product description for:
        
        Product Name: ${productInfo.name}
        Category: ${productInfo.category}
        Features: ${productInfo.features?.join(', ')}
        Target Audience: ${productInfo.targetAudience}
        Price Range: ${productInfo.priceRange}
        
        Generate a description that:
        1. Highlights key benefits
        2. Addresses customer pain points
        3. Includes persuasive language
        4. Optimizes for SEO
        5. Includes a strong call-to-action
        
        Return as JSON with: title, shortDescription, fullDescription, keyFeatures, seoKeywords.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error generating product description:', error);
      throw new Error('Failed to generate product description');
    }
  }

  // Generate social media content
  async generateSocialMediaContent(businessInfo, platform, contentType) {
    try {
      const model = this.getModel();
      
      const prompt = `
        Create ${contentType} content for ${platform} for:
        
        Business: ${businessInfo.name}
        Industry: ${businessInfo.industry}
        Target Audience: ${businessInfo.targetAudience}
        
        Generate content optimized for ${platform} with:
        1. Platform-appropriate length and format
        2. Engaging hooks and calls-to-action
        3. Relevant hashtags
        4. Visual content suggestions
        
        Return as JSON with: content, hashtags, visualSuggestions, bestPostTime.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Error generating social media content:', error);
      throw new Error('Failed to generate social media content');
    }
  }
}

module.exports = new AIService();
