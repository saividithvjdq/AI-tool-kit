const express = require('express');
const cors = require('cors');
const Redis = require('redis');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

// Redis client for MCP coordination
let redis;

// Task routing configuration
const AGENT_CAPABILITIES = {
  'website-generator': [
    'generate_website',
    'create_landing_page',
    'build_portfolio',
    'design_layout',
    'responsive_design'
  ],
  'marketing-automation': [
    'create_campaign',
    'send_email',
    'social_media_post',
    'analyze_metrics',
    'lead_generation'
  ],
  'image-generator': [
    'generate_image',
    'create_logo',
    'design_banner',
    'product_image',
    'ai_artwork'
  ],
  'analytics-processor': [
    'analyze_data',
    'generate_report',
    'track_metrics',
    'performance_analysis',
    'user_insights'
  ],
  'voice-bot-processor': [
    'process_voice_command',
    'text_to_speech',
    'speech_to_text',
    'voice_navigation',
    'audio_processing'
  ]
};

// Initialize connections
async function initializeServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Agent Registry connected to MongoDB');

    // Connect to Redis
    redis = Redis.createClient({
      url: process.env.REDIS_URL
    });
    
    redis.on('error', (err) => {
      console.error('❌ Agent Registry Redis error:', err);
    });

    await redis.connect();
    console.log('✅ Agent Registry connected to Redis');

    // Clean up old registrations on startup
    await cleanupStaleAgents();

  } catch (error) {
    console.error('❌ Agent Registry initialization failed:', error);
    process.exit(1);
  }
}

// Clean up agents that haven't sent heartbeats
async function cleanupStaleAgents() {
  try {
    const heartbeats = await redis.hGetAll('mcp:agents:heartbeat');
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [agentId, lastSeen] of Object.entries(heartbeats)) {
      const lastSeenTime = new Date(lastSeen);
      if (now - lastSeenTime > staleThreshold) {
        await redis.hDel('mcp:agents:registry', agentId);
        await redis.hDel('mcp:agents:heartbeat', agentId);
        console.log(`🧹 Cleaned up stale agent: ${agentId}`);
      }
    }
  } catch (error) {
    console.error('❌ Error cleaning up stale agents:', error);
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agent-registry'
  });
});

// Get all registered agents
app.get('/agents', async (req, res) => {
  try {
    const agents = await redis.hGetAll('mcp:agents:registry');
    const heartbeats = await redis.hGetAll('mcp:agents:heartbeat');
    
    const agentList = Object.entries(agents).map(([agentId, data]) => {
      const agent = JSON.parse(data);
      const lastSeen = heartbeats[agentId];
      const isOnline = lastSeen && (new Date() - new Date(lastSeen)) < 60000; // 1 minute
      
      return {
        ...agent,
        lastSeen,
        isOnline
      };
    });

    res.json({
      success: true,
      agents: agentList,
      total: agentList.length,
      online: agentList.filter(a => a.isOnline).length
    });
  } catch (error) {
    console.error('❌ Error fetching agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents'
    });
  }
});

// Get agent by ID
app.get('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const agentData = await redis.hGet('mcp:agents:registry', agentId);
    const heartbeat = await redis.hGet('mcp:agents:heartbeat', agentId);
    
    if (!agentData) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }

    const agent = JSON.parse(agentData);
    const isOnline = heartbeat && (new Date() - new Date(heartbeat)) < 60000;

    res.json({
      success: true,
      agent: {
        ...agent,
        lastSeen: heartbeat,
        isOnline
      }
    });
  } catch (error) {
    console.error('❌ Error fetching agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent'
    });
  }
});

// Dispatch task to appropriate agent
app.post('/tasks/dispatch', async (req, res) => {
  try {
    const { taskType, taskData, priority = 'normal' } = req.body;
    
    if (!taskType || !taskData) {
      return res.status(400).json({
        success: false,
        error: 'taskType and taskData are required'
      });
    }

    // Find suitable agent type for the task
    const suitableAgentType = findAgentForTask(taskType);
    
    if (!suitableAgentType) {
      return res.status(400).json({
        success: false,
        error: `No agent available for task type: ${taskType}`
      });
    }

    // Check if agents of this type are online
    const agents = await redis.hGetAll('mcp:agents:registry');
    const heartbeats = await redis.hGetAll('mcp:agents:heartbeat');
    
    const onlineAgents = Object.entries(agents)
      .filter(([agentId, data]) => {
        const agent = JSON.parse(data);
        const lastSeen = heartbeats[agentId];
        const isOnline = lastSeen && (new Date() - new Date(lastSeen)) < 60000;
        return agent.agentType === suitableAgentType && isOnline;
      });

    if (onlineAgents.length === 0) {
      return res.status(503).json({
        success: false,
        error: `No online agents available for type: ${suitableAgentType}`
      });
    }

    // Create task with unique ID
    const taskId = uuidv4();
    const task = {
      id: taskId,
      type: taskType,
      data: taskData,
      priority,
      assignedAgentType: suitableAgentType,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    // Add task to appropriate queue
    const queueName = `mcp:tasks:${suitableAgentType}`;
    await redis.lPush(queueName, JSON.stringify(task));

    // Store task metadata
    await redis.setEx(
      `mcp:task:${taskId}`,
      3600, // 1 hour TTL
      JSON.stringify(task)
    );

    console.log(`📤 Task ${taskId} dispatched to ${suitableAgentType} queue`);

    res.json({
      success: true,
      taskId,
      assignedAgentType: suitableAgentType,
      queuePosition: await redis.lLen(queueName),
      estimatedWait: calculateEstimatedWait(suitableAgentType, onlineAgents.length)
    });

  } catch (error) {
    console.error('❌ Error dispatching task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to dispatch task'
    });
  }
});

// Get task result
app.get('/tasks/:taskId/result', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Check if result is available
    const result = await redis.get(`mcp:results:${taskId}`);
    
    if (!result) {
      // Check if task exists
      const task = await redis.get(`mcp:task:${taskId}`);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      return res.json({
        success: true,
        status: 'pending',
        message: 'Task is still being processed'
      });
    }

    const parsedResult = JSON.parse(result);
    
    res.json({
      success: true,
      status: 'completed',
      result: parsedResult
    });

  } catch (error) {
    console.error('❌ Error fetching task result:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task result'
    });
  }
});

// Get system metrics
app.get('/metrics', async (req, res) => {
  try {
    const agentTypes = Object.keys(AGENT_CAPABILITIES);
    const metrics = {};

    for (const agentType of agentTypes) {
      const agentMetrics = await redis.hGetAll(`mcp:metrics:${agentType}`);
      const queueLength = await redis.lLen(`mcp:tasks:${agentType}`);
      
      metrics[agentType] = {
        ...agentMetrics,
        currentQueueLength: queueLength
      };
    }

    const totalAgents = await redis.hLen('mcp:agents:registry');
    const totalHeartbeats = await redis.hLen('mcp:agents:heartbeat');

    res.json({
      success: true,
      systemMetrics: {
        totalRegisteredAgents: totalAgents,
        totalOnlineAgents: totalHeartbeats,
        timestamp: new Date().toISOString()
      },
      agentMetrics: metrics
    });

  } catch (error) {
    console.error('❌ Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

// Helper functions

function findAgentForTask(taskType) {
  for (const [agentType, capabilities] of Object.entries(AGENT_CAPABILITIES)) {
    if (capabilities.includes(taskType)) {
      return agentType;
    }
  }
  
  // Fallback: try to match by keyword
  const taskLower = taskType.toLowerCase();
  
  if (taskLower.includes('website') || taskLower.includes('page')) {
    return 'website-generator';
  }
  if (taskLower.includes('marketing') || taskLower.includes('email') || taskLower.includes('campaign')) {
    return 'marketing-automation';
  }
  if (taskLower.includes('image') || taskLower.includes('logo') || taskLower.includes('design')) {
    return 'image-generator';
  }
  if (taskLower.includes('analytics') || taskLower.includes('data') || taskLower.includes('report')) {
    return 'analytics-processor';
  }
  if (taskLower.includes('voice') || taskLower.includes('speech') || taskLower.includes('audio')) {
    return 'voice-bot-processor';
  }
  
  return null;
}

function calculateEstimatedWait(agentType, onlineAgentCount) {
  // Simple estimation based on average task processing time
  const averageTaskTime = 30; // seconds
  const queueEfficiency = 0.8; // 80% efficiency
  
  return Math.round((averageTaskTime / (onlineAgentCount * queueEfficiency)));
}

// Cleanup interval
setInterval(cleanupStaleAgents, 60000); // Every minute

// Start the server
const PORT = process.env.PORT || 5002;

initializeServices().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Agent Registry running on port ${PORT}`);
    console.log(`📋 Managing ${Object.keys(AGENT_CAPABILITIES).length} agent types`);
  });
}).catch((error) => {
  console.error('❌ Failed to start Agent Registry:', error);
  process.exit(1);
});

module.exports = app;
