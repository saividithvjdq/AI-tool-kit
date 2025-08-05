const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const contextManager = require('../services/contextManager');
const aiService = require('../services/aiService');
const NotificationService = require('../services/notificationService');
const Website = require('../models/Website');

// Optional thumbnail service - only load if available
let thumbnailService = null;
try {
  thumbnailService = require('../services/thumbnailService');
} catch (error) {
  console.warn('Thumbnail service not available - puppeteer not installed');
}

const router = express.Router();
const AGENT_ID = 'website-generator';

class WebsiteGeneratorAgent {
  constructor() {
    this.agentId = AGENT_ID;
    this.status = 'active';
    this.capabilities = [
      'html-generation',
      'css-styling',
      'javascript-functionality',
      'seo-optimization',
      'responsive-design'
    ];
    
    // Listen for context events
    contextManager.on('context-created', this.handleContextCreated.bind(this));
    contextManager.on('context-updated', this.handleContextUpdated.bind(this));
  }

  // Handle new context creation
  async handleContextCreated(event) {
    console.log(`[${this.agentId}] Context creation event received:`, event);
    if (event.targetAgent === this.agentId) {
      console.log(`[${this.agentId}] Processing context creation for website:`, event.websiteId);
      try {
        await this.processWebsiteGeneration(event.websiteId, event.userId);
      } catch (error) {
        console.error(`[${this.agentId}] Error processing website generation:`, error);
      }
    } else {
      console.log(`[${this.agentId}] Event not for this agent (target: ${event.targetAgent})`);
    }
  }

  // Handle context updates
  async handleContextUpdated(event) {
    // React to updates from other agents if needed
    console.log(`[${this.agentId}] Context updated by ${event.agentId}`);
  }

  // Main website generation process
  async processWebsiteGeneration(websiteId, userId) {
    const startTime = Date.now();

    try {
      console.log(`[${this.agentId}] Starting website generation for ${websiteId}`);

      // Update status to in-progress
      await contextManager.updateContext(websiteId, this.agentId, {
        'websiteAgent.status': 'generating'
      });

      console.log(`[${this.agentId}] Status updated to generating`);

      // Send workflow start notification
      const notificationContext = await contextManager.getContext(websiteId);
      try {
        await NotificationService.notifyWorkflowStarted(userId, {
          websiteId,
          businessInfo: notificationContext.businessContext
        });
        console.log(`[${this.agentId}] Workflow start notification sent`);
      } catch (notificationError) {
        console.error('Failed to send workflow start notification:', notificationError);
      }

      // Get context
      const context = await contextManager.getContext(websiteId);
      console.log(`[${this.agentId}] Context retrieved for business: ${context.businessContext.name}`);

      // Generate website content using AI
      console.log(`[${this.agentId}] Generating website content...`);
      const generatedContent = await this.generateWebsiteContent(context.businessContext);
      console.log(`[${this.agentId}] Website content generated successfully`);

      // Create website record
      console.log(`[${this.agentId}] Creating website record...`);
      const website = await this.createWebsiteRecord(websiteId, userId, context, generatedContent);
      console.log(`[${this.agentId}] Website record created successfully`);
      
      // Update context with generated content
      const processingTime = Date.now() - startTime;
      await contextManager.updateContext(websiteId, this.agentId, {
        'websiteAgent.status': 'completed',
        'websiteAgent.generatedContent': generatedContent,
        'websiteAgent.seoData': generatedContent.seo,
        'websiteAgent.lastProcessed': new Date(),
        'websiteAgent.processingTime': processingTime
      });

      // Log activity
      await contextManager.logActivity(
        websiteId,
        this.agentId,
        'generated',
        'completed',
        { websiteId, processingTime }
      );

      // Generate website thumbnail
      if (thumbnailService) {
        try {
          console.log(`[${this.agentId}] Generating website thumbnail...`);
          await thumbnailService.generateWebsiteThumbnail(website);
        } catch (thumbnailError) {
          console.error('Failed to generate website thumbnail:', thumbnailError);
          // Don't fail the entire process for thumbnail generation
        }
      } else {
        console.log(`[${this.agentId}] Thumbnail service not available - skipping thumbnail generation`);
      }

      // Update workflow to trigger next stage (image generation)
      console.log(`[${this.agentId}] Completing stage and triggering next agent`);
      await contextManager.completeStage(websiteId, this.agentId);

      // Send success notification
      try {
        await NotificationService.notifyWebsiteGenerated(userId, {
          websiteId,
          businessInfo: context.businessContext
        });
      } catch (notificationError) {
        console.error('Failed to send website generation notification:', notificationError);
      }

      console.log(`[${this.agentId}] Website generation completed for ${websiteId}`);

      return { success: true, website, processingTime };
    } catch (error) {
      console.error(`[${this.agentId}] Error generating website:`, error);
      
      // Update context with error
      await contextManager.updateContext(websiteId, this.agentId, {
        'websiteAgent.status': 'failed',
        'websiteAgent.error': error.message,
        'websiteAgent.lastProcessed': new Date()
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
      await contextManager.handleWorkflowError(websiteId, this.agentId, error, 'website-generation');

      // Send error notification
      try {
        await NotificationService.notifyWebsiteGenerationFailed(userId, error);
      } catch (notificationError) {
        console.error('Failed to send website generation error notification:', notificationError);
      }

      throw error;
    }
  }

  // Generate website content using AI
  async generateWebsiteContent(businessContext) {
    try {
      // Use existing AI service to generate content
      const aiContent = await aiService.generateWebsiteContent(businessContext);
      
      // Generate HTML structure
      const html = this.generateHTML(aiContent, businessContext);
      
      // Generate CSS styles
      const css = this.generateCSS(businessContext);
      
      // Generate basic JavaScript
      const javascript = this.generateJavaScript();
      
      // Generate SEO data
      const seo = this.generateSEOData(aiContent, businessContext);
      
      return {
        html,
        css,
        javascript,
        structure: aiContent,
        metadata: {
          generatedAt: new Date(),
          version: '1.0',
          framework: 'vanilla',
          responsive: true
        },
        seo
      };
    } catch (error) {
      console.error('Error generating website content:', error);
      throw error;
    }
  }

  // Generate HTML structure
  generateHTML(content, businessContext) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.seo?.title || businessContext.name}</title>
    <meta name="description" content="${content.seo?.description || businessContext.description}">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="header">
        <nav class="navbar">
            <div class="nav-brand">${businessContext.name}</div>
            <ul class="nav-menu">
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>

    <main>
        <section id="home" class="hero">
            <div class="hero-background">
                <img src="{{HERO_IMAGE_PLACEHOLDER}}" alt="${businessContext.name} hero image" class="hero-image" />
            </div>
            <div class="hero-content">
                <h1>${content.hero?.headline || `Welcome to ${businessContext.name}`}</h1>
                <p>${content.hero?.subheadline || businessContext.description}</p>
                <button class="cta-button">${content.hero?.ctaText || 'Get Started'}</button>
            </div>
        </section>

        <section id="about" class="about">
            <div class="container">
                <div class="about-content">
                    <div class="about-text">
                        <h2>${content.about?.title || 'About Us'}</h2>
                        <p>${content.about?.content || businessContext.description}</p>
                    </div>
                    <div class="about-image">
                        <img src="{{ABOUT_IMAGE_PLACEHOLDER}}" alt="About ${businessContext.name}" />
                    </div>
                </div>
            </div>
        </section>

        <section id="services" class="services">
            <div class="container">
                <h2>Our Services</h2>
                <div class="services-grid">
                    ${(content.services || businessContext.keyServices || []).map((service, index) => `
                        <div class="service-card">
                            <div class="service-icon">
                                <img src="{{SERVICE_${index + 1}_IMAGE_PLACEHOLDER}}" alt="${typeof service === 'object' ? service.title : service} icon" />
                            </div>
                            <h3>${typeof service === 'object' ? service.title : service}</h3>
                            <p>${typeof service === 'object' ? service.description : `Professional ${service} services`}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        </section>

        <section id="contact" class="contact">
            <div class="container">
                <h2>${content.contact?.title || 'Contact Us'}</h2>
                <p>${content.contact?.content || 'Get in touch with us today'}</p>
                <form class="contact-form">
                    <input type="text" placeholder="Your Name" required>
                    <input type="email" placeholder="Your Email" required>
                    <textarea placeholder="Your Message" required></textarea>
                    <button type="submit">Send Message</button>
                </form>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 ${businessContext.name}. All rights reserved.</p>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>`;
  }

  // Generate CSS styles
  generateCSS(businessContext) {
    const primaryColor = businessContext.primaryColor || '#3b82f6';
    const secondaryColor = businessContext.secondaryColor || '#1f2937';
    
    return `/* Reset and base styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.6;
    color: #333;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Header */
.header {
    background: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    position: fixed;
    width: 100%;
    top: 0;
    z-index: 1000;
}

.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
}

.nav-brand {
    font-size: 1.5rem;
    font-weight: bold;
    color: ${primaryColor};
}

.nav-menu {
    display: flex;
    list-style: none;
    gap: 2rem;
}

.nav-menu a {
    text-decoration: none;
    color: #333;
    font-weight: 500;
    transition: color 0.3s;
}

.nav-menu a:hover {
    color: ${primaryColor};
}

/* Hero Section */
.hero {
    position: relative;
    color: white;
    padding: 120px 0 80px;
    text-align: center;
    overflow: hidden;
}

.hero-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
}

.hero-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.4);
}

.hero-background::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, ${primaryColor}aa, ${secondaryColor}aa);
}

.hero-content {
    position: relative;
    z-index: 2;
}

.hero-content h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

.hero-content p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}

.cta-button {
    background: white;
    color: ${primaryColor};
    padding: 12px 30px;
    border: none;
    border-radius: 6px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.3s;
}

.cta-button:hover {
    transform: translateY(-2px);
}

/* Sections */
section {
    padding: 80px 0;
}

.about {
    background: #f8fafc;
}

.about-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
}

.about-text h2 {
    margin-bottom: 2rem;
    color: ${primaryColor};
}

.about-text p {
    font-size: 1.1rem;
    line-height: 1.8;
    color: #666;
}

.about-image img {
    width: 100%;
    height: 400px;
    object-fit: cover;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 3rem;
}

.service-card {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    transition: transform 0.3s;
    text-align: center;
}

.service-card:hover {
    transform: translateY(-5px);
}

.service-icon {
    margin-bottom: 1.5rem;
}

.service-icon img {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 50%;
    border: 3px solid ${primaryColor};
}

/* Contact Form */
.contact-form {
    max-width: 600px;
    margin: 2rem auto 0;
}

.contact-form input,
.contact-form textarea {
    width: 100%;
    padding: 12px;
    margin-bottom: 1rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
}

.contact-form button {
    background: ${primaryColor};
    color: white;
    padding: 12px 30px;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.3s;
}

.contact-form button:hover {
    background: ${secondaryColor};
}

/* Footer */
.footer {
    background: ${secondaryColor};
    color: white;
    text-align: center;
    padding: 2rem 0;
}

/* Responsive */
@media (max-width: 768px) {
    .nav-menu {
        display: none;
    }
    
    .hero-content h1 {
        font-size: 2rem;
    }
    
    .services-grid {
        grid-template-columns: 1fr;
    }
}`;
  }

  // Generate basic JavaScript
  generateJavaScript() {
    return `// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Contact form handling
document.querySelector('.contact-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    // Simple validation
    if (!data.name || !data.email || !data.message) {
        alert('Please fill in all fields');
        return;
    }
    
    // Here you would typically send the data to your server
    alert('Thank you for your message! We will get back to you soon.');
    this.reset();
});

// Add scroll effect to header
window.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.backdropFilter = 'blur(10px)';
    } else {
        header.style.background = 'white';
        header.style.backdropFilter = 'none';
    }
});`;
  }

  // Generate SEO data
  generateSEOData(content, businessContext) {
    return {
      title: `${businessContext.name} - ${businessContext.industry} Services`,
      description: businessContext.description || `Professional ${businessContext.industry} services by ${businessContext.name}`,
      keywords: [
        businessContext.name,
        businessContext.industry,
        ...(businessContext.keyServices || []),
        ...(businessContext.keywords || [])
      ],
      ogImage: null, // Will be set by image generator
      structuredData: {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": businessContext.name,
        "description": businessContext.description,
        "url": `https://${businessContext.name.toLowerCase().replace(/\s+/g, '')}.com`
      }
    };
  }

  // Create website record in database
  async createWebsiteRecord(websiteId, userId, context, generatedContent) {
    try {
      const website = new Website({
        _id: websiteId,
        userId,
        businessInfo: {
          name: context.businessContext.name,
          industry: context.businessContext.industry,
          description: context.businessContext.description,
          targetAudience: context.businessContext.targetAudience,
          keyServices: context.businessContext.keyServices || []
        },
        design: {
          template: 'ai-generated',
          colorScheme: {
            primary: '#3b82f6',
            secondary: '#1f2937',
            accent: '#10b981',
            background: '#ffffff',
            text: '#333333'
          },
          fonts: {
            heading: 'Inter',
            body: 'Inter'
          },
          layout: 'single-page'
        },
        content: generatedContent.structure,
        seo: generatedContent.seo,
        status: 'draft',
        domain: {
          subdomain: context.businessContext.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        },
        performance: {
          lastGenerated: new Date(),
          generationTime: Date.now()
        }
      });

      await website.save();
      return website;
    } catch (error) {
      console.error('Error creating website record:', error);
      throw error;
    }
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
const websiteGeneratorAgent = new WebsiteGeneratorAgent();

// API Routes
router.post('/generate', auth, [
  body('prompt').notEmpty().withMessage('Prompt is required'),
  body('businessContext').isObject().withMessage('Business context is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { prompt, businessContext } = req.body;
    const userId = req.user.id;

    // Create website record first to get ID
    const website = new Website({
      userId,
      businessInfo: {
        name: businessContext.name,
        industry: businessContext.industry,
        description: businessContext.description
      },
      status: 'draft'
    });
    await website.save();

    // Create context and trigger generation
    const context = await contextManager.createContext(
      website._id,
      userId,
      prompt,
      businessContext
    );

    res.json({
      message: 'Website generation started',
      websiteId: website._id,
      contextId: context._id,
      status: 'generating'
    });
  } catch (error) {
    console.error('Error starting website generation:', error);
    res.status(500).json({
      message: 'Failed to start website generation',
      error: error.message
    });
  }
});

router.get('/status/:websiteId', auth, async (req, res) => {
  try {
    const { websiteId } = req.params;
    const status = await contextManager.getContextStatus(websiteId);
    
    res.json({
      message: 'Status retrieved successfully',
      status
    });
  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      message: 'Failed to get status',
      error: error.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json(websiteGeneratorAgent.getStatus());
});

module.exports = { router, agent: websiteGeneratorAgent };
