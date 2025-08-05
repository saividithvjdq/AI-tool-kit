const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { chatbotService } = require('./chatbotService');
const User = require('../models/User');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of userId to WebSocket connections
    this.activeSessions = new Map(); // Map of sessionId to user info
  }

  // Initialize WebSocket server
  initialize(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws/chat'
    });

    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    console.log('🔌 WebSocket server initialized for real-time chat');
  }

  // Handle new WebSocket connection
  async handleConnection(ws, request) {
    try {
      // Extract token from query parameters or headers
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        ws.close(1008, 'Invalid user');
        return;
      }

      // Store client connection
      const clientId = `${user._id}_${Date.now()}`;
      this.clients.set(clientId, {
        ws,
        userId: user._id,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          businessProfile: user.businessProfile
        },
        connectedAt: new Date()
      });

      console.log(`👤 User ${user.name} connected to WebSocket chat`);

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection',
        status: 'connected',
        message: 'Connected to real-time chat',
        timestamp: new Date()
      });

      // Handle messages
      ws.on('message', (data) => {
        this.handleMessage(clientId, data);
      });

      // Handle disconnection
      ws.on('close', () => {
        this.handleDisconnection(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${user.name}:`, error);
        this.handleDisconnection(clientId);
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  // Handle incoming messages
  async handleMessage(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;

      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'chat_message':
          await this.handleChatMessage(clientId, message);
          break;
        case 'typing':
          this.handleTyping(clientId, message);
          break;
        case 'session_info':
          this.handleSessionInfo(clientId, message);
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Failed to process message',
        timestamp: new Date()
      });
    }
  }

  // Handle chat messages
  async handleChatMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { sessionId, content, chatbotType } = message;
    
    // Send typing indicator
    this.sendToClient(clientId, {
      type: 'bot_typing',
      sessionId,
      timestamp: new Date()
    });

    try {
      // Process message through chatbot service
      const response = await chatbotService.processMessage(
        sessionId || `ws_${clientId}_${Date.now()}`,
        content,
        client.user.businessProfile,
        chatbotType,
        client.userId
      );

      // Send bot response
      this.sendToClient(clientId, {
        type: 'bot_response',
        sessionId: response.sessionId,
        content: response.response,
        chatbotType: response.chatbotType,
        capabilities: response.capabilities,
        timestamp: response.timestamp
      });

      // Store session info
      this.activeSessions.set(response.sessionId, {
        userId: client.userId,
        clientId,
        chatbotType: response.chatbotType,
        lastActivity: new Date()
      });

    } catch (error) {
      console.error('Error processing chat message:', error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Sorry, I encountered an error processing your message. Please try again.',
        sessionId,
        timestamp: new Date()
      });
    }
  }

  // Handle typing indicators
  handleTyping(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // For now, just acknowledge typing (could be extended for multi-user chats)
    this.sendToClient(clientId, {
      type: 'typing_acknowledged',
      sessionId: message.sessionId,
      timestamp: new Date()
    });
  }

  // Handle session info requests
  handleSessionInfo(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const sessionInfo = this.activeSessions.get(message.sessionId);
    
    this.sendToClient(clientId, {
      type: 'session_info_response',
      sessionId: message.sessionId,
      info: sessionInfo ? {
        chatbotType: sessionInfo.chatbotType,
        lastActivity: sessionInfo.lastActivity
      } : null,
      timestamp: new Date()
    });
  }

  // Handle client disconnection
  handleDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`👋 User ${client.user.name} disconnected from WebSocket chat`);
      this.clients.delete(clientId);
    }

    // Clean up sessions for this client
    for (const [sessionId, sessionInfo] of this.activeSessions.entries()) {
      if (sessionInfo.clientId === clientId) {
        this.activeSessions.delete(sessionId);
      }
    }
  }

  // Send message to specific client
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  // Broadcast message to all connected clients
  broadcast(message) {
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  // Send message to specific user (all their connections)
  sendToUser(userId, message) {
    this.clients.forEach((client, clientId) => {
      if (client.userId.toString() === userId.toString()) {
        this.sendToClient(clientId, message);
      }
    });
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.clients.size;
  }

  // Get active sessions count
  getActiveSessionsCount() {
    return this.activeSessions.size;
  }

  // Clean up inactive sessions (call periodically)
  cleanupInactiveSessions() {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, sessionInfo] of this.activeSessions.entries()) {
      if (now - sessionInfo.lastActivity > inactiveThreshold) {
        this.activeSessions.delete(sessionId);
        console.log(`🧹 Cleaned up inactive session: ${sessionId}`);
      }
    }
  }
}

module.exports = new WebSocketService();
