const express = require('express');
const { body, validationResult } = require('express-validator');
const Campaign = require('../models/Campaign');
const Lead = require('../models/Lead');
const EmailList = require('../models/EmailList');
const { auth } = require('../middleware/auth');
const marketingAI = require('../services/marketingAIService');
const emailService = require('../services/emailService');
const aiService = require('../services/aiService');
const User = require('../models/User');

const router = express.Router();

// @route   POST /api/marketing/campaigns/generate
// @desc    Generate AI-powered email campaign
// @access  Private
router.post('/campaigns/generate', [
  auth,
  body('campaignType').notEmpty().withMessage('Campaign type is required'),
  body('businessInfo.company').notEmpty().withMessage('Company name is required'),
  body('audience').notEmpty().withMessage('Target audience is required'),
  body('websiteId').notEmpty().withMessage('Website ID is required')
], async (req, res) => {
  try {
    console.log('📧 Campaign generation request received:', {
      campaignType: req.body.campaignType,
      company: req.body.businessInfo?.company,
      userId: req.user.id,
      websiteId: req.body.websiteId
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const campaignData = req.body;
    console.log('🔄 Generating AI content...');
    const aiContent = await marketingAI.generateEmailCampaign(campaignData);
    console.log('✅ AI content generated successfully');

    // Create campaign in database
    const campaign = new Campaign({
      userId: req.user.id,
      websiteId: campaignData.websiteId,
      name: `${campaignData.campaignType} Campaign - ${new Date().toLocaleDateString()}`,
      type: 'email',
      subject: aiContent.subject,
      content: {
        html: aiContent.html,
        text: aiContent.text,
        aiGenerated: true,
        prompt: JSON.stringify(campaignData)
      },
      audience: {
        segments: ['custom'], // Use 'custom' for user-defined audiences
        customFilters: {
          description: campaignData.audience // Store the actual audience description here
        },
        totalRecipients: 0
      },
      settings: {
        fromName: campaignData.businessInfo.company,
        fromEmail: req.user.email
      }
    });

    console.log('💾 Saving campaign to database...');
    await campaign.save();
    console.log('✅ Campaign saved successfully with ID:', campaign._id);

    res.json({
      message: 'Campaign generated successfully',
      campaign,
      aiContent,
      suggestions: aiContent.cta || []
    });
  } catch (error) {
    console.error('Error generating campaign:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      campaignData: req.body
    });
    res.status(500).json({
      message: 'Failed to generate campaign',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/marketing/campaigns
// @desc    Get all campaigns for user
// @access  Private
router.get('/campaigns', auth, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10, websiteId } = req.query;

    const filter = { userId: req.user.id };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (websiteId) filter.websiteId = websiteId;

    const campaigns = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Campaign.countDocuments(filter);

    res.json({
      campaigns,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
});

// @route   GET /api/marketing/campaigns/:id
// @desc    Get campaign by ID
// @access  Private
router.get('/campaigns/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ campaign });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ message: 'Failed to fetch campaign' });
  }
});

// @route   PUT /api/marketing/campaigns/:id
// @desc    Update campaign
// @access  Private
router.put('/campaigns/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'subject', 'content', 'audience', 'schedule', 'settings'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        campaign[field] = req.body[field];
      }
    });

    await campaign.save();

    res.json({
      message: 'Campaign updated successfully',
      campaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ message: 'Failed to update campaign' });
  }
});

// @route   POST /api/marketing/newsletter/generate
// @desc    Generate newsletter content using AI
// @access  Private
router.post('/newsletter/generate', auth, [
  body('topics').isArray().withMessage('Topics must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { topics, previousNewsletters = [] } = req.body;
    
    // Get user's business info
    const user = await User.findById(req.user.id);
    const businessInfo = user.businessProfile;

    if (!businessInfo.businessName) {
      return res.status(400).json({ 
        message: 'Please complete your business profile first' 
      });
    }

    // Generate newsletter content using AI
    const newsletterContent = await aiService.generateNewsletter(
      businessInfo, 
      topics, 
      previousNewsletters
    );

    res.json({
      message: 'Newsletter generated successfully',
      newsletterContent
    });
  } catch (error) {
    console.error('Error generating newsletter:', error);
    res.status(500).json({ 
      message: 'Failed to generate newsletter',
      error: error.message 
    });
  }
});

// @route   POST /api/marketing/social/generate
// @desc    Generate social media content using AI
// @access  Private
router.post('/social/generate', auth, [
  body('platform').notEmpty().withMessage('Platform is required'),
  body('contentType').notEmpty().withMessage('Content type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { platform, contentType } = req.body;
    
    // Get user's business info
    const user = await User.findById(req.user.id);
    const businessInfo = user.businessProfile;

    if (!businessInfo.businessName) {
      return res.status(400).json({ 
        message: 'Please complete your business profile first' 
      });
    }

    // Generate social media content using AI
    const socialContent = await aiService.generateSocialMediaContent(
      businessInfo, 
      platform, 
      contentType
    );

    res.json({
      message: 'Social media content generated successfully',
      socialContent
    });
  } catch (error) {
    console.error('Error generating social content:', error);
    res.status(500).json({ 
      message: 'Failed to generate social media content',
      error: error.message 
    });
  }
});

// @route   POST /api/marketing/product/description
// @desc    Generate product description using AI
// @access  Private
router.post('/product/description', auth, [
  body('productInfo.name').notEmpty().withMessage('Product name is required'),
  body('productInfo.category').notEmpty().withMessage('Product category is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { productInfo } = req.body;
    
    // Generate product description using AI
    const productDescription = await aiService.generateProductDescription(productInfo);

    res.json({
      message: 'Product description generated successfully',
      productDescription
    });
  } catch (error) {
    console.error('Error generating product description:', error);
    res.status(500).json({ 
      message: 'Failed to generate product description',
      error: error.message 
    });
  }
});

// @route   GET /api/marketing/templates
// @desc    Get marketing email templates
// @access  Private
router.get('/templates', auth, (req, res) => {
  const templates = [
    {
      id: 'welcome',
      name: 'Welcome Email',
      description: 'Welcome new customers or subscribers',
      category: 'onboarding'
    },
    {
      id: 'promotional',
      name: 'Promotional Email',
      description: 'Promote products, services, or special offers',
      category: 'sales'
    },
    {
      id: 'newsletter',
      name: 'Newsletter',
      description: 'Regular updates and valuable content',
      category: 'engagement'
    },
    {
      id: 'abandoned-cart',
      name: 'Abandoned Cart',
      description: 'Recover abandoned shopping carts',
      category: 'retention'
    },
    {
      id: 'follow-up',
      name: 'Follow-up Email',
      description: 'Follow up after purchase or interaction',
      category: 'retention'
    },
    {
      id: 'event-invitation',
      name: 'Event Invitation',
      description: 'Invite customers to events or webinars',
      category: 'engagement'
    }
  ];

  res.json({ templates });
});

// @route   POST /api/marketing/campaigns/:id/send
// @desc    Send a marketing campaign via email
// @access  Private
router.post('/campaigns/:id/send', [
  auth,
  body('recipientList').optional().isArray().withMessage('Recipient list must be an array if provided')
], async (req, res) => {
  try {
    console.log('📧 Campaign send request received for campaign ID:', req.params.id);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    // Find the campaign
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    let { recipientList, scheduledTime, useEmailList, emailListId } = req.body;
    let emailListUsed = null;

    console.log(`📧 Campaign send request - useEmailList: ${useEmailList}, emailListId: ${emailListId}`);

    // Step 1: Retrieve Email Recipients from Database
    try {
      // First, check if campaign has an associated email list
      if (campaign.emailListId && !emailListId) {
        emailListId = campaign.emailListId;
        useEmailList = true;
        console.log(`📧 Using campaign's associated email list: ${emailListId}`);
      }

      // If useEmailList is true or emailListId is provided, get recipients from email list
      if (useEmailList && emailListId) {
        console.log(`📧 Step 1: Retrieving email list ${emailListId} from database...`);

        const emailList = await EmailList.findById(emailListId);

        // Step 2: Validate Email List
        if (!emailList) {
          console.log(`❌ Email list ${emailListId} not found in database`);
          return res.status(404).json({
            success: false,
            message: 'Email list not found in database'
          });
        }

        console.log(`✅ Email list found: ${emailList.name} (${emailList.emails.length} total emails)`);

        // Check if user has permission to use this email list
        if (!emailList.hasPermission(req.user.email)) {
          console.log(`❌ User ${req.user.email} does not have permission to use email list ${emailList.name}`);
          return res.status(403).json({
            success: false,
            message: 'No permission to use this email list'
          });
        }

        // Step 3: Extract Active Email Addresses
        const activeEmails = emailList.getActiveEmails();
        console.log(`📧 Step 3: Extracted ${activeEmails.length} active emails from list`);

        if (activeEmails.length === 0) {
          console.log(`⚠️ No active emails found in list ${emailList.name}`);
          return res.status(400).json({
            success: false,
            message: 'Email list contains no active email addresses'
          });
        }

        recipientList = activeEmails.map(e => e.email);
        emailListUsed = emailList;
        console.log(`✅ Using email list: ${emailList.name} with ${recipientList.length} active recipients`);
      }

      // If no recipient list provided, try to get default list for user
      if (!recipientList || recipientList.length === 0) {
        console.log(`📧 No email list specified, searching for default list...`);

        const defaultList = await EmailList.findOne({
          isDefault: true,
          'permissions.allowedUsers.email': req.user.email
        });

        if (defaultList) {
          const activeEmails = defaultList.getActiveEmails();
          if (activeEmails.length > 0) {
            recipientList = activeEmails.map(e => e.email);
            emailListUsed = defaultList;
            console.log(`✅ Using default email list: ${defaultList.name} with ${recipientList.length} recipients`);
          }
        }
      }

      // Final fallback to test emails if no email list available
      if (!recipientList || recipientList.length === 0) {
        console.log(`⚠️ No email lists available, using fallback test emails`);
        recipientList = [
          req.user.email, // Send to the user's own email as test
          'test@example.com'
        ];
      }

    } catch (emailListError) {
      console.error('❌ Error retrieving email recipients:', emailListError);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve email recipients',
        error: emailListError.message
      });
    }

    // Validate final recipient list
    if (!recipientList || recipientList.length === 0) {
      console.log('❌ No valid recipients found');
      return res.status(400).json({
        success: false,
        message: 'No valid email recipients found'
      });
    }

    console.log(`📧 Final recipient list: ${recipientList.length} emails`);

    // Step 4: Send Campaign Emails
    console.log(`📧 Step 4: Preparing to send campaign to ${recipientList.length} recipients...`);

    // Update campaign with email list information
    if (emailListUsed) {
      campaign.emailListId = emailListUsed._id;
      campaign.emailListName = emailListUsed.name;
      console.log(`📧 Campaign linked to email list: ${emailListUsed.name}`);
    }

    // Prepare campaign data for email service
    const campaignData = {
      subject: campaign.subject,
      content: campaign.content.text,
      html: campaign.content.html,
      recipientList,
      scheduledTime,
      variables: {
        campaignName: campaign.name,
        companyName: req.user.companyName || 'MechXTech',
        fromName: req.user.name || 'MechXTech Team'
      }
    };

    console.log(`📨 Sending campaign to ${recipientList.length} recipients...`);

    // Send the campaign
    const result = await emailService.sendMarketingCampaign(campaignData);

    // Update campaign status
    campaign.status = result.status === 'scheduled' ? 'scheduled' : 'sent';
    campaign.sentAt = result.status !== 'scheduled' ? new Date() : null;
    if (result.status === 'scheduled' && scheduledTime) {
      campaign.schedule = new Date(scheduledTime);
    }
    
    // Update campaign metrics
    if (result.status !== 'scheduled') {
      campaign.metrics = {
        ...campaign.metrics,
        sent: result.sent || 0,
        failed: result.failed || 0,
        total: result.total || recipientList.length
      };
    }

    await campaign.save();

    console.log('✅ Campaign send completed:', {
      campaignId: campaign._id,
      status: campaign.status,
      sent: result.sent,
      failed: result.failed,
      emailList: emailListUsed?.name || 'Manual recipients'
    });

    // Step 5: Update Campaign Status and Metrics
    console.log('📧 Step 5: Campaign status updated and metrics recorded');

    res.json({
      success: true,
      message: result.status === 'scheduled'
        ? `Campaign scheduled for ${scheduledTime}`
        : `Campaign sent successfully to ${emailListUsed?.name || 'recipients'}. Sent: ${result.sent}, Failed: ${result.failed}`,
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          sentAt: campaign.sentAt,
          scheduledFor: campaign.schedule,
          emailList: emailListUsed ? {
            id: emailListUsed._id,
            name: emailListUsed.name,
            totalEmails: emailListUsed.emails.length,
            activeEmails: emailListUsed.getActiveEmails().length
          } : null
        },
        results: {
          total: result.total,
          sent: result.sent,
          failed: result.failed,
          status: result.status,
          recipientSource: emailListUsed ? 'email_list' : 'manual'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error sending campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send campaign',
      error: error.message
    });
  }
});

// @route   POST /api/marketing/campaigns/send-newsletter
// @desc    Send newsletter to subscriber list
// @access  Private
router.post('/campaigns/send-newsletter', [
  auth,
  body('subject').notEmpty().withMessage('Subject is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('recipientList').isArray().withMessage('Recipient list must be an array')
], async (req, res) => {
  try {
    console.log('📧 Newsletter send request received');

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { subject, content, html, recipientList } = req.body;

    // Import email service
    const emailService = require('../services/emailService');

    // Prepare newsletter data
    const newsletterData = {
      subject,
      content,
      html: html || content
    };

    console.log(`📨 Sending newsletter to ${recipientList.length} recipients...`);

    // Send the newsletter
    const result = await emailService.sendNewsletterEmail(newsletterData, recipientList);

    // Create a campaign record for tracking
    const campaign = new Campaign({
      userId: req.user.id,
      name: `Newsletter - ${subject}`,
      type: 'newsletter',
      subject,
      content: {
        html: html || content,
        text: content,
        aiGenerated: false
      },
      status: 'sent',
      sentAt: new Date(),
      metrics: {
        sent: result.sent || 0,
        failed: result.failed || 0,
        total: result.total || recipientList.length
      }
    });

    await campaign.save();

    console.log('✅ Newsletter send completed:', {
      sent: result.sent,
      failed: result.failed
    });

    res.json({
      success: true,
      message: `Newsletter sent successfully. Sent: ${result.sent}, Failed: ${result.failed}`,
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          sentAt: campaign.sentAt
        },
        results: {
          total: result.total,
          sent: result.sent,
          failed: result.failed
        }
      }
    });

  } catch (error) {
    console.error('❌ Error sending newsletter:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send newsletter',
      error: error.message
    });
  }
});

// @route   GET /api/marketing/campaigns/:id/send-status
// @desc    Get send status of a campaign
// @access  Private
router.get('/campaigns/:id/send-status', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: campaign._id,
        name: campaign.name,
        status: campaign.status,
        sentAt: campaign.sentAt,
        scheduledFor: campaign.schedule,
        metrics: campaign.metrics || {}
      }
    });

  } catch (error) {
    console.error('Error getting campaign send status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign status',
      error: error.message
    });
  }
});

module.exports = router;
