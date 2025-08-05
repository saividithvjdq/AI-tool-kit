const Notification = require('../models/Notification');

class NotificationService {
  // Create a notification for a user
  static async createNotification(userId, data) {
    try {
      return await Notification.createNotification(userId, data);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Create multiple notifications for multiple users
  static async createBulkNotifications(userIds, data) {
    try {
      const notifications = userIds.map(userId => ({
        userId,
        ...data
      }));
      
      return await Notification.insertMany(notifications);
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Website generation notifications
  static async notifyWebsiteGenerated(userId, websiteData) {
    return await this.createNotification(userId, {
      title: 'Website Generated Successfully',
      message: `Your new ${websiteData.businessInfo?.name || 'business'} website is ready to publish!`,
      type: 'website_generated',
      category: 'website',
      priority: 'high',
      actionUrl: `/app/websites`,
      actionText: 'View Website',
      data: {
        websiteId: websiteData.websiteId,
        businessName: websiteData.businessInfo?.name
      },
      metadata: {
        source: 'agent',
        agentId: 'website-generator',
        websiteId: websiteData.websiteId
      }
    });
  }

  static async notifyWebsiteGenerationFailed(userId, error) {
    return await this.createNotification(userId, {
      title: 'Website Generation Failed',
      message: `There was an issue generating your website: ${error.message || 'Unknown error'}`,
      type: 'error',
      category: 'website',
      priority: 'high',
      actionUrl: `/app/websites`,
      actionText: 'Try Again',
      metadata: {
        source: 'agent',
        agentId: 'website-generator'
      }
    });
  }

  // Image generation notifications
  static async notifyImagesGenerated(userId, imageData) {
    const count = imageData.images?.length || 1;
    return await this.createNotification(userId, {
      title: 'Images Generated Successfully',
      message: `${count} AI-generated image${count > 1 ? 's' : ''} ${count > 1 ? 'are' : 'is'} ready for use!`,
      type: 'image_generated',
      category: 'images',
      priority: 'medium',
      actionUrl: `/app/images`,
      actionText: 'View Images',
      data: {
        imageCount: count,
        images: imageData.images
      },
      metadata: {
        source: 'agent',
        agentId: 'image-generator'
      }
    });
  }

  static async notifyImageGenerationFailed(userId, error) {
    return await this.createNotification(userId, {
      title: 'Image Generation Failed',
      message: `Failed to generate images: ${error.message || 'Unknown error'}`,
      type: 'error',
      category: 'images',
      priority: 'medium',
      actionUrl: `/app/images`,
      actionText: 'Try Again',
      metadata: {
        source: 'agent',
        agentId: 'image-generator'
      }
    });
  }

  // Marketing notifications
  static async notifyMarketingCampaignSent(userId, campaignData) {
    return await this.createNotification(userId, {
      title: 'Marketing Campaign Sent',
      message: `Your "${campaignData.subject}" campaign was sent to ${campaignData.recipientCount || 0} recipients`,
      type: 'marketing_campaign',
      category: 'marketing',
      priority: 'medium',
      actionUrl: `/app/marketing`,
      actionText: 'View Campaign',
      data: {
        campaignId: campaignData.campaignId,
        subject: campaignData.subject,
        recipientCount: campaignData.recipientCount
      },
      metadata: {
        source: 'agent',
        agentId: 'marketing-agent',
        campaignId: campaignData.campaignId
      }
    });
  }

  static async notifyMarketingOptimized(userId, optimizationData) {
    return await this.createNotification(userId, {
      title: 'Marketing Optimization Complete',
      message: `Your website's SEO and marketing strategy has been optimized with ${optimizationData.improvementCount || 0} improvements`,
      type: 'marketing_campaign',
      category: 'marketing',
      priority: 'medium',
      actionUrl: `/app/marketing`,
      actionText: 'View Results',
      data: optimizationData,
      metadata: {
        source: 'agent',
        agentId: 'marketing-agent',
        websiteId: optimizationData.websiteId
      }
    });
  }

  // Analytics notifications
  static async notifyAnalyticsSetup(userId, analyticsData) {
    return await this.createNotification(userId, {
      title: 'Analytics Setup Complete',
      message: 'Your website analytics tracking has been configured and is now collecting data',
      type: 'analytics_update',
      category: 'analytics',
      priority: 'medium',
      actionUrl: `/app/analytics`,
      actionText: 'View Analytics',
      data: analyticsData,
      metadata: {
        source: 'agent',
        agentId: 'analytics-agent',
        websiteId: analyticsData.websiteId
      }
    });
  }

  // Onboarding notifications
  static async notifyOnboardingComplete(userId, businessProfile) {
    return await this.createNotification(userId, {
      title: 'Welcome to AI Business Toolkit!',
      message: `Your business profile for "${businessProfile.businessName}" has been completed. You can now access all AI tools!`,
      type: 'onboarding_complete',
      category: 'onboarding',
      priority: 'high',
      actionUrl: `/app`,
      actionText: 'Get Started',
      data: {
        businessName: businessProfile.businessName,
        industry: businessProfile.industry
      },
      metadata: {
        source: 'system'
      }
    });
  }

  // Multi-agent workflow notifications
  static async notifyWorkflowStarted(userId, workflowData) {
    return await this.createNotification(userId, {
      title: 'Multi-Agent Workflow Started',
      message: `AI agents are now working on your ${workflowData.businessInfo?.name || 'business'} website. This may take a few minutes.`,
      type: 'info',
      category: 'website',
      priority: 'medium',
      actionUrl: `/app/workflow`,
      actionText: 'Monitor Progress',
      data: workflowData,
      metadata: {
        source: 'system',
        websiteId: workflowData.websiteId
      }
    });
  }

  static async notifyWorkflowComplete(userId, workflowData) {
    return await this.createNotification(userId, {
      title: 'Multi-Agent Workflow Complete',
      message: `Your complete business solution is ready! Website, images, marketing, and analytics have all been set up.`,
      type: 'success',
      category: 'website',
      priority: 'high',
      actionUrl: `/app/websites`,
      actionText: 'View Results',
      data: workflowData,
      metadata: {
        source: 'system',
        websiteId: workflowData.websiteId
      }
    });
  }

  static async notifyWorkflowFailed(userId, error, workflowData) {
    return await this.createNotification(userId, {
      title: 'Multi-Agent Workflow Failed',
      message: `There was an issue with your workflow: ${error.message || 'Unknown error'}. Please try again.`,
      type: 'error',
      category: 'website',
      priority: 'high',
      actionUrl: `/app/workflow`,
      actionText: 'Try Again',
      data: { error: error.message, ...workflowData },
      metadata: {
        source: 'system'
      }
    });
  }

  // System notifications
  static async notifySystemUpdate(userIds, updateData) {
    return await this.createBulkNotifications(userIds, {
      title: 'System Update',
      message: updateData.message || 'The AI Business Toolkit has been updated with new features and improvements.',
      type: 'system_update',
      category: 'system',
      priority: 'low',
      data: updateData,
      metadata: {
        source: 'system'
      }
    });
  }

  // Error notifications
  static async notifyError(userId, error, context = {}) {
    return await this.createNotification(userId, {
      title: 'System Error',
      message: `An error occurred: ${error.message || 'Unknown error'}`,
      type: 'error',
      category: context.category || 'system',
      priority: 'high',
      data: {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        context
      },
      metadata: {
        source: 'system'
      }
    });
  }

  // Utility methods
  static async getUnreadCount(userId) {
    return await Notification.getUnreadCount(userId);
  }

  static async markAllAsRead(userId) {
    return await Notification.markAllAsRead(userId);
  }

  static async cleanupOldNotifications(daysOld = 30) {
    return await Notification.deleteOldNotifications(daysOld);
  }
}

module.exports = NotificationService;
