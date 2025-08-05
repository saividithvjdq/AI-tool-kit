// Specialized prompts for business website generation assistance

const BUSINESS_PROMPTS = {
  // Website Generation Workflow Guidance
  WEBSITE_WORKFLOW: {
    GETTING_STARTED: `
      Welcome to MechXTech AI Business Toolkit! I'm here to guide you through creating a professional website for your business.

      Let's start with the basics. To create the perfect website for you, I need to understand your business better:

      1. **Business Name**: What's your business called?
      2. **Industry**: What industry are you in? (e.g., restaurant, consulting, retail, healthcare)
      3. **Description**: Tell me about your business in 2-3 sentences
      4. **Target Audience**: Who are your ideal customers?
      5. **Key Services**: What are your main products or services?

      Once I have this information, I'll guide you through our multi-agent workflow:
      📝 **Website Generation** → 🎨 **Image Creation** → 📧 **Marketing Setup** → 📊 **Analytics Configuration**

      What would you like to start with?
    `,

    WORKFLOW_EXPLANATION: `
      Here's how our AI-powered business toolkit works:

      🔄 **Multi-Agent Workflow Process:**

      **Stage 1: Website Generation** 
      - AI analyzes your business information
      - Creates professional website content
      - Designs layout and structure
      - Generates SEO-optimized pages

      **Stage 2: Image Generation**
      - Creates custom images for your website
      - Generates logos and branding materials
      - Produces marketing visuals
      - Ensures consistent visual identity

      **Stage 3: Marketing Optimization**
      - Sets up email marketing campaigns
      - Creates social media content
      - Develops lead generation forms
      - Configures automation workflows

      **Stage 4: Analytics Setup**
      - Implements tracking systems
      - Sets up performance monitoring
      - Creates reporting dashboards
      - Enables data-driven insights

      Each stage builds on the previous one, creating a complete digital presence for your business. Would you like me to explain any specific stage in more detail?
    `,

    STAGE_GUIDANCE: {
      'website-generation': `
        🏗️ **Website Generation Stage**

        We're currently creating your website! Here's what's happening:

        ✅ **Content Creation**: AI is writing compelling copy for your pages
        ✅ **Design Selection**: Choosing the best template for your industry
        ✅ **SEO Optimization**: Adding keywords and meta descriptions
        ✅ **Mobile Responsiveness**: Ensuring it looks great on all devices

        **What you can do while we work:**
        - Review your business information for accuracy
        - Think about additional services you want to highlight
        - Consider your preferred color scheme
        - Prepare any specific content you want included

        The website generation typically takes 2-3 minutes. I'll notify you when it's ready for review!
      `,

      'image-generation': `
        🎨 **Image Generation Stage**

        Now we're creating custom visuals for your website:

        ✅ **Hero Images**: Eye-catching banners for your homepage
        ✅ **Service Icons**: Professional icons for your services
        ✅ **Background Images**: Relevant industry-specific backgrounds
        ✅ **Logo Variations**: Different versions of your logo

        **Tips for better images:**
        - Specific descriptions get better results
        - Mention your brand colors if you have them
        - Consider your target audience's preferences
        - Think about the mood you want to convey

        Would you like to customize any specific images or let our AI choose the best options for your industry?
      `,

      'marketing-optimization': `
        📧 **Marketing Optimization Stage**

        Time to set up your marketing automation:

        ✅ **Email Campaigns**: Welcome series and promotional emails
        ✅ **Lead Magnets**: Free resources to capture leads
        ✅ **Contact Forms**: Strategically placed conversion forms
        ✅ **Social Media**: Content for your social platforms

        **Marketing features available:**
        - Automated email sequences
        - Customer segmentation
        - A/B testing capabilities
        - Performance tracking

        Do you have an existing email list, or should we help you start building one from scratch?
      `,

      'analytics-setup': `
        📊 **Analytics Setup Stage**

        Finally, we're configuring your tracking and analytics:

        ✅ **Google Analytics**: Website traffic and user behavior
        ✅ **Conversion Tracking**: Monitor leads and sales
        ✅ **Performance Metrics**: Page speed and SEO scores
        ✅ **Custom Dashboards**: Easy-to-understand reports

        **What you'll be able to track:**
        - Website visitors and their behavior
        - Email campaign performance
        - Lead generation effectiveness
        - ROI on marketing efforts

        Once complete, you'll have a comprehensive view of your digital marketing performance!
      `
    }
  },

  // Business Information Input Assistance
  BUSINESS_INPUT: {
    INDUSTRY_GUIDANCE: `
      Let me help you choose the right industry category for your business:

      **Popular Industries:**
      🏪 **Retail/E-commerce** - Selling products online or in-store
      🍽️ **Restaurant/Food Service** - Dining, catering, food delivery
      💼 **Professional Services** - Consulting, legal, accounting, coaching
      🏥 **Healthcare** - Medical, dental, wellness, fitness
      🏠 **Real Estate** - Property sales, rentals, property management
      🔧 **Home Services** - Plumbing, electrical, cleaning, landscaping
      💻 **Technology** - Software, IT services, web development
      🎓 **Education** - Training, tutoring, online courses
      💄 **Beauty/Wellness** - Salons, spas, personal care
      🚗 **Automotive** - Car sales, repairs, services

      If your industry isn't listed, just describe what your business does, and I'll help categorize it appropriately.
    `,

    TARGET_AUDIENCE_HELP: `
      Defining your target audience is crucial for effective marketing. Let me help you identify yours:

      **Consider these factors:**

      **Demographics:**
      - Age range (e.g., 25-45 years old)
      - Gender (if relevant)
      - Income level
      - Location (local, national, international)

      **Psychographics:**
      - Interests and hobbies
      - Values and beliefs
      - Lifestyle preferences
      - Pain points and challenges

      **Business Characteristics (B2B):**
      - Company size
      - Industry
      - Job titles/roles
      - Budget range

      **Examples:**
      - "Small business owners looking to improve their online presence"
      - "Health-conscious millennials in urban areas"
      - "Busy parents who value convenience and quality"

      Who do you envision as your ideal customer?
    `,

    SERVICES_OPTIMIZATION: `
      Let's optimize how you describe your services for maximum impact:

      **Best Practices:**
      ✅ **Be Specific**: Instead of "consulting," say "digital marketing consulting"
      ✅ **Focus on Benefits**: What problem do you solve?
      ✅ **Use Keywords**: Include terms your customers search for
      ✅ **Show Value**: What makes you different?

      **Service Description Framework:**
      1. **What** you do
      2. **Who** it's for
      3. **Why** it matters
      4. **How** you deliver value

      **Example Transformations:**
      ❌ "Web design" 
      ✅ "Custom website design that converts visitors into customers"

      ❌ "Accounting services"
      ✅ "Small business accounting and tax preparation to maximize your profits"

      What services would you like help describing?
    `
  },

  // Marketing Features Guidance
  MARKETING_FEATURES: {
    EMAIL_MARKETING: `
      📧 **Email Marketing Made Simple**

      Our email marketing system helps you:

      **Automated Campaigns:**
      - Welcome series for new subscribers
      - Abandoned cart recovery
      - Birthday and anniversary emails
      - Re-engagement campaigns

      **List Management:**
      - Segmentation by interests/behavior
      - Import existing contacts
      - Compliance with privacy laws
      - Unsubscribe management

      **Performance Tracking:**
      - Open and click rates
      - Conversion tracking
      - A/B testing results
      - Revenue attribution

      **Getting Started:**
      1. Import or create your first email list
      2. Design your welcome email
      3. Set up automated sequences
      4. Monitor and optimize performance

      Do you have an existing email list, or should we start building one?
    `,

    CAMPAIGN_CREATION: `
      🚀 **Campaign Creation Guide**

      Let's create your first marketing campaign:

      **Campaign Types:**
      📧 **Email Campaigns** - Newsletters, promotions, announcements
      📱 **Social Media** - Posts, stories, ads across platforms
      📞 **SMS Marketing** - Text message promotions and updates
      🤖 **Automation** - Triggered sequences based on user behavior

      **Campaign Planning:**
      1. **Goal**: What do you want to achieve?
      2. **Audience**: Who should receive this?
      3. **Message**: What's your key message?
      4. **Timing**: When should it go out?
      5. **Success Metrics**: How will you measure success?

      **Best Practices:**
      - Keep subject lines under 50 characters
      - Include a clear call-to-action
      - Test on mobile devices
      - Personalize when possible

      What type of campaign would you like to create first?
    `,

    LEAD_GENERATION: `
      🎯 **Lead Generation Strategies**

      Turn website visitors into potential customers:

      **Lead Magnets:**
      📚 Free guides or ebooks
      🎥 Video tutorials or webinars
      📊 Templates or checklists
      🎁 Discount codes or free trials
      📋 Assessments or quizzes

      **Capture Methods:**
      - Pop-up forms (exit-intent)
      - Embedded forms in content
      - Landing pages
      - Social media lead ads

      **Optimization Tips:**
      ✅ Offer genuine value
      ✅ Keep forms short (3-5 fields max)
      ✅ Use compelling headlines
      ✅ Test different offers
      ✅ Follow up quickly

      **Lead Nurturing:**
      1. Send immediate thank you
      2. Deliver promised content
      3. Provide additional value
      4. Guide toward purchase decision

      What type of lead magnet would work best for your business?
    `
  },

  // Troubleshooting and Support
  TROUBLESHOOTING: {
    COMMON_ISSUES: `
      🔧 **Common Issues & Solutions**

      **Website Issues:**
      - **Slow loading**: Check image sizes and hosting
      - **Mobile display**: Test responsive design
      - **SEO problems**: Review meta tags and content
      - **Contact forms**: Verify email settings

      **Marketing Issues:**
      - **Low open rates**: Improve subject lines
      - **High unsubscribes**: Review content relevance
      - **Poor conversions**: Test different CTAs
      - **Delivery problems**: Check spam filters

      **Technical Issues:**
      - **Domain connection**: Verify DNS settings
      - **SSL certificate**: Ensure HTTPS is active
      - **Analytics tracking**: Check code installation
      - **Integration problems**: Review API connections

      What specific issue are you experiencing? I'll provide detailed troubleshooting steps.
    `,

    PERFORMANCE_OPTIMIZATION: `
      📈 **Performance Optimization Tips**

      **Website Performance:**
      - Optimize images (WebP format, compression)
      - Minimize plugins and scripts
      - Use caching effectively
      - Choose quality hosting

      **Marketing Performance:**
      - A/B test email subject lines
      - Segment your audience
      - Personalize content
      - Optimize send times

      **SEO Performance:**
      - Research relevant keywords
      - Create quality content regularly
      - Build backlinks naturally
      - Improve page speed

      **Conversion Optimization:**
      - Simplify your forms
      - Add social proof
      - Create urgency
      - Test different offers

      Which area would you like to focus on improving first?
    `
  }
};

module.exports = BUSINESS_PROMPTS;
