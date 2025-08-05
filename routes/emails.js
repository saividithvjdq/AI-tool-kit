const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const WebsiteAnalytics = require('../models/WebsiteAnalytics');
const { auth } = require('../middleware/auth');

// Send single email
router.post('/send', auth, async (req, res) => {
  try {
    const { to, subject, template, variables, attachments, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email and subject are required'
      });
    }

    const result = await emailService.sendSingleEmail({
      to,
      subject,
      template,
      variables: {
        ...variables,
        companyName: req.user.companyName || 'AI Business Platform'
      },
      attachments,
      text
    });

    res.json({
      success: true,
      data: result,
      message: result.success ? 'Email sent successfully' : 'Failed to send email'
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send bulk emails
router.post('/bulk', auth, async (req, res) => {
  try {
    const { emailList, subject, template, variables, attachments } = req.body;

    if (!emailList || !Array.isArray(emailList) || emailList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Email list is required and must be a non-empty array'
      });
    }

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required'
      });
    }

    const options = {
      subject,
      template,
      variables: {
        ...variables,
        companyName: req.user.companyName || 'AI Business Platform'
      },
      attachments
    };

    const result = await emailService.sendBulkEmails(emailList, options);

    res.json({
      success: true,
      data: result,
      message: `Bulk email completed. Sent: ${result.sent}, Failed: ${result.failed}`
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send newsletter
router.post('/newsletter', auth, async (req, res) => {
  try {
    const { newsletterData, recipientList } = req.body;

    if (!newsletterData || !recipientList) {
      return res.status(400).json({
        success: false,
        message: 'Newsletter data and recipient list are required'
      });
    }

    const result = await emailService.sendNewsletterEmail(newsletterData, recipientList);

    res.json({
      success: true,
      data: result,
      message: `Newsletter sent. Recipients: ${result.sent}, Failed: ${result.failed}`
    });
  } catch (error) {
    console.error('Newsletter email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send marketing campaign
router.post('/campaign', auth, async (req, res) => {
  try {
    const { campaignData } = req.body;

    if (!campaignData) {
      return res.status(400).json({
        success: false,
        message: 'Campaign data is required'
      });
    }

    const result = await emailService.sendMarketingCampaign(campaignData);

    res.json({
      success: true,
      data: result,
      message: result.status === 'scheduled' 
        ? `Campaign scheduled for ${result.scheduledTime}`
        : `Campaign sent. Recipients: ${result.sent}, Failed: ${result.failed}`
    });
  } catch (error) {
    console.error('Marketing campaign error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Verify email service connection
router.get('/verify', auth, async (req, res) => {
  try {
    const isConnected = await emailService.verifyConnection();
    
    res.json({
      success: true,
      data: {
        connected: isConnected,
        service: emailService.configuration.SERVICE,
        email: emailService.configuration.EMAIL
      },
      message: isConnected ? 'Email service is connected' : 'Email service connection failed'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send website analytics alert manually
router.post('/analytics-alert', auth, async (req, res) => {
  try {
    const { websiteId, alertType, alertData } = req.body;

    if (!websiteId || !alertType) {
      return res.status(400).json({
        success: false,
        message: 'Website ID and alert type are required'
      });
    }

    const analytics = await WebsiteAnalytics.findOne({ 
      websiteId, 
      userId: req.user._id 
    }).populate('websiteId');

    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Website analytics not found'
      });
    }

    const result = await emailService.sendWebsiteNotification(websiteId, alertType, {
      ...alertData,
      ownerEmail: req.user.email,
      websiteName: analytics.websiteId.name,
      websiteUrl: analytics.websiteId.url
    });

    res.json({
      success: true,
      data: result,
      message: 'Analytics alert sent successfully'
    });
  } catch (error) {
    console.error('Analytics alert error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get email templates
router.get('/templates', auth, async (req, res) => {
  try {
    const templates = [
      { name: 'newsletter', description: 'Newsletter template with stats and content sections' },
      { name: 'campaign', description: 'Marketing campaign template' },
      { name: 'traffic_alert', description: 'Traffic spike/drop alert template' },
      { name: 'conversion_alert', description: 'Conversion rate alert template' },
      { name: 'seo_alert', description: 'SEO improvement/issue alert template' }
    ];

    res.json({
      success: true,
      data: templates,
      message: 'Email templates retrieved successfully'
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test email (for development)
router.post('/test', auth, async (req, res) => {
  try {
    const { to } = req.body;
    const testEmail = to || req.user.email;

    const result = await emailService.sendSingleEmail({
      to: testEmail,
      subject: '🧪 Test Email from AI Business Platform',
      template: 'newsletter',
      variables: {
        name: req.user.name || 'Test User',
        title: 'Test Email',
        content: 'This is a test email to verify that the email service is working correctly.',
        companyName: 'AI Business Platform',
        stats: [
          { label: 'Test Status', value: '✅ Working' },
          { label: 'Service', value: 'Email Service' },
          { label: 'Date', value: new Date().toLocaleDateString() }
        ]
      }
    });

    res.json({
      success: true,
      data: result,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
