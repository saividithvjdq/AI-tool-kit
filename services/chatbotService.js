const axios = require('axios');
const Website = require('../models/Website');
const Campaign = require('../models/Campaign');
const EmailList = require('../models/EmailList');
const WebsiteContext = require('../models/WebsiteContext');
const BUSINESS_PROMPTS = require('./businessPrompts');

// Chatbot types
const CHATBOT_TYPES = {
  CUSTOMER_SERVICE: 'customer_service',
  BUSINESS_USAGE: 'business_usage',
  GENERAL_PURPOSE: 'general_purpose',
  WEBSITE_GENERATION: 'website_generation'
};

class ChatbotService {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.conversationHistory = new Map(); // Store conversation history by session
    this.chatbotConfigs = new Map(); // Store chatbot configurations
    this.initializeChatbotConfigs();
  }

  // Initialize default configurations for each chatbot type
  initializeChatbotConfigs() {
    this.chatbotConfigs.set(CHATBOT_TYPES.CUSTOMER_SERVICE, {
      model: 'llama3-8b-8192',
      systemPrompt: 'You are a professional customer service representative. You are helpful, empathetic, and focused on resolving customer issues. You have access to FAQ databases and can escalate to human agents when needed.',
      temperature: 0.7,
      maxTokens: 500,
      personality: 'professional',
      capabilities: ['faq_access', 'sentiment_analysis', 'escalation', 'order_tracking']
    });

    this.chatbotConfigs.set(CHATBOT_TYPES.BUSINESS_USAGE, {
      model: 'llama3-8b-8192',
      systemPrompt: 'You are an internal business assistant. You help employees with business operations, analytics, task management, and company policies. You have access to business data and can provide insights and recommendations.',
      temperature: 0.5,
      maxTokens: 600,
      personality: 'analytical',
      capabilities: ['analytics_access', 'task_management', 'policy_guidance', 'business_insights']
    });

    this.chatbotConfigs.set(CHATBOT_TYPES.GENERAL_PURPOSE, {
      model: 'llama3-8b-8192',
      systemPrompt: 'You are a knowledgeable and friendly general-purpose assistant. You can help with a wide range of topics including education, entertainment, general information, and casual conversation. You are the fallback when specialized bots cannot help.',
      temperature: 0.8,
      maxTokens: 400,
      personality: 'friendly',
      capabilities: ['general_knowledge', 'education', 'entertainment', 'fallback_support']
    });

    this.chatbotConfigs.set(CHATBOT_TYPES.WEBSITE_GENERATION, {
      model: 'llama3-8b-8192',
      systemPrompt: `You are a specialized AI Business Toolkit assistant focused on website generation and business automation. Your role is to:
        - Guide users through the multi-agent website generation workflow
        - Help with business information input (name, industry, description, target audience)
        - Explain workflow stages: website generation → image generation → marketing optimization → analytics setup
        - Assist with campaign creation and email list management
        - Provide guidance on marketing features and automation tools
        - Help users understand analytics and performance metrics
        - Offer best practices for business website optimization
        - Support users in maximizing their business toolkit features

        You have deep knowledge of:
        - Website design principles and business requirements
        - Digital marketing strategies and automation
        - Email marketing and campaign management
        - Business analytics and performance tracking
        - Lead generation and conversion optimization
        - SEO and online presence optimization`,
      temperature: 0.6,
      maxTokens: 800,
      personality: 'expert',
      capabilities: ['website_generation', 'marketing_automation', 'campaign_management', 'analytics_guidance', 'business_optimization']
    });
  }

  // Smart routing to determine which chatbot to use
  async determineChatbotType(message, context = {}) {
    try {
      const routingPrompt = `
        Analyze this message and determine which type of chatbot should handle it:

        Message: "${message}"
        Context: ${JSON.stringify(context)}

        Available chatbot types:
        1. customer_service - Customer inquiries, complaints, support, orders, billing
        2. business_usage - Internal operations, analytics, employee tasks, policies
        3. website_generation - Website creation, business setup, marketing automation, campaign management
        4. general_purpose - General knowledge, education, entertainment, casual chat

        Respond with only the chatbot type (customer_service, business_usage, website_generation, or general_purpose).
      `;

      const response = await this.callGroqAPI(routingPrompt, {
        model: 'llama3-8b-8192',
        temperature: 0.3,
        maxTokens: 50
      });

      const chatbotType = response.trim().toLowerCase();

      // Validate and return appropriate type
      if (Object.values(CHATBOT_TYPES).includes(chatbotType)) {
        return chatbotType;
      }

      // Default fallback
      return CHATBOT_TYPES.GENERAL_PURPOSE;
    } catch (error) {
      console.error('Error determining chatbot type:', error);
      return CHATBOT_TYPES.GENERAL_PURPOSE;
    }
  }

  // Get contextual business guidance based on user message
  getBusinessGuidance(message, context = {}) {
    const lowerMessage = message.toLowerCase();

    // Website workflow guidance
    if (lowerMessage.includes('getting started') || lowerMessage.includes('how to start') || lowerMessage.includes('begin')) {
      return BUSINESS_PROMPTS.WEBSITE_WORKFLOW.GETTING_STARTED;
    }

    if (lowerMessage.includes('workflow') || lowerMessage.includes('process') || lowerMessage.includes('how it works')) {
      return BUSINESS_PROMPTS.WEBSITE_WORKFLOW.WORKFLOW_EXPLANATION;
    }

    // Stage-specific guidance
    if (context.currentStage) {
      const stageGuidance = BUSINESS_PROMPTS.WEBSITE_WORKFLOW.STAGE_GUIDANCE[context.currentStage];
      if (stageGuidance) return stageGuidance;
    }

    // Business input assistance
    if (lowerMessage.includes('industry') || lowerMessage.includes('business type')) {
      return BUSINESS_PROMPTS.BUSINESS_INPUT.INDUSTRY_GUIDANCE;
    }

    if (lowerMessage.includes('target audience') || lowerMessage.includes('customers') || lowerMessage.includes('who is my')) {
      return BUSINESS_PROMPTS.BUSINESS_INPUT.TARGET_AUDIENCE_HELP;
    }

    if (lowerMessage.includes('services') || lowerMessage.includes('products') || lowerMessage.includes('what do you offer')) {
      return BUSINESS_PROMPTS.BUSINESS_INPUT.SERVICES_OPTIMIZATION;
    }

    // Marketing features
    if (lowerMessage.includes('email marketing') || lowerMessage.includes('email campaign')) {
      return BUSINESS_PROMPTS.MARKETING_FEATURES.EMAIL_MARKETING;
    }

    if (lowerMessage.includes('campaign') || lowerMessage.includes('marketing')) {
      return BUSINESS_PROMPTS.MARKETING_FEATURES.CAMPAIGN_CREATION;
    }

    if (lowerMessage.includes('leads') || lowerMessage.includes('lead generation') || lowerMessage.includes('get customers')) {
      return BUSINESS_PROMPTS.MARKETING_FEATURES.LEAD_GENERATION;
    }

    // Troubleshooting
    if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('not working')) {
      return BUSINESS_PROMPTS.TROUBLESHOOTING.COMMON_ISSUES;
    }

    if (lowerMessage.includes('optimize') || lowerMessage.includes('improve') || lowerMessage.includes('performance')) {
      return BUSINESS_PROMPTS.TROUBLESHOOTING.PERFORMANCE_OPTIMIZATION;
    }

    return null; // No specific guidance found
  }

  // Get enhanced business context with user data
  async getEnhancedBusinessContext(userId, businessInfo) {
    try {
      // Get user's websites
      const websites = await Website.find({ userId }).limit(5);

      // Get recent campaigns
      const campaigns = await Campaign.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name type status analytics');

      // Get email lists
      const emailLists = await EmailList.find({ userId })
        .limit(3)
        .select('name totalEmails activeEmails');

      // Get website contexts for workflow information
      const websiteContexts = await WebsiteContext.find({ userId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('workflow businessContext');

      return {
        ...businessInfo,
        websites: websites.map(w => ({
          id: w._id,
          name: w.businessInfo.name,
          industry: w.businessInfo.industry,
          status: w.status,
          domain: w.domain.subdomain || w.domain.customDomain
        })),
        campaigns: campaigns.map(c => ({
          name: c.name,
          type: c.type,
          status: c.status,
          performance: c.analytics
        })),
        emailLists: emailLists.map(e => ({
          name: e.name,
          totalEmails: e.totalEmails,
          activeEmails: e.activeEmails
        })),
        workflows: websiteContexts.map(w => ({
          stage: w.workflow?.currentStage,
          status: w.workflow?.status,
          businessName: w.businessContext?.name
        }))
      };
    } catch (error) {
      console.error('Error getting enhanced business context:', error);
      return businessInfo; // Fallback to basic info
    }
  }

  // Initialize chatbot with business context and type
  async initializeChatbot(businessInfo, chatbotType = CHATBOT_TYPES.CUSTOMER_SERVICE, userId = null) {
    const config = this.chatbotConfigs.get(chatbotType);

    let systemPrompt = config.systemPrompt;

    if (chatbotType === CHATBOT_TYPES.CUSTOMER_SERVICE) {
      systemPrompt += `

        Business Context:
        - Company: ${businessInfo.name || 'Not specified'}
        - Industry: ${businessInfo.industry || 'Not specified'}
        - Description: ${businessInfo.description || 'Not provided'}
        - Services: ${businessInfo.keyServices?.join(', ') || 'Not specified'}
        - Contact: ${businessInfo.contactInfo?.email || 'Not provided'}

        Your specific role for this business:
        1. Answer customer questions about ${businessInfo.name}
        2. Provide information about their services and products
        3. Handle customer support requests professionally
        4. Escalate complex issues to human agents when needed
        5. Maintain a helpful and empathetic tone
      `;
    } else if (chatbotType === CHATBOT_TYPES.BUSINESS_USAGE) {
      systemPrompt += `

        Business Context:
        - Company: ${businessInfo.name || 'Not specified'}
        - Industry: ${businessInfo.industry || 'Not specified'}
        - You have access to business analytics and operational data
        - You can help with internal processes and employee guidance
        - Focus on productivity and business efficiency
      `;
    } else if (chatbotType === CHATBOT_TYPES.WEBSITE_GENERATION) {
      // Get enhanced context for website generation chatbot
      const enhancedContext = userId ? await this.getEnhancedBusinessContext(userId, businessInfo) : businessInfo;

      systemPrompt += `

        Business Context:
        - Company: ${enhancedContext.name || enhancedContext.businessName || 'Not specified'}
        - Industry: ${enhancedContext.industry || 'Not specified'}
        - Description: ${enhancedContext.description || 'Not provided'}
        - Target Audience: ${enhancedContext.targetAudience || 'Not specified'}
        - Services: ${enhancedContext.keyServices?.join(', ') || enhancedContext.services?.join(', ') || 'Not specified'}
        - Contact: ${enhancedContext.contactInfo?.email || enhancedContext.email || 'Not provided'}

        Current User Assets:
        - Websites: ${enhancedContext.websites?.length || 0} websites created
        ${enhancedContext.websites?.map(w => `  • ${w.name} (${w.status}) - ${w.domain || 'No domain'}`).join('\n        ') || '  • No websites yet'}
        - Campaigns: ${enhancedContext.campaigns?.length || 0} marketing campaigns
        ${enhancedContext.campaigns?.map(c => `  • ${c.name} (${c.type}, ${c.status})`).join('\n        ') || '  • No campaigns yet'}
        - Email Lists: ${enhancedContext.emailLists?.length || 0} email lists
        ${enhancedContext.emailLists?.map(e => `  • ${e.name} (${e.activeEmails}/${e.totalEmails} active)`).join('\n        ') || '  • No email lists yet'}
        - Active Workflows: ${enhancedContext.workflows?.filter(w => w.status !== 'completed').length || 0}
        ${enhancedContext.workflows?.filter(w => w.status !== 'completed').map(w => `  • ${w.businessName}: ${w.stage} (${w.status})`).join('\n        ') || '  • No active workflows'}

        Your specialized role for this business:
        1. Guide through the MechXTech AI Business Toolkit workflow
        2. Help optimize business information for better website generation
        3. Explain the multi-agent process: Website → Images → Marketing → Analytics
        4. Assist with campaign creation and email marketing setup
        5. Provide insights on website performance and optimization
        6. Help with lead generation and conversion strategies
        7. Support marketing automation and customer engagement
        8. Offer guidance on business growth and digital presence
        9. Provide contextual assistance based on user's existing assets and workflows
        10. Help troubleshoot issues with current websites, campaigns, or workflows

        IMPORTANT: When users ask common questions about getting started, workflows, business setup, marketing, or troubleshooting,
        first check if there's specific guidance available and provide that detailed information. Always be helpful,
        professional, and focus on actionable advice that helps them succeed with their business.
      `;
    }

    return { systemPrompt, config };
  }

  // Call GROQ API
  async callGroqAPI(prompt, options = {}) {
    try {
      const {
        model = 'llama3-8b-8192',
        temperature = 0.7,
        maxTokens = 500,
        messages = null
      } = options;

      if (!this.groqApiKey) {
        throw new Error('GROQ API key not configured');
      }

      const requestBody = {
        model,
        temperature,
        max_tokens: maxTokens,
        messages: messages || [
          {
            role: 'user',
            content: prompt
          }
        ]
      };

      const response = await axios.post(this.groqApiUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('GROQ API error:', error.response?.data || error.message);

      // Provide more specific error messages
      if (error.response?.status === 401) {
        throw new Error('GROQ API authentication failed. Please check your API key.');
      } else if (error.response?.status === 429) {
        throw new Error('GROQ API rate limit exceeded. Please try again later.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('GROQ API request timed out. Please try again.');
      } else {
        throw new Error('Failed to get response from GROQ API');
      }
    }
  }

  // Process chatbot message with smart routing
  async processMessage(sessionId, message, businessInfo, chatbotType = null, userId = null) {
    try {
      // Determine chatbot type if not specified
      if (!chatbotType) {
        chatbotType = await this.determineChatbotType(message, { businessInfo });
      }

      // Get or create conversation history
      if (!this.conversationHistory.has(sessionId)) {
        const { systemPrompt, config } = await this.initializeChatbot(businessInfo, chatbotType, userId);
        this.conversationHistory.set(sessionId, {
          messages: [{ role: 'system', content: systemPrompt }],
          chatbotType,
          config,
          userId
        });
      }

      const sessionData = this.conversationHistory.get(sessionId);
      const { messages, config } = sessionData;

      // Check for specific business guidance first (for website generation chatbot)
      let botResponse;
      if (chatbotType === CHATBOT_TYPES.WEBSITE_GENERATION) {
        const guidance = this.getBusinessGuidance(message, {
          currentStage: sessionData.currentStage,
          businessInfo
        });

        if (guidance) {
          // Provide specific guidance
          botResponse = guidance;
        } else {
          // Add user message to history and get AI response
          messages.push({ role: 'user', content: message });

          botResponse = await this.callGroqAPI(null, {
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            messages: messages
          });
        }
      } else {
        // Standard processing for other chatbot types
        messages.push({ role: 'user', content: message });

        botResponse = await this.callGroqAPI(null, {
          model: config.model,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          messages: messages
        });
      }

      // Add bot response to history
      messages.push({ role: 'assistant', content: botResponse });

      // Limit history to last 20 messages to prevent token overflow
      if (messages.length > 20) {
        messages.splice(1, 2); // Remove oldest user-assistant pair, keep system prompt
      }

      return {
        response: botResponse,
        sessionId,
        chatbotType,
        timestamp: new Date().toISOString(),
        capabilities: config.capabilities
      };
    } catch (error) {
      console.error('Chatbot processing error:', error);
      return {
        response: "I apologize, but I'm experiencing technical difficulties. Please try again or contact our support team directly.",
        sessionId,
        timestamp: new Date().toISOString(),
        error: true
      };
    }
  }

  // Get conversation history
  getConversationHistory(sessionId) {
    const sessionData = this.conversationHistory.get(sessionId);
    return sessionData ? sessionData.messages : [];
  }

  // Clear conversation history
  clearConversationHistory(sessionId) {
    this.conversationHistory.delete(sessionId);
  }

  // Get session chatbot type
  getSessionChatbotType(sessionId) {
    const sessionData = this.conversationHistory.get(sessionId);
    return sessionData ? sessionData.chatbotType : CHATBOT_TYPES.GENERAL_PURPOSE;
  }

  // Switch chatbot type for a session
  async switchChatbotType(sessionId, newChatbotType, businessInfo) {
    const sessionData = this.conversationHistory.get(sessionId);
    if (!sessionData) {
      return false;
    }

    const { systemPrompt, config } = await this.initializeChatbot(businessInfo, newChatbotType, sessionData.userId);

    // Update session with new chatbot type
    sessionData.chatbotType = newChatbotType;
    sessionData.config = config;

    // Update system prompt while preserving conversation history
    sessionData.messages[0] = { role: 'system', content: systemPrompt };

    return true;
  }

  // Generate FAQ responses
  async generateFAQ(businessInfo) {
    try {
      const prompt = `
        Generate a comprehensive FAQ section for ${businessInfo.name || businessInfo.businessName}, a business in the ${businessInfo.industry} industry.

        Business Details:
        - Description: ${businessInfo.description}
        - Services: ${businessInfo.keyServices?.join(', ') || businessInfo.services?.join(', ')}
        - Target Audience: ${businessInfo.targetAudience}

        Create 10-15 frequently asked questions and answers that customers would typically ask about this business.
        Include questions about:
        1. Services offered
        2. Pricing and payment
        3. Business hours and contact
        4. Process and procedures
        5. Policies and guarantees

        Return as a valid JSON array with objects containing 'question', 'answer', and 'category' fields.
        Make answers helpful, detailed, and professional.

        Example format:
        [
          {
            "question": "What services do you offer?",
            "answer": "We offer...",
            "category": "services"
          }
        ]
      `;

      const response = await this.callGroqAPI(prompt, {
        model: 'llama3-8b-8192',
        temperature: 0.5,
        maxTokens: 1500
      });

      // Clean and parse JSON response
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error generating FAQ:', error);
      throw new Error('Failed to generate FAQ');
    }
  }

  // Analyze chat interactions for insights
  async analyzeChatInteractions(interactions) {
    try {
      const prompt = `
        Analyze the following customer chat interactions to provide business insights:

        Interactions:
        ${interactions.map((interaction, index) =>
          `${index + 1}. Customer: ${interaction.userMessage}\n   Bot: ${interaction.botResponse}`
        ).join('\n\n')}

        Provide analysis in JSON format with:
        {
          "commonTopics": ["topic1", "topic2"],
          "satisfactionIndicators": {
            "positive": 0,
            "neutral": 0,
            "negative": 0
          },
          "performanceAreas": {
            "strengths": ["area1", "area2"],
            "improvements": ["area1", "area2"]
          },
          "faqSuggestions": [
            {"question": "...", "priority": "high"}
          ],
          "businessInsights": ["insight1", "insight2"]
        }

        Focus on actionable insights that can improve customer service and business operations.
      `;

      const response = await this.callGroqAPI(prompt, {
        model: 'llama3-8b-8192',
        temperature: 0.3,
        maxTokens: 1000
      });

      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error analyzing chat interactions:', error);
      throw new Error('Failed to analyze chat interactions');
    }
  }

  // Generate chatbot training data
  async generateTrainingData(businessInfo, existingFAQ = []) {
    try {
      const prompt = `
        Generate training data for a customer service chatbot for ${businessInfo.name || businessInfo.businessName}.

        Business Information:
        - Industry: ${businessInfo.industry}
        - Description: ${businessInfo.description}
        - Services: ${businessInfo.keyServices?.join(', ') || businessInfo.services?.join(', ')}

        Create 20-30 example customer queries and appropriate responses that cover:
        1. Service inquiries
        2. Pricing questions
        3. Booking/scheduling
        4. General information
        5. Complaint handling
        6. Technical support (if applicable)

        Return as a valid JSON array with objects containing 'userQuery', 'expectedResponse', and 'category' fields.
        Make the queries realistic and varied in phrasing.

        Example format:
        [
          {
            "userQuery": "What are your business hours?",
            "expectedResponse": "Our business hours are...",
            "category": "general"
          }
        ]
      `;

      const response = await this.callGroqAPI(prompt, {
        model: 'llama3-8b-8192',
        temperature: 0.6,
        maxTokens: 2000
      });

      const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error generating training data:', error);
      throw new Error('Failed to generate training data');
    }
  }

  // Get chatbot analytics by type
  getChatbotAnalytics(chatbotType = null) {
    const analytics = {
      totalSessions: 0,
      messageCount: 0,
      avgResponseTime: 0,
      chatbotTypeDistribution: {}
    };

    this.conversationHistory.forEach((sessionData, sessionId) => {
      if (!chatbotType || sessionData.chatbotType === chatbotType) {
        analytics.totalSessions++;
        analytics.messageCount += sessionData.messages.length - 1; // Exclude system message

        const type = sessionData.chatbotType;
        analytics.chatbotTypeDistribution[type] = (analytics.chatbotTypeDistribution[type] || 0) + 1;
      }
    });

    return analytics;
  }
}

// Export both the service instance and the chatbot types
module.exports = {
  chatbotService: new ChatbotService(),
  CHATBOT_TYPES
};
