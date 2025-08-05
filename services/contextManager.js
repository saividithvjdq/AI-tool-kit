const WebsiteContext = require('../models/WebsiteContext');
const NotificationService = require('./notificationService');
const EventEmitter = require('events');

class ContextManager extends EventEmitter {
  constructor() {
    super();
    this.lockTimeout = 5 * 60 * 1000; // 5 minutes
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  // Create new website context
  async createContext(websiteId, userId, originalPrompt, businessContext) {
    try {
      const context = new WebsiteContext({
        websiteId,
        userId,
        originalPrompt,
        businessContext,
        workflow: {
          currentStage: 'website-generation',
          completedStages: [],
          nextActions: [{
            agentId: 'website-generator',
            action: 'generate',
            priority: 1,
            scheduledFor: new Date()
          }]
        }
      });

      await context.save();

      // Emit event for website generator
      const eventData = {
        contextId: context._id,
        websiteId,
        userId,
        targetAgent: 'website-generator'
      };

      console.log('[ContextManager] Emitting context-created event:', eventData);
      this.emit('context-created', eventData);

      return context;
    } catch (error) {
      console.error('Error creating context:', error);
      throw error;
    }
  }

  // Get context with retry mechanism
  async getContext(websiteId, retryCount = 0) {
    try {
      const context = await WebsiteContext.findOne({ websiteId }).lean();
      if (!context) {
        throw new Error(`Context not found for website: ${websiteId}`);
      }
      return context;
    } catch (error) {
      if (retryCount < this.retryAttempts) {
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.getContext(websiteId, retryCount + 1);
      }
      throw error;
    }
  }

  // Update context with conflict resolution
  async updateContext(websiteId, agentId, updateData, retryCount = 0) {
    try {
      const context = await WebsiteContext.findOne({ websiteId });
      if (!context) {
        throw new Error(`Context not found for website: ${websiteId}`);
      }

      // Check if context is locked by another agent
      if (context.isLocked && context.lockedBy?.agentId !== agentId) {
        const lockAge = Date.now() - new Date(context.lockedBy.timestamp).getTime();
        if (lockAge < this.lockTimeout) {
          throw new Error(`Context is locked by ${context.lockedBy.agentId}`);
        } else {
          // Lock has expired, force unlock
          await context.unlockContext();
        }
      }

      // Lock context for this agent
      await context.lockContext(agentId, 'Updating context');

      // Apply updates
      Object.keys(updateData).forEach(key => {
        if (key.includes('.')) {
          // Handle nested updates
          const keys = key.split('.');
          let target = context;
          for (let i = 0; i < keys.length - 1; i++) {
            if (!target[keys[i]]) target[keys[i]] = {};
            target = target[keys[i]];
          }
          target[keys[keys.length - 1]] = updateData[key];
        } else {
          context[key] = updateData[key];
        }
      });

      // Update workflow if needed
      await this.updateWorkflow(context, agentId);

      // Save and unlock
      await context.save();
      await context.unlockContext();

      // Emit update event
      this.emit('context-updated', {
        contextId: context._id,
        websiteId,
        agentId,
        updateData
      });

      return context;
    } catch (error) {
      if (error.message.includes('locked') && retryCount < this.retryAttempts) {
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.updateContext(websiteId, agentId, updateData, retryCount + 1);
      }
      throw error;
    }
  }

  // Update workflow based on agent completion
  async updateWorkflow(context, completedAgentId) {
    const workflowStages = {
      'website-generator': 'image-generation',
      'image-generator': 'marketing-optimization',
      'marketing-agent': 'analytics-setup',
      'analytics-agent': 'completed'
    };

    const currentStage = context.workflow.currentStage;
    const expectedAgent = this.getStageAgent(currentStage);

    if (expectedAgent === completedAgentId) {
      // Move to next stage
      const nextStage = workflowStages[completedAgentId];
      if (nextStage) {
        context.workflow.completedStages.push(currentStage);
        context.workflow.currentStage = nextStage;

        // Clear any previous errors for this stage
        context.workflow.errors = context.workflow.errors || [];
        context.workflow.errors = context.workflow.errors.filter(
          error => error.stage !== currentStage
        );

        // Schedule next agent
        if (nextStage !== 'completed') {
          const nextAgent = this.getStageAgent(nextStage);
          context.workflow.nextActions.push({
            agentId: nextAgent,
            action: 'process',
            priority: 1,
            scheduledFor: new Date(),
            retryCount: 0,
            maxRetries: 3
          });

          // Skip notification system for now - direct trigger
          console.log(`[ContextManager] Triggering ${nextAgent} for ${nextStage}`);
          setTimeout(() => {
            this.triggerNextAgent(context.websiteId, nextAgent);
          }, 1000);

          // Auto-trigger next agent after a short delay
          setTimeout(() => {
            this.triggerNextAgent(context.websiteId, nextAgent);
          }, 2000);
        } else {
          // Workflow completed
          context.workflow.completedAt = new Date();
          try {
            await NotificationService.notifyWorkflowComplete(context.userId, {
              websiteId: context.websiteId,
              businessInfo: context.businessContext
            });
          } catch (notificationError) {
            console.error('Failed to send workflow completion notification:', notificationError);
          }
        }
      }
    }
  }

  // Handle workflow errors and retries
  async handleWorkflowError(websiteId, agentId, error, stage) {
    try {
      const context = await this.getContext(websiteId);
      if (!context) return;

      // Initialize errors array if not exists
      context.workflow.errors = context.workflow.errors || [];

      // Find existing error for this stage
      let existingError = context.workflow.errors.find(e => e.stage === stage && e.agentId === agentId);

      if (existingError) {
        existingError.retryCount += 1;
        existingError.lastError = error.message;
        existingError.lastAttempt = new Date();
      } else {
        existingError = {
          stage,
          agentId,
          error: error.message,
          retryCount: 1,
          maxRetries: 3,
          firstOccurred: new Date(),
          lastAttempt: new Date(),
          lastError: error.message
        };
        context.workflow.errors.push(existingError);
      }

      // Check if we should retry
      if (existingError.retryCount < existingError.maxRetries) {
        console.log(`[ContextManager] Retrying ${agentId} for ${stage} (attempt ${existingError.retryCount + 1}/${existingError.maxRetries})`);

        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, existingError.retryCount) * 5000; // 5s, 10s, 20s
        setTimeout(() => {
          this.triggerNextAgent(websiteId, agentId);
        }, retryDelay);
      } else {
        console.error(`[ContextManager] Max retries exceeded for ${agentId} in ${stage}`);

        // Mark workflow as failed
        context.workflow.status = 'failed';
        context.workflow.failedAt = new Date();
        context.workflow.failureReason = `Agent ${agentId} failed in stage ${stage} after ${existingError.maxRetries} attempts`;

        // Notify user of workflow failure
        try {
          await NotificationService.notifyWorkflowFailed(context.userId, {
            websiteId,
            failedStage: stage,
            error: error.message
          });
        } catch (notificationError) {
          console.error('Failed to send workflow failure notification:', notificationError);
        }
      }

      await context.save();
    } catch (contextError) {
      console.error('[ContextManager] Error handling workflow error:', contextError);
    }
  }

  // Trigger next agent in workflow
  async triggerNextAgent(websiteId, agentId) {
    try {
      // This would trigger the specific agent
      // For now, we'll emit an event that agents can listen to
      this.emit('agent-trigger', {
        websiteId,
        agentId,
        timestamp: new Date()
      });

      console.log(`[ContextManager] Triggered agent ${agentId} for website ${websiteId}`);
    } catch (error) {
      console.error(`[ContextManager] Error triggering agent ${agentId}:`, error);
    }
  }

  // Get agent responsible for a stage
  getStageAgent(stage) {
    const stageAgentMap = {
      'website-generation': 'website-generator',
      'image-generation': 'image-generator',
      'marketing-optimization': 'marketing-agent',
      'analytics-setup': 'analytics-agent'
    };
    return stageAgentMap[stage];
  }

  // Complete a stage and trigger next stage
  async completeStage(websiteId, completedAgentId) {
    try {
      const context = await this.getContext(websiteId);
      if (!context) {
        throw new Error('Context not found');
      }

      // Update workflow
      await this.updateWorkflow(context, completedAgentId);

      // Save context
      await context.save();

      // Emit event for other agents
      this.emit('stage-completed', {
        websiteId,
        completedStage: context.workflow.currentStage,
        completedAgent: completedAgentId,
        nextStage: context.workflow.currentStage
      });

      console.log(`[ContextManager] Stage completed by ${completedAgentId}, next stage: ${context.workflow.currentStage}`);

      return { success: true, nextStage: context.workflow.currentStage };
    } catch (error) {
      console.error(`[ContextManager] Error completing stage:`, error);
      throw error;
    }
  }

  // Get pending notifications for an agent
  async getNotifications(agentId, websiteId = null) {
    try {
      const query = websiteId 
        ? { websiteId, 'pendingNotifications.targetAgent': agentId, 'pendingNotifications.processed': false }
        : { 'pendingNotifications.targetAgent': agentId, 'pendingNotifications.processed': false };

      const contexts = await WebsiteContext.find(query);
      
      const notifications = [];
      contexts.forEach(context => {
        const agentNotifications = context.getUnprocessedNotifications(agentId);
        notifications.push(...agentNotifications.map(notif => ({
          ...notif.toObject(),
          contextId: context._id,
          websiteId: context.websiteId
        })));
      });

      return notifications;
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  // Mark notifications as processed
  async markNotificationsProcessed(websiteId, agentId) {
    try {
      const context = await WebsiteContext.findOne({ websiteId });
      if (context) {
        await context.markNotificationsProcessed(agentId);
      }
    } catch (error) {
      console.error('Error marking notifications processed:', error);
      throw error;
    }
  }

  // Add activity log entry
  async logActivity(websiteId, agentId, action, status = 'completed', data = null, error = null) {
    try {
      const context = await WebsiteContext.findOne({ websiteId });
      if (context) {
        await context.addActivity(agentId, action, status, data, error);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  // Get context status for monitoring
  async getContextStatus(websiteId) {
    try {
      const context = await WebsiteContext.findOne({ websiteId }).lean();
      if (!context) {
        throw new Error(`Context not found for website: ${websiteId}`);
      }

      return {
        websiteId: context.websiteId,
        currentStage: context.workflow.currentStage,
        completedStages: context.workflow.completedStages,
        agentStatuses: {
          websiteAgent: context.websiteAgent.status,
          imageAgent: context.imageAgent.status,
          marketingAgent: context.marketingAgent.status,
          analyticsAgent: context.analyticsAgent.status
        },
        isLocked: context.isLocked,
        lockedBy: context.lockedBy,
        version: context.version,
        lastActivity: context.lastAgentActivity
      };
    } catch (error) {
      console.error('Error getting context status:', error);
      throw error;
    }
  }

  // Utility method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up expired locks
  async cleanupExpiredLocks() {
    try {
      const expiredTime = new Date(Date.now() - this.lockTimeout);
      await WebsiteContext.updateMany(
        { 
          isLocked: true, 
          'lockedBy.timestamp': { $lt: expiredTime } 
        },
        { 
          $unset: { lockedBy: 1 },
          $set: { isLocked: false }
        }
      );
    } catch (error) {
      console.error('Error cleaning up expired locks:', error);
    }
  }

  // Start periodic cleanup
  startCleanupScheduler() {
    setInterval(() => {
      this.cleanupExpiredLocks();
    }, 60000); // Run every minute
  }
}

module.exports = new ContextManager();
