const mongoose = require('mongoose');
const Redis = require('redis');
const { EventEmitter } = require('events');

class AgentRunner extends EventEmitter {
  constructor(agentType) {
    super();
    this.agentType = agentType;
    this.agentId = process.env.AGENT_ID || `${agentType}-${Date.now()}`;
    this.agent = null;
    this.redis = null;
    this.isRunning = false;
    this.taskQueue = `mcp:tasks:${agentType}`;
    this.resultPrefix = 'mcp:results:';
    this.registryUrl = process.env.REGISTRY_URL || 'http://agent-registry:5002';
  }

  async initialize() {
    try {
      console.log(`🚀 Initializing ${this.agentType} agent...`);

      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`✅ ${this.agentType} connected to MongoDB`);

      // Connect to Redis
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL
      });
      
      this.redis.on('error', (err) => {
        console.error(`❌ ${this.agentType} Redis error:`, err);
      });

      await this.redis.connect();
      console.log(`✅ ${this.agentType} connected to Redis`);

      // Initialize specific agent
      await this.initializeAgent();

      // Register with agent registry
      await this.registerWithRegistry();

      // Start health check interval
      this.startHealthCheck();

      // Start listening for tasks
      this.isRunning = true;
      await this.startListening();

    } catch (error) {
      console.error(`❌ ${this.agentType} initialization failed:`, error);
      process.exit(1);
    }
  }

  async initializeAgent() {
    try {
      switch (this.agentType) {
        case 'website-generator':
          const WebsiteAgent = require('./websiteGeneratorAgent');
          this.agent = new WebsiteAgent();
          break;
        case 'marketing-automation':
          const MarketingAgent = require('./marketingAgent');
          this.agent = new MarketingAgent();
          break;
        case 'image-generator':
          const ImageAgent = require('./imageGeneratorAgent');
          this.agent = new ImageAgent();
          break;
        case 'analytics-processor':
          const AnalyticsAgent = require('./analyticsAgent');
          this.agent = new AnalyticsAgent();
          break;
        case 'voice-bot-processor':
          const VoiceBotAgent = require('./voiceBotAgent');
          this.agent = new VoiceBotAgent();
          break;
        default:
          throw new Error(`Unknown agent type: ${this.agentType}`);
      }

      if (this.agent && typeof this.agent.initialize === 'function') {
        await this.agent.initialize();
      }
      
      console.log(`✅ ${this.agentType} agent initialized`);
    } catch (error) {
      console.error(`❌ Failed to initialize ${this.agentType} agent:`, error);
      throw error;
    }
  }

  async registerWithRegistry() {
    try {
      const registrationData = {
        agentId: this.agentId,
        agentType: this.agentType,
        status: 'online',
        capabilities: this.agent?.getCapabilities?.() || [],
        lastSeen: new Date().toISOString(),
        metadata: {
          version: process.env.npm_package_version || '1.0.0',
          nodeVersion: process.version,
          startTime: new Date().toISOString()
        }
      };

      // Store registration in Redis
      await this.redis.hSet(
        'mcp:agents:registry',
        this.agentId,
        JSON.stringify(registrationData)
      );

      // Set TTL for agent registration
      await this.redis.expire(`mcp:agents:${this.agentId}`, 300); // 5 minutes

      console.log(`✅ ${this.agentType} registered with agent registry`);
    } catch (error) {
      console.error(`❌ Failed to register ${this.agentType}:`, error);
    }
  }

  startHealthCheck() {
    setInterval(async () => {
      try {
        await this.redis.hSet(
          'mcp:agents:heartbeat',
          this.agentId,
          new Date().toISOString()
        );
        await this.redis.expire(`mcp:agents:heartbeat`, 300);
      } catch (error) {
        console.error(`❌ ${this.agentType} health check failed:`, error);
      }
    }, 30000); // Every 30 seconds
  }

  async startListening() {
    console.log(`🎯 ${this.agentType} agent listening for tasks on queue: ${this.taskQueue}`);
    
    while (this.isRunning) {
      try {
        // Block and wait for tasks (with timeout)
        const task = await this.redis.blPop({
          key: this.taskQueue,
          timeout: 10 // 10 second timeout
        });
        
        if (task) {
          const taskData = JSON.parse(task.element);
          console.log(`📝 ${this.agentType} processing task:`, taskData.id);
          
          // Process task with timeout
          const result = await Promise.race([
            this.processTaskSafely(taskData),
            this.createTimeoutPromise(60000) // 60 second timeout
          ]);
          
          // Store result with TTL
          await this.redis.setEx(
            `${this.resultPrefix}${taskData.id}`, 
            3600, // 1 hour TTL
            JSON.stringify(result)
          );
          
          console.log(`✅ ${this.agentType} completed task:`, taskData.id);
          
          // Update metrics
          await this.updateMetrics('task_completed');
        }
      } catch (error) {
        if (error.message !== 'TIMEOUT') {
          console.error(`❌ ${this.agentType} task processing error:`, error);
          await this.updateMetrics('task_failed');
        }
      }
    }
  }

  async processTaskSafely(taskData) {
    try {
      // Add metrics
      await this.updateMetrics('task_started');
      
      const startTime = Date.now();
      
      // Process task through agent
      const result = await this.agent.processTask(taskData);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        result: result,
        agentId: this.agentId,
        agentType: this.agentType,
        processedAt: new Date().toISOString(),
        processingTime: duration,
        taskId: taskData.id
      };
    } catch (error) {
      console.error(`❌ ${this.agentType} task processing error:`, error);
      
      return {
        success: false,
        error: {
          message: error.message,
          stack: error.stack,
          type: error.constructor.name
        },
        agentId: this.agentId,
        agentType: this.agentType,
        processedAt: new Date().toISOString(),
        taskId: taskData.id
      };
    }
  }

  createTimeoutPromise(timeout) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), timeout);
    });
  }

  async updateMetrics(metricType) {
    try {
      const metricsKey = `mcp:metrics:${this.agentType}`;
      await this.redis.hIncrBy(metricsKey, metricType, 1);
      await this.redis.hSet(metricsKey, 'last_activity', new Date().toISOString());
      await this.redis.expire(metricsKey, 86400); // 24 hours
    } catch (error) {
      console.error(`❌ Failed to update metrics:`, error);
    }
  }

  async shutdown() {
    console.log(`🛑 Shutting down ${this.agentType} agent...`);
    
    this.isRunning = false;
    
    try {
      // Unregister from registry
      await this.redis.hDel('mcp:agents:registry', this.agentId);
      await this.redis.hDel('mcp:agents:heartbeat', this.agentId);
      
      // Close connections
      if (this.redis) {
        await this.redis.quit();
      }
      
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }
      
      console.log(`✅ ${this.agentType} agent shutdown complete`);
    } catch (error) {
      console.error(`❌ ${this.agentType} shutdown error:`, error);
    }
    
    process.exit(0);
  }
}

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  if (global.agentRunner) {
    await global.agentRunner.shutdown();
  }
});

process.on('SIGINT', async () => {
  if (global.agentRunner) {
    await global.agentRunner.shutdown();
  }
});

// Start the agent
const agentType = process.argv[2];
if (!agentType) {
  console.error('❌ Agent type is required');
  console.error('Usage: node runner.js <agent-type>');
  process.exit(1);
}

const runner = new AgentRunner(agentType);
global.agentRunner = runner;

runner.initialize().catch((error) => {
  console.error(`❌ Failed to start ${agentType} agent:`, error);
  process.exit(1);
});

module.exports = AgentRunner;
