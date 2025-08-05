const express = require('express');
const { body, validationResult } = require('express-validator');
const Lead = require('../models/Lead');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/leads
// @desc    Create a new lead
// @access  Private
router.post('/', [
  auth,
  body('email').isEmail().withMessage('Valid email is required'),
  body('firstName').optional().trim(),
  body('lastName').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const leadData = {
      ...req.body,
      userId: req.user.id
    };

    // Check if lead already exists
    const existingLead = await Lead.findOne({
      userId: req.user.id,
      email: leadData.email
    });

    if (existingLead) {
      return res.status(400).json({ message: 'Lead with this email already exists' });
    }

    const lead = new Lead(leadData);
    await lead.save();

    // Add initial activity
    lead.addActivity('manual_add', 'Lead manually added to system');
    await lead.save();

    res.status(201).json({
      message: 'Lead created successfully',
      lead
    });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ message: 'Failed to create lead' });
  }
});

// @route   GET /api/leads
// @desc    Get all leads for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      status, 
      stage, 
      source, 
      tags, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const filter = { userId: req.user.id };
    
    // Apply filters
    if (status) filter.status = status;
    if (stage) filter['lifecycle.stage'] = stage;
    if (source) filter.source = source;
    if (tags) filter.tags = { $in: tags.split(',') };
    
    // Search functionality
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const leads = await Lead.find(filter)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Lead.countDocuments(filter);

    // Calculate summary statistics
    const stats = await Lead.aggregate([
      { $match: { userId: req.user.id } },
      {
        $group: {
          _id: null,
          totalLeads: { $sum: 1 },
          newLeads: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          qualifiedLeads: { $sum: { $cond: [{ $eq: ['$status', 'qualified'] }, 1, 0] } },
          avgEngagementScore: { $avg: '$engagement.engagementScore' }
        }
      }
    ]);

    res.json({
      leads,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      stats: stats[0] || {
        totalLeads: 0,
        newLeads: 0,
        qualifiedLeads: 0,
        avgEngagementScore: 0
      }
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
});

// @route   GET /api/leads/:id
// @desc    Get lead by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ lead });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ message: 'Failed to fetch lead' });
  }
});

// @route   PUT /api/leads/:id
// @desc    Update lead
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const oldStatus = lead.status;
    const oldStage = lead.lifecycle.stage;

    // Update allowed fields
    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'company', 'jobTitle', 
      'status', 'tags', 'customFields', 'location', 'demographics',
      'preferences', 'value'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        lead[field] = req.body[field];
      }
    });

    // Update lifecycle stage if status changed
    if (req.body['lifecycle.stage']) {
      lead.lifecycle.stage = req.body['lifecycle.stage'];
    }

    lead.lifecycle.lastContact = new Date();
    await lead.save();

    // Add activity if status or stage changed
    if (oldStatus !== lead.status) {
      lead.addActivity('status_change', `Status changed from ${oldStatus} to ${lead.status}`);
    }
    if (oldStage !== lead.lifecycle.stage) {
      lead.addActivity('stage_change', `Lifecycle stage changed from ${oldStage} to ${lead.lifecycle.stage}`);
    }

    await lead.save();

    res.json({
      message: 'Lead updated successfully',
      lead
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ message: 'Failed to update lead' });
  }
});

// @route   DELETE /api/leads/:id
// @desc    Delete lead
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    await Lead.findByIdAndDelete(req.params.id);

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ message: 'Failed to delete lead' });
  }
});

// @route   POST /api/leads/:id/activities
// @desc    Add activity to lead
// @access  Private
router.post('/:id/activities', [
  auth,
  body('type').notEmpty().withMessage('Activity type is required'),
  body('description').notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const lead = await Lead.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const { type, description, metadata = {} } = req.body;
    lead.addActivity(type, description, metadata);
    await lead.save();

    res.json({
      message: 'Activity added successfully',
      lead
    });
  } catch (error) {
    console.error('Error adding activity:', error);
    res.status(500).json({ message: 'Failed to add activity' });
  }
});

// @route   POST /api/leads/:id/notes
// @desc    Add note to lead
// @access  Private
router.post('/:id/notes', [
  auth,
  body('content').notEmpty().withMessage('Note content is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const lead = await Lead.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    lead.notes.push({
      content: req.body.content,
      createdBy: req.user.id
    });

    lead.addActivity('note_added', 'Note added to lead');
    await lead.save();

    res.json({
      message: 'Note added successfully',
      lead
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ message: 'Failed to add note' });
  }
});

// @route   POST /api/leads/import
// @desc    Import leads from CSV
// @access  Private
router.post('/import', auth, async (req, res) => {
  try {
    const { leads } = req.body;
    
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: 'No leads provided for import' });
    }

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const leadData of leads) {
      try {
        // Check if lead already exists
        const existingLead = await Lead.findOne({
          userId: req.user.id,
          email: leadData.email
        });

        if (existingLead) {
          results.skipped++;
          continue;
        }

        const lead = new Lead({
          ...leadData,
          userId: req.user.id,
          source: 'import'
        });

        await lead.save();
        lead.addActivity('import', 'Lead imported from CSV');
        await lead.save();

        results.imported++;
      } catch (error) {
        results.errors.push({
          email: leadData.email,
          error: error.message
        });
      }
    }

    res.json({
      message: `Import completed: ${results.imported} imported, ${results.skipped} skipped`,
      results
    });
  } catch (error) {
    console.error('Error importing leads:', error);
    res.status(500).json({ message: 'Failed to import leads' });
  }
});

module.exports = router;
