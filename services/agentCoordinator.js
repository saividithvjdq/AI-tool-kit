const contextManager = require('./contextManager');
const { agent: websiteGeneratorAgent } = require('../agents/websiteGeneratorAgent');
const { agent: imageGeneratorAgent } = require('../agents/imageGeneratorAgent');
const { agent: marketingAgent } = require('../agents/marketingAgent');
const { agent: analyticsAgent } = require('../agents/analyticsAgent');

class AgentCoordinator {
  constructor() {
    this.agents = new Map();
    this.registerAgents();
    this.setupEventHandlers();
    
    // Start context manager cleanup scheduler
    contextManager.startCleanupScheduler();
  }

  // Register all agents
  registerAgents() {
    this.agents.set('website-generator', websiteGeneratorAgent);
    this.agents.set('image-generator', imageGeneratorAgent);
    this.agents.set('marketing-agent', marketingAgent);
    this.agents.set('analytics-agent', analyticsAgent);
    
    console.log('✅ All agents registered successfully');
  }

  // Setup event handlers for agent coordination
  setupEventHandlers() {
    // Listen for context events
    contextManager.on('context-created', this.handleContextCreated.bind(this));
    contextManager.on('context-updated', this.handleContextUpdated.bind(this));
    
    // Listen for agent-specific events
    this.setupAgentEventHandlers();
  }

  // Setup individual agent event handlers
  setupAgentEventHandlers() {
    // Website generator events
    contextManager.on('website-generated', (event) => {
      console.log('🌐 Website generation completed, triggering image generation');
      this.triggerNextStage(event.websiteId, 'image-generation');
    });

    // Image generator events
    contextManager.on('images-generated', (event) => {
      console.log('🖼️ Image generation completed, triggering marketing optimization');
      this.triggerNextStage(event.websiteId, 'marketing-optimization');
    });

    // Marketing agent events
    contextManager.on('marketing-optimized', (event) => {
      console.log('📈 Marketing optimization completed, triggering analytics setup');
      this.triggerNextStage(event.websiteId, 'analytics-setup');
    });

    // Analytics agent events
    contextManager.on('analytics-setup', (event) => {
      console.log('📊 Analytics setup completed, workflow finished');
      this.completeWorkflow(event.websiteId);
    });
  }

  // Handle new context creation
  async handleContextCreated(event) {
    try {
      console.log(`🚀 New website generation workflow started: ${event.websiteId}`);
      
      // Log the workflow initiation
      await contextManager.logActivity(
        event.websiteId,
        'coordinator',
        'workflow-started',
        'completed',
        { stage: 'website-generation', targetAgent: event.targetAgent }
      );
      
      // The website generator agent will automatically start processing
      // due to its event listener
    } catch (error) {
      console.error('Error handling context creation:', error);
    }
  }

  // Handle context updates
  async handleContextUpdated(event) {
    try {
      const { websiteId, agentId, updateData } = event;
      
      // Check if an agent completed its stage
      if (this.isStageCompleted(updateData, agentId)) {
        console.log(`✅ Agent ${agentId} completed processing for ${websiteId}`);
        
        // Trigger next stage
        await this.progressWorkflow(websiteId, agentId);
      }
    } catch (error) {
      console.error('Error handling context update:', error);
    }
  }

  // Check if an agent completed its stage
  isStageCompleted(updateData, agentId) {
    const agentStatusMap = {
      'website-generator': 'websiteAgent.status',
      'image-generator': 'imageAgent.status',
      'marketing-agent': 'marketingAgent.status',
      'analytics-agent': 'analyticsAgent.status'
    };

    const statusKey = agentStatusMap[agentId];
    return statusKey && updateData[statusKey] === 'completed';
  }

  // Progress the workflow to the next stage
  async progressWorkflow(websiteId, completedAgentId) {
    try {
      const workflowMap = {
        'website-generator': 'image-generation',
        'image-generator': 'marketing-optimization',
        'marketing-agent': 'analytics-setup',
        'analytics-agent': 'completed'
      };

      const nextStage = workflowMap[completedAgentId];
      
      if (nextStage && nextStage !== 'completed') {
        await this.triggerNextStage(websiteId, nextStage);
      } else if (nextStage === 'completed') {
        await this.completeWorkflow(websiteId);
      }
    } catch (error) {
      console.error('Error progressing workflow:', error);
    }
  }

  // Trigger the next stage in the workflow
  async triggerNextStage(websiteId, stage) {
    try {
      const agentMap = {
        'image-generation': 'image-generator',
        'marketing-optimization': 'marketing-agent',
        'analytics-setup': 'analytics-agent'
      };

      const targetAgent = agentMap[stage];
      
      if (targetAgent) {
        // Add notification for the target agent
        const context = await contextManager.getContext(websiteId);
        await context.addNotification(
          targetAgent,
          'stage-ready',
          `Ready for ${stage} processing`,
          { stage, websiteId }
        );

        console.log(`📢 Notification sent to ${targetAgent} for ${stage}`);
      }
    } catch (error) {
      console.error('Error triggering next stage:', error);
    }
  }

  // Complete the entire workflow
  async completeWorkflow(websiteId) {
    try {
      await contextManager.updateContext(websiteId, 'coordinator', {
        'workflow.currentStage': 'completed',
        'workflow.completedAt': new Date()
      });

      await contextManager.logActivity(
        websiteId,
        'coordinator',
        'workflow-completed',
        'completed',
        { completedAt: new Date() }
      );

      console.log(`🎉 Workflow completed successfully for website: ${websiteId}`);
      
      // Emit completion event
      contextManager.emit('workflow-completed', { websiteId });
    } catch (error) {
      console.error('Error completing workflow:', error);
    }
  }

  // Get overall system status
  async getSystemStatus() {
    try {
      const agentStatuses = {};
      
      for (const [agentId, agent] of this.agents) {
        agentStatuses[agentId] = agent.getStatus();
      }

      // Get active workflows
      const activeWorkflows = await this.getActiveWorkflows();
      
      // Get system metrics
      const systemMetrics = await this.getSystemMetrics();

      return {
        timestamp: new Date(),
        agents: agentStatuses,
        activeWorkflows,
        systemMetrics,
        status: 'operational'
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        timestamp: new Date(),
        status: 'error',
        error: error.message
      };
    }
  }

  // Get active workflows
  async getActiveWorkflows() {
    try {
      // This would query the database for active contexts
      // For now, return mock data
      return {
        total: 0,
        byStage: {
          'website-generation': 0,
          'image-generation': 0,
          'marketing-optimization': 0,
          'analytics-setup': 0
        }
      };
    } catch (error) {
      console.error('Error getting active workflows:', error);
      return { total: 0, byStage: {} };
    }
  }

  // Get system metrics
  async getSystemMetrics() {
    try {
      return {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform
      };
    } catch (error) {
      console.error('Error getting system metrics:', error);
      return {};
    }
  }

  // Manually trigger agent processing (for testing/debugging)
  async triggerAgent(agentId, websiteId, action = 'process') {
    try {
      const agent = this.agents.get(agentId);
      
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      console.log(`🔧 Manually triggering ${agentId} for website ${websiteId}`);
      
      // Add notification for the agent
      const context = await contextManager.getContext(websiteId);
      await context.addNotification(
        agentId,
        'manual-trigger',
        `Manual trigger for ${action}`,
        { action, websiteId, triggeredAt: new Date() }
      );

      return { success: true, message: `${agentId} triggered successfully` };
    } catch (error) {
      console.error('Error triggering agent:', error);
      throw error;
    }
  }

  // Health check for all agents
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      agents: {},
      issues: []
    };

    for (const [agentId, agent] of this.agents) {
      try {
        const agentStatus = agent.getStatus();
        health.agents[agentId] = {
          status: agentStatus.status,
          lastActivity: agentStatus.lastActivity,
          healthy: agentStatus.status === 'active'
        };

        if (agentStatus.status !== 'active') {
          health.issues.push(`Agent ${agentId} is not active`);
          health.status = 'degraded';
        }
      } catch (error) {
        health.agents[agentId] = {
          status: 'error',
          error: error.message,
          healthy: false
        };
        health.issues.push(`Agent ${agentId} health check failed: ${error.message}`);
        health.status = 'unhealthy';
      }
    }

    return health;
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🛑 Shutting down agent coordinator...');
    
    try {
      // Stop all agents gracefully
      for (const [agentId, agent] of this.agents) {
        if (agent.shutdown) {
          await agent.shutdown();
        }
        console.log(`✅ Agent ${agentId} shut down`);
      }
      
      // Clean up context manager
      contextManager.removeAllListeners();
      
      console.log('✅ Agent coordinator shut down successfully');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }
}

// Create singleton instance
const agentCoordinator = new AgentCoordinator();

// Handle process signals for graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  agentCoordinator.shutdown().then(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  agentCoordinator.shutdown().then(() => {
    process.exit(0);
  });
});

module.exports = agentCoordinator;
