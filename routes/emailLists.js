const express = require('express');
const { body, validationResult } = require('express-validator');
const EmailList = require('../models/EmailList');
const { auth } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// @route   GET /api/email-lists
// @desc    Get all email lists for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const emailLists = await EmailList.getListsForUser(req.user.email);
    
    res.json({
      success: true,
      data: emailLists,
      message: `Found ${emailLists.length} email lists`
    });
  } catch (error) {
    console.error('Error fetching email lists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email lists',
      error: error.message
    });
  }
});

// @route   POST /api/email-lists
// @desc    Create a new email list
// @access  Private
router.post('/', [
  auth,
  body('name').notEmpty().withMessage('List name is required'),
  body('emails').optional().isArray().withMessage('Emails must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description, emails = [], websiteId } = req.body;

    // Create email list
    const emailList = new EmailList({
      userId: req.user._id,
      websiteId: websiteId || null,
      name,
      description,
      emails: emails.map(email => ({
        email: typeof email === 'string' ? email : email.email,
        name: typeof email === 'object' ? email.name : '',
        tags: typeof email === 'object' ? email.tags || [] : []
      })),
      permissions: {
        allowedUsers: [
          {
            userId: req.user._id,
            email: req.user.email,
            role: 'admin'
          }
        ]
      }
    });

    await emailList.save();

    res.status(201).json({
      success: true,
      data: emailList,
      message: 'Email list created successfully'
    });
  } catch (error) {
    console.error('Error creating email list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create email list',
      error: error.message
    });
  }
});

// @route   GET /api/email-lists/:id
// @desc    Get specific email list
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const emailList = await EmailList.findById(req.params.id);

    if (!emailList) {
      return res.status(404).json({
        success: false,
        message: 'Email list not found'
      });
    }

    // Check permissions
    if (!emailList.hasPermission(req.user.email)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: emailList,
      message: 'Email list retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching email list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email list',
      error: error.message
    });
  }
});

// @route   PUT /api/email-lists/:id
// @desc    Update email list
// @access  Private
router.put('/:id', [
  auth,
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('emails').optional().isArray().withMessage('Emails must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const emailList = await EmailList.findById(req.params.id);

    if (!emailList) {
      return res.status(404).json({
        success: false,
        message: 'Email list not found'
      });
    }

    // Check permissions
    if (!emailList.hasPermission(req.user.email, 'editor')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const { name, description, emails } = req.body;

    if (name) emailList.name = name;
    if (description !== undefined) emailList.description = description;
    
    if (emails) {
      emailList.emails = emails.map(email => ({
        email: typeof email === 'string' ? email : email.email,
        name: typeof email === 'object' ? email.name : '',
        tags: typeof email === 'object' ? email.tags || [] : [],
        status: typeof email === 'object' ? email.status || 'active' : 'active'
      }));
    }

    await emailList.save();

    res.json({
      success: true,
      data: emailList,
      message: 'Email list updated successfully'
    });
  } catch (error) {
    console.error('Error updating email list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update email list',
      error: error.message
    });
  }
});

// @route   POST /api/email-lists/:id/emails
// @desc    Add email to list
// @access  Private
router.post('/:id/emails', [
  auth,
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const emailList = await EmailList.findById(req.params.id);

    if (!emailList) {
      return res.status(404).json({
        success: false,
        message: 'Email list not found'
      });
    }

    // Check permissions
    if (!emailList.hasPermission(req.user.email, 'editor')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    const { email, name, tags } = req.body;

    await emailList.addEmail({ email, name, tags });

    res.json({
      success: true,
      data: emailList,
      message: 'Email added successfully'
    });
  } catch (error) {
    console.error('Error adding email:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'Email already exists in this list' ? error.message : 'Failed to add email',
      error: error.message
    });
  }
});

// @route   DELETE /api/email-lists/:id/emails/:email
// @desc    Remove email from list
// @access  Private
router.delete('/:id/emails/:email', auth, async (req, res) => {
  try {
    const emailList = await EmailList.findById(req.params.id);

    if (!emailList) {
      return res.status(404).json({
        success: false,
        message: 'Email list not found'
      });
    }

    // Check permissions
    if (!emailList.hasPermission(req.user.email, 'editor')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    await emailList.removeEmail(decodeURIComponent(req.params.email));

    res.json({
      success: true,
      data: emailList,
      message: 'Email removed successfully'
    });
  } catch (error) {
    console.error('Error removing email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove email',
      error: error.message
    });
  }
});

// @route   POST /api/email-lists/:id/send-campaign
// @desc    Send campaign to email list
// @access  Private
router.post('/:id/send-campaign', [
  auth,
  body('campaignId').notEmpty().withMessage('Campaign ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const emailList = await EmailList.findById(req.params.id);

    if (!emailList) {
      return res.status(404).json({
        success: false,
        message: 'Email list not found'
      });
    }

    // Check permissions
    if (!emailList.hasPermission(req.user.email)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { campaignId, customSubject, customContent } = req.body;

    // Get campaign details
    const Campaign = require('../models/Campaign');
    const campaign = await Campaign.findOne({
      _id: campaignId,
      userId: req.user._id
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get active emails from the list
    const recipients = emailList.getActiveEmails();

    if (recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active recipients in email list'
      });
    }

    // Prepare campaign data
    const campaignData = {
      subject: customSubject || campaign.subject,
      content: customContent || campaign.content.text,
      html: campaign.content.html,
      recipientList: recipients,
      variables: {
        campaignName: campaign.name,
        companyName: 'MechXTech',
        fromName: req.user.name || 'MechXTech Team'
      }
    };

    console.log(`📨 Sending campaign to ${recipients.length} recipients from list: ${emailList.name}`);

    // Send the campaign
    const result = await emailService.sendMarketingCampaign(campaignData);

    // Update campaign status
    campaign.status = 'sent';
    campaign.sentAt = new Date();
    campaign.metrics = {
      ...campaign.metrics,
      sent: result.sent || 0,
      failed: result.failed || 0,
      total: result.total || recipients.length
    };
    await campaign.save();

    // Update last sent timestamps for emails
    const sentEmails = result.results
      .filter(r => r.success)
      .map(r => r.recipient);
    
    emailList.emails.forEach(email => {
      if (sentEmails.includes(email.email)) {
        email.lastSentAt = new Date();
      }
    });
    await emailList.save();

    res.json({
      success: true,
      message: `Campaign sent successfully. Sent: ${result.sent}, Failed: ${result.failed}`,
      data: {
        campaign: {
          id: campaign._id,
          name: campaign.name,
          status: campaign.status,
          sentAt: campaign.sentAt
        },
        emailList: {
          id: emailList._id,
          name: emailList.name,
          recipientCount: recipients.length
        },
        results: {
          total: result.total,
          sent: result.sent,
          failed: result.failed
        }
      }
    });

  } catch (error) {
    console.error('❌ Error sending campaign to email list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send campaign',
      error: error.message
    });
  }
});

// @route   DELETE /api/email-lists/:id
// @desc    Delete email list
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const emailList = await EmailList.findById(req.params.id);

    if (!emailList) {
      return res.status(404).json({
        success: false,
        message: 'Email list not found'
      });
    }

    // Check permissions (only admin can delete)
    if (!emailList.hasPermission(req.user.email, 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    await EmailList.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Email list deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting email list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete email list',
      error: error.message
    });
  }
});

module.exports = router;
