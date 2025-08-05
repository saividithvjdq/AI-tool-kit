const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user notifications with pagination and filtering
// @access  Private
router.get('/', auth, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().isIn(['website', 'marketing', 'analytics', 'images', 'system', 'onboarding', 'general']),
  query('type').optional().isIn(['success', 'error', 'warning', 'info', 'website_generated', 'image_generated', 'marketing_campaign', 'analytics_update', 'onboarding_complete', 'system_update']),
  query('unreadOnly').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      category,
      type,
      unreadOnly = false
    } = req.query;

    // Build query
    const query = { userId: req.user.id };
    if (category) query.category = category;
    if (type) query.type = type;
    if (unreadOnly === 'true') query.isRead = false;

    // Execute query with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    // Format notifications for client
    const formattedNotifications = notifications.map(notification => {
      const notificationDoc = new Notification(notification);
      return notificationDoc.toClientFormat();
    });

    res.json({
      message: 'Notifications retrieved successfully',
      notifications: formattedNotifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get count of unread notifications
// @access  Private
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.getUnreadCount(req.user.id);
    res.json({
      message: 'Unread count retrieved successfully',
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

// @route   POST /api/notifications
// @desc    Create a new notification (admin/system use)
// @access  Private
router.post('/', auth, [
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('message').notEmpty().withMessage('Message is required').isLength({ max: 1000 }),
  body('type').optional().isIn(['success', 'error', 'warning', 'info', 'website_generated', 'image_generated', 'marketing_campaign', 'analytics_update', 'onboarding_complete', 'system_update']),
  body('category').optional().isIn(['website', 'marketing', 'analytics', 'images', 'system', 'onboarding', 'general']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('actionUrl').optional().isURL(),
  body('actionText').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const notification = await Notification.createNotification(req.user.id, req.body);

    res.status(201).json({
      message: 'Notification created successfully',
      notification: notification.toClientFormat()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Failed to create notification' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.markAsRead();

    res.json({
      message: 'Notification marked as read',
      notification: notification.toClientFormat()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    const result = await Notification.markAllAsRead(req.user.id);

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

// @route   DELETE /api/notifications/clear-read
// @desc    Delete all read notifications
// @access  Private
router.delete('/clear-read', auth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({
      userId: req.user.id,
      isRead: true
    });

    res.json({
      message: 'Read notifications cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing read notifications:', error);
    res.status(500).json({ message: 'Failed to clear read notifications' });
  }
});

module.exports = router;
