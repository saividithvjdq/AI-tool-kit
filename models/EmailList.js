const mongoose = require('mongoose');

const emailListSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  websiteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Website',
    required: false // Optional - can be website-specific or user-specific
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  emails: [{
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(email) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Invalid email format'
      }
    },
    name: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'unsubscribed', 'bounced'],
      default: 'active'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    lastSentAt: Date,
    tags: [String]
  }],
  totalEmails: {
    type: Number,
    default: 0
  },
  activeEmails: {
    type: Number,
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  permissions: {
    allowedUsers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      email: String,
      role: {
        type: String,
        enum: ['admin', 'editor', 'viewer'],
        default: 'viewer'
      }
    }]
  }
}, {
  timestamps: true
});

// Indexes
emailListSchema.index({ userId: 1, websiteId: 1 });
emailListSchema.index({ 'emails.email': 1 });
emailListSchema.index({ 'permissions.allowedUsers.email': 1 });

// Virtual for active emails count
emailListSchema.virtual('activeEmailsCount').get(function() {
  return this.emails.filter(email => email.status === 'active').length;
});

// Methods
emailListSchema.methods.addEmail = function(emailData) {
  const existingEmail = this.emails.find(e => e.email === emailData.email);
  if (existingEmail) {
    throw new Error('Email already exists in this list');
  }
  
  this.emails.push({
    email: emailData.email,
    name: emailData.name || '',
    tags: emailData.tags || []
  });
  
  this.updateCounts();
  return this.save();
};

emailListSchema.methods.removeEmail = function(email) {
  this.emails = this.emails.filter(e => e.email !== email);
  this.updateCounts();
  return this.save();
};

emailListSchema.methods.updateEmailStatus = function(email, status) {
  const emailEntry = this.emails.find(e => e.email === email);
  if (emailEntry) {
    emailEntry.status = status;
    this.updateCounts();
    return this.save();
  }
  throw new Error('Email not found');
};

emailListSchema.methods.updateCounts = function() {
  this.totalEmails = this.emails.length;
  this.activeEmails = this.emails.filter(e => e.status === 'active').length;
};

emailListSchema.methods.getActiveEmails = function() {
  return this.emails
    .filter(email => email.status === 'active')
    .map(email => ({
      email: email.email,
      name: email.name || email.email
    }));
};

emailListSchema.methods.hasPermission = function(userEmail, requiredRole = 'viewer') {
  const roleHierarchy = { viewer: 0, editor: 1, admin: 2 };
  
  const permission = this.permissions.allowedUsers.find(p => p.email === userEmail);
  if (!permission) return false;
  
  return roleHierarchy[permission.role] >= roleHierarchy[requiredRole];
};

// Static methods
emailListSchema.statics.getListsForUser = function(userEmail) {
  return this.find({
    $or: [
      { 'permissions.allowedUsers.email': userEmail },
      { userId: userEmail } // If userId matches email (for admin access)
    ]
  });
};

// Pre-save middleware to update counts
emailListSchema.pre('save', function(next) {
  this.updateCounts();
  next();
});

module.exports = mongoose.model('EmailList', emailListSchema);
