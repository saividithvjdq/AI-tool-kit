const Groq = require('groq-sdk');

class MarketingAIService {
  constructor() {
    console.log('🔧 Initializing Marketing AI Service...');
    console.log('GROQ_API_KEY present:', !!process.env.GROQ_API_KEY);

    if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('placeholder')) {
      try {
        this.groq = new Groq({
          apiKey: process.env.GROQ_API_KEY
        });
        this.groqAvailable = true;
        console.log('✅ GROQ AI service initialized successfully');
      } catch (error) {
        console.warn('⚠️ GROQ AI service initialization failed:', error.message);
        this.groq = null;
        this.groqAvailable = false;
      }
    } else {
      console.warn('⚠️ GROQ API key not configured - using fallback responses for marketing AI');
      this.groq = null;
      this.groqAvailable = false;
    }
  }

  async generateEmailCampaign(campaignData) {
    const { businessInfo, campaignType, audience, tone, goals, productInfo } = campaignData;

    // Check if GROQ is available
    if (!this.groqAvailable) {
      console.log('GROQ not available, using fallback email campaign generation');
      return this.generateFallbackEmailCampaign(campaignData);
    }

    const prompt = `
You are an expert email marketing copywriter. Create a compelling email campaign with the following details:

Business Information:
- Company: ${businessInfo.company || 'Our Company'}
- Industry: ${businessInfo.industry || 'General'}
- Brand Voice: ${tone || 'Professional and friendly'}

Campaign Details:
- Type: ${campaignType || 'promotional'}
- Target Audience: ${audience || 'general customers'}
- Goals: ${goals || 'increase engagement'}
- Product/Service: ${productInfo || 'our products and services'}

Please generate:
1. A compelling subject line (under 50 characters)
2. A preview text (under 90 characters)
3. HTML email content with proper structure
4. Plain text version
5. Call-to-action suggestions

Make the content engaging, personalized, and conversion-focused. Include proper email structure with header, body, and footer. Use modern email design principles.

Format your response as JSON:
{
  "subject": "subject line here",
  "previewText": "preview text here",
  "html": "full HTML email content here",
  "text": "plain text version here",
  "cta": ["CTA suggestion 1", "CTA suggestion 2", "CTA suggestion 3"]
}
`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content;
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating email campaign with GROQ:', error);
      console.log('Falling back to template-based generation');
      return this.generateFallbackEmailCampaign(campaignData);
    }
  }

  async generateSocialMediaContent(contentData) {
    const { platform, businessInfo, contentType, topic, tone, hashtags } = contentData;

    // Check if GROQ is available
    if (!this.groqAvailable) {
      console.log('GROQ not available, using fallback social media content generation');
      return this.generateFallbackSocialMediaContent(contentData);
    }

    const prompt = `
You are a social media marketing expert. Create engaging ${platform} content with these details:

Business Information:
- Company: ${businessInfo.company || 'Our Company'}
- Industry: ${businessInfo.industry || 'General'}
- Brand Voice: ${tone || 'Professional and engaging'}

Content Details:
- Platform: ${platform}
- Content Type: ${contentType || 'promotional post'}
- Topic: ${topic || 'general business update'}
- Suggested Hashtags: ${hashtags || 'relevant industry hashtags'}

Create content optimized for ${platform} with:
1. Engaging copy appropriate for the platform
2. Relevant hashtags
3. Call-to-action
4. Image/video suggestions

Platform-specific requirements:
- LinkedIn: Professional, thought leadership
- Instagram: Visual, lifestyle-focused
- Twitter: Concise, trending topics
- Facebook: Community-building, storytelling

Format as JSON:
{
  "content": "main post content here",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "cta": "call to action",
  "imagePrompt": "description for image/video content",
  "bestTimeToPost": "suggested posting time",
  "engagementTips": ["tip1", "tip2", "tip3"]
}
`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.8,
        max_tokens: 1500
      });

      const response = completion.choices[0]?.message?.content;
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating social media content with GROQ:', error);
      console.log('Falling back to template-based generation');
      return this.generateFallbackSocialMediaContent(contentData);
    }
  }

  async generateNewsletterContent(newsletterData) {
    const { businessInfo, topics, audience, frequency, tone } = newsletterData;
    
    const prompt = `
Create a comprehensive newsletter for ${businessInfo.company || 'our company'} with these specifications:

Business Context:
- Company: ${businessInfo.company || 'Our Company'}
- Industry: ${businessInfo.industry || 'General'}
- Audience: ${audience || 'customers and prospects'}
- Frequency: ${frequency || 'monthly'}
- Tone: ${tone || 'professional and informative'}

Newsletter Topics:
${topics.map(topic => `- ${topic}`).join('\n')}

Create a newsletter with:
1. Compelling subject line
2. Header section with greeting
3. Main content sections for each topic
4. Industry insights or tips
5. Company updates section
6. Call-to-action
7. Footer with social links

Make it valuable, informative, and engaging. Include proper HTML structure for email clients.

Format as JSON:
{
  "subject": "newsletter subject line",
  "html": "complete HTML newsletter content",
  "text": "plain text version",
  "sections": [
    {
      "title": "section title",
      "content": "section content",
      "type": "main|update|tip|cta"
    }
  ]
}
`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 2500
      });

      const response = completion.choices[0]?.message?.content;
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating newsletter:', error);
      throw new Error('Failed to generate newsletter content');
    }
  }

  async generateAutomationSequence(sequenceData) {
    const { trigger, businessInfo, goals, audienceSegment, sequenceLength } = sequenceData;
    
    const prompt = `
Create an automated email sequence for ${businessInfo.company || 'our company'} with these parameters:

Business Information:
- Company: ${businessInfo.company || 'Our Company'}
- Industry: ${businessInfo.industry || 'General'}

Automation Details:
- Trigger: ${trigger}
- Goal: ${goals || 'nurture leads and increase conversions'}
- Audience: ${audienceSegment || 'new subscribers'}
- Sequence Length: ${sequenceLength || 5} emails
- Send Frequency: Every 2-3 days

Create a sequence that:
1. Welcomes and sets expectations
2. Provides value and builds trust
3. Educates about products/services
4. Addresses common objections
5. Includes clear calls-to-action

For each email, provide:
- Subject line
- Send delay (in hours from trigger)
- Email content (HTML and text)
- Primary goal

Format as JSON:
{
  "sequenceName": "sequence name",
  "description": "sequence description",
  "emails": [
    {
      "step": 1,
      "subject": "email subject",
      "delayHours": 0,
      "goal": "email goal",
      "html": "HTML content",
      "text": "plain text content"
    }
  ]
}
`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 3000
      });

      const response = completion.choices[0]?.message?.content;
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating automation sequence:', error);
      throw new Error('Failed to generate automation sequence');
    }
  }

  async optimizeCampaign(campaignData, performanceData) {
    const { campaign, analytics } = campaignData;
    const { openRate, clickRate, conversionRate } = performanceData;
    
    const prompt = `
Analyze this email campaign performance and provide optimization recommendations:

Campaign Details:
- Subject: ${campaign.subject}
- Type: ${campaign.type}
- Audience: ${campaign.audience}

Performance Metrics:
- Open Rate: ${openRate}%
- Click Rate: ${clickRate}%
- Conversion Rate: ${conversionRate}%
- Sent: ${analytics.sent}
- Delivered: ${analytics.delivered}

Industry Benchmarks:
- Average Open Rate: 21.33%
- Average Click Rate: 2.62%
- Average Conversion Rate: 1.33%

Provide specific, actionable recommendations for:
1. Subject line optimization
2. Content improvements
3. Send time optimization
4. Audience segmentation
5. A/B testing suggestions

Format as JSON:
{
  "overallScore": "A-F grade",
  "recommendations": [
    {
      "category": "subject_line|content|timing|audience|testing",
      "priority": "high|medium|low",
      "recommendation": "specific recommendation",
      "expectedImpact": "expected improvement"
    }
  ],
  "nextSteps": ["action 1", "action 2", "action 3"]
}
`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.6,
        max_tokens: 1500
      });

      const response = completion.choices[0]?.message?.content;
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error optimizing campaign:', error);
      throw new Error('Failed to optimize campaign');
    }
  }

  async generateLeadMagnet(leadMagnetData) {
    const { businessInfo, topic, format, targetAudience } = leadMagnetData;

    const prompt = `
Create a compelling lead magnet for ${businessInfo.company || 'our company'}:

Business Context:
- Company: ${businessInfo.company || 'Our Company'}
- Industry: ${businessInfo.industry || 'General'}
- Target Audience: ${targetAudience || 'potential customers'}

Lead Magnet Details:
- Topic: ${topic}
- Format: ${format || 'PDF guide'}
- Goal: Capture leads and provide value

Create:
1. Compelling title and subtitle
2. Outline with key sections
3. Landing page copy
4. Email opt-in form copy
5. Follow-up email sequence (3 emails)

Format as JSON:
{
  "title": "lead magnet title",
  "subtitle": "compelling subtitle",
  "outline": ["section 1", "section 2", "section 3"],
  "landingPageCopy": {
    "headline": "main headline",
    "subheadline": "supporting text",
    "benefits": ["benefit 1", "benefit 2", "benefit 3"],
    "cta": "call to action text"
  },
  "optinForm": {
    "headline": "form headline",
    "description": "form description",
    "buttonText": "button text"
  },
  "followUpSequence": [
    {
      "subject": "email subject",
      "content": "email content"
    }
  ]
}
`;

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.7,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content;
      return this.parseJSONResponse(response);
    } catch (error) {
      console.error('Error generating lead magnet:', error);
      throw new Error('Failed to generate lead magnet');
    }
  }

  // Fallback method for email campaign generation when GROQ is not available
  generateFallbackEmailCampaign(campaignData) {
    const { businessInfo, campaignType, audience, tone, goals, productInfo } = campaignData;

    const companyName = businessInfo.company || 'Our Company';
    const industry = businessInfo.industry || 'business';

    // Generate subject line based on campaign type
    const subjectLines = {
      promotional: `Special Offer from ${companyName}`,
      newsletter: `${companyName} Newsletter - Latest Updates`,
      welcome: `Welcome to ${companyName}!`,
      announcement: `Important Update from ${companyName}`,
      event: `You're Invited - ${companyName} Event`
    };

    const subject = subjectLines[campaignType] || `Update from ${companyName}`;

    // Generate preview text
    const previewText = `Discover what's new with ${companyName} and how we can help you succeed.`;

    // Generate HTML content
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
    <style>
        body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: #6366f1; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .cta-button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .highlight { background: #f0f9ff; padding: 15px; border-left: 4px solid #6366f1; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${companyName}</h1>
            <p>${subject}</p>
        </div>

        <div class="content">
            <h2>Hello ${audience}!</h2>

            <p>We hope this email finds you well. At ${companyName}, we're committed to providing exceptional ${industry} services that help you achieve your goals.</p>

            ${campaignType === 'promotional' ? `
            <div class="highlight">
                <h3>🎉 Special Offer Just for You!</h3>
                <p>Take advantage of our limited-time offer and discover how ${productInfo || 'our services'} can benefit you.</p>
            </div>
            ` : ''}

            ${campaignType === 'newsletter' ? `
            <h3>📰 What's New</h3>
            <p>Here are the latest updates and insights from our team:</p>
            <ul>
                <li>New features and improvements to our services</li>
                <li>Industry insights and best practices</li>
                <li>Success stories from our valued clients</li>
            </ul>
            ` : ''}

            ${campaignType === 'welcome' ? `
            <div class="highlight">
                <h3>🎊 Welcome to the ${companyName} Family!</h3>
                <p>We're thrilled to have you on board. Here's what you can expect from us:</p>
                <ul>
                    <li>Expert guidance and support</li>
                    <li>Regular updates and valuable insights</li>
                    <li>Access to exclusive resources and offers</li>
                </ul>
            </div>
            ` : ''}

            <p>Our goal is to ${goals || 'help you succeed'} by providing you with the best possible experience and results.</p>

            <div style="text-align: center;">
                <a href="#" class="cta-button">Get Started Today</a>
            </div>

            <p>If you have any questions or need assistance, please don't hesitate to reach out to our team. We're here to help!</p>

            <p>Best regards,<br>
            The ${companyName} Team</p>
        </div>

        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            <p>You received this email because you subscribed to our updates.</p>
            <p><a href="#" style="color: #6366f1;">Unsubscribe</a> | <a href="#" style="color: #6366f1;">Update Preferences</a></p>
        </div>
    </div>
</body>
</html>`;

    // Generate plain text version
    const text = `
${subject}

Hello ${audience}!

We hope this email finds you well. At ${companyName}, we're committed to providing exceptional ${industry} services that help you achieve your goals.

${campaignType === 'promotional' ? `
SPECIAL OFFER JUST FOR YOU!
Take advantage of our limited-time offer and discover how ${productInfo || 'our services'} can benefit you.
` : ''}

${campaignType === 'newsletter' ? `
WHAT'S NEW:
- New features and improvements to our services
- Industry insights and best practices
- Success stories from our valued clients
` : ''}

${campaignType === 'welcome' ? `
WELCOME TO THE ${companyName.toUpperCase()} FAMILY!
We're thrilled to have you on board. Here's what you can expect from us:
- Expert guidance and support
- Regular updates and valuable insights
- Access to exclusive resources and offers
` : ''}

Our goal is to ${goals || 'help you succeed'} by providing you with the best possible experience and results.

If you have any questions or need assistance, please don't hesitate to reach out to our team. We're here to help!

Best regards,
The ${companyName} Team

---
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
You received this email because you subscribed to our updates.
`;

    // Generate CTAs based on campaign type
    const ctaOptions = {
      promotional: ['Shop Now', 'Get Offer', 'Learn More'],
      newsletter: ['Read More', 'Visit Website', 'Contact Us'],
      welcome: ['Get Started', 'Explore Features', 'Contact Support'],
      announcement: ['Learn More', 'Read Details', 'Contact Us'],
      event: ['Register Now', 'Learn More', 'Save the Date']
    };

    return {
      subject,
      previewText,
      html,
      text: text.trim(),
      cta: ctaOptions[campaignType] || ['Learn More', 'Get Started', 'Contact Us']
    };
  }

  // Fallback method for social media content generation when GROQ is not available
  generateFallbackSocialMediaContent(contentData) {
    const { platform, businessInfo, contentType, topic, tone, hashtags } = contentData;

    const companyName = businessInfo.company || 'Our Company';
    const industry = businessInfo.industry || 'business';

    // Platform-specific content templates
    const platformTemplates = {
      linkedin: {
        content: `🚀 Exciting news from ${companyName}!\n\nWe're passionate about delivering exceptional ${industry} solutions that help our clients achieve their goals. ${topic ? `Today, let's talk about ${topic}.` : ''}\n\n💡 Key insights:\n• Innovation drives success\n• Quality matters most\n• Customer satisfaction is our priority\n\nWhat challenges are you facing in your ${industry} journey? Let's connect and discuss how we can help!\n\n#${industry} #business #innovation #success`,
        hashtags: [`${industry}`, 'business', 'innovation', 'success', 'professional'],
        cta: 'Connect with us to learn more',
        imagePrompt: 'Professional business setting with modern office environment',
        bestTimeToPost: 'Tuesday-Thursday, 9-11 AM',
        engagementTips: ['Ask questions to encourage comments', 'Share industry insights', 'Use professional tone']
      },
      instagram: {
        content: `✨ ${companyName} bringing you the best in ${industry}! ✨\n\n${topic ? `Today's focus: ${topic} 📸` : 'Sharing some behind-the-scenes magic! 📸'}\n\nWe believe in:\n🌟 Quality first\n💪 Innovation always\n❤️ Happy customers\n\nWhat do you love most about ${industry}? Tell us in the comments! 👇`,
        hashtags: [`${industry}`, 'business', 'quality', 'innovation', 'lifestyle', 'instagood'],
        cta: 'Follow us for more updates!',
        imagePrompt: 'Bright, colorful image showcasing products or services with good lighting',
        bestTimeToPost: 'Monday, Wednesday, Friday 11 AM - 1 PM',
        engagementTips: ['Use high-quality visuals', 'Include call-to-action in caption', 'Engage with comments quickly']
      },
      twitter: {
        content: `🔥 ${companyName} is revolutionizing ${industry}! ${topic ? `\n\n💭 Thoughts on ${topic}?` : ''}\n\n🎯 Our mission: Deliver excellence\n📈 Our goal: Your success\n\nJoin the conversation! What's your biggest ${industry} challenge?`,
        hashtags: [`${industry}`, 'business', 'innovation', 'success'],
        cta: 'Retweet if you agree!',
        imagePrompt: 'Clean, simple graphic with key message or statistic',
        bestTimeToPost: 'Monday-Friday, 12-3 PM',
        engagementTips: ['Keep it concise', 'Use trending hashtags', 'Engage with replies']
      },
      facebook: {
        content: `👋 Hello from the ${companyName} family!\n\nWe're excited to share what makes us passionate about ${industry}. ${topic ? `Today, we want to highlight ${topic} and how it impacts our community.` : ''}\n\n🌟 Our story is built on:\n• Dedication to quality\n• Commitment to innovation\n• Love for our customers\n\nWe'd love to hear from you! What questions do you have about ${industry}? Drop them in the comments below and our team will be happy to help! 💬\n\nThank you for being part of our journey! 🙏`,
        hashtags: [`${industry}`, 'community', 'business', 'quality', 'customerservice'],
        cta: 'Like and share if this resonates with you!',
        imagePrompt: 'Warm, inviting image that shows community or team collaboration',
        bestTimeToPost: 'Tuesday, Wednesday, Thursday 1-4 PM',
        engagementTips: ['Tell a story', 'Ask questions', 'Respond to all comments']
      }
    };

    const template = platformTemplates[platform.toLowerCase()] || platformTemplates.linkedin;

    // Add custom hashtags if provided
    let finalHashtags = template.hashtags;
    if (hashtags && Array.isArray(hashtags)) {
      finalHashtags = [...new Set([...template.hashtags, ...hashtags])];
    } else if (hashtags && typeof hashtags === 'string') {
      const customHashtags = hashtags.split(',').map(tag => tag.trim().replace('#', ''));
      finalHashtags = [...new Set([...template.hashtags, ...customHashtags])];
    }

    return {
      content: template.content,
      hashtags: finalHashtags,
      cta: template.cta,
      imagePrompt: template.imagePrompt,
      bestTimeToPost: template.bestTimeToPost,
      engagementTips: template.engagementTips
    };
  }

  parseJSONResponse(response) {
    try {
      // Clean the response first
      let cleanResponse = response.trim();

      // Remove markdown code blocks if present
      cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Try to extract JSON from the response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];

        // Clean up common JSON issues
        jsonStr = jsonStr
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\n/g, '\\n') // Escape newlines
          .replace(/\r/g, '\\r') // Escape carriage returns
          .replace(/\t/g, '\\t'); // Escape tabs

        return JSON.parse(jsonStr);
      }

      // If no JSON found, create a fallback response
      return {
        subject: 'AI-Generated Campaign',
        html: `<h1>AI-Generated Content</h1><p>${response}</p>`,
        text: response,
        cta: ['Learn More', 'Get Started', 'Contact Us']
      };
    } catch (error) {
      console.error('Error parsing JSON response:', error);

      // Return a fallback response
      return {
        subject: 'AI-Generated Campaign',
        html: `<h1>AI-Generated Content</h1><p>${response}</p>`,
        text: response,
        cta: ['Learn More', 'Get Started', 'Contact Us']
      };
    }
  }
}

module.exports = new MarketingAIService();
