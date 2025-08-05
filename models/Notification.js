const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: [
      'success',
      'error', 
      'warning',
      'info',
      'website_generated',
      'image_generated',
      'marketing_campaign',
      'analytics_update',
      'onboarding_complete',
      'system_update'
    ],
    default: 'info'
  },
  category: {
    type: String,
    enum: [
      'website',
      'marketing',
      'analytics',
      'images',
      'system',
      'onboarding',
      'general'
    ],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  actionUrl: {
    type: String,
    trim: true
  },
  actionText: {
    type: String,
    trim: true
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },
  metadata: {
    source: {
      type: String,
      enum: ['system', 'agent', 'user', 'api'],
      default: 'system'
    },
    agentId: String,
    websiteId: String,
    campaignId: String,
    imageId: String
  }
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// Static methods
notificationSchema.statics.createNotification = async function(userId, data) {
  const notification = new this({
    userId,
    ...data
  });
  
  return await notification.save();
};

notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ userId, isRead: false });
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { userId, isRead: false },
    { isRead: true, updatedAt: new Date() }
  );
};

notificationSchema.statics.deleteOldNotifications = async function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
};

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.updatedAt = new Date();
  return this.save();
};

notificationSchema.methods.toClientFormat = function() {
  return {
    id: this._id,
    title: this.title,
    message: this.message,
    type: this.type,
    category: this.category,
    priority: this.priority,
    isRead: this.isRead,
    data: this.data,
    actionUrl: this.actionUrl,
    actionText: this.actionText,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    timeAgo: this.getTimeAgo()
  };
};

notificationSchema.methods.getTimeAgo = function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return this.createdAt.toLocaleDateString();
};

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Set default expiration to 90 days for read notifications
    if (this.isRead) {
      this.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }
  }
  next();
});

// Post-save middleware to set expiration when marked as read
notificationSchema.post('save', function(doc) {
  if (doc.isRead && !doc.expiresAt) {
    doc.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    doc.save();
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
