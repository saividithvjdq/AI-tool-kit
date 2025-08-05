# MCP AI Agents - Containerized Microservices

🚀 **Complete containerized AI agent system using Model Context Protocol (MCP) for scalable, isolated microservices architecture.**

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP AI Agents System                        │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)           │  API Server (Node.js)             │
│  - User Interface           │  - Task Coordination              │
│  - Voice Commands           │  - API Endpoints                  │
│  - Real-time Updates        │  - WebSocket Support              │
│  Port: 3000                 │  Port: 5001                       │
├─────────────────────────────┼─────────────────────────────────────┤
│           Agent Registry (MCP Coordinator)                     │
│           - Agent Discovery & Registration                     │
│           - Task Routing & Distribution                        │
│           - Health Monitoring                                  │
│           Port: 5002                                           │
├─────────────────────────────────────────────────────────────────┤
│                    AI Agent Microservices                      │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│  Website        │  Marketing      │  Image          │  Analytics│
│  Generator      │  Automation     │  Generator      │  Processor│
│  - Landing Pages│  - Email Camps  │  - AI Images    │  - Reports│
│  - Portfolios   │  - Social Media │  - Logos        │  - Metrics│
│  - Responsive   │  - Lead Gen     │  - Banners      │  - Insights│
├─────────────────┼─────────────────┼─────────────────┼───────────┤
│               Voice Bot Processor                   │           │
│               - Voice Commands                      │           │
│               - Speech Processing                   │           │
│               - Audio Analysis                      │           │
├─────────────────────────────────────────────────────────────────┤
│              Shared Infrastructure                              │
│  MongoDB (Database)          │  Redis (Task Queue)             │
│  - Data Persistence          │  - Inter-agent Communication    │
│  - Agent State               │  - Task Distribution             │
│  Port: 27017                 │  Port: 6379                     │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Key Features

### ✅ **Containerized Microservices**
- **Isolated Agent Environments**: Each AI agent runs in its own container
- **Docker Orchestration**: Complete docker-compose setup
- **Scalable Architecture**: Scale individual agents based on demand
- **Health Monitoring**: Built-in health checks and service monitoring

### ✅ **Model Context Protocol (MCP)**
- **Agent Coordination**: Centralized registry for agent discovery
- **Task Distribution**: Intelligent routing based on capabilities
- **Inter-agent Communication**: Redis-based message queues
- **Real-time Monitoring**: Agent status and performance tracking

### ✅ **AI Agent Capabilities**
- **Website Generator**: Landing pages, portfolios, responsive designs
- **Marketing Automation**: Email campaigns, social media, lead generation  
- **Image Generator**: AI artwork, logos, banners, product images
- **Analytics Processor**: Data analysis, reports, performance metrics
- **Voice Bot**: Speech processing, voice commands, audio analysis

### ✅ **Production Ready**
- **Security Hardening**: Non-root containers, security headers
- **Load Balancing**: Nginx reverse proxy with caching
- **Resource Management**: CPU/memory limits and monitoring
- **Auto-restart**: Automatic container recovery on failure

## 🚀 Quick Start

### Prerequisites
- **Docker** (v20.10+)
- **Docker Compose** (v2.0+)
- **Node.js** (v18+) for development

### 1. Clone and Setup
```bash
git clone <repository-url>
cd ai-business-server
```

### 2. Start the Complete System

**Windows (PowerShell):**
```powershell
.\start-agents.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x start-agents.sh
./start-agents.sh
```

### 3. Access the System
- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:5001
- **Agent Registry**: http://localhost:5002/agents
- **MongoDB**: mongodb://localhost:27017
- **Redis**: redis://localhost:6379

## 🐳 Container Services

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| Frontend | `mcp-ai-agents-frontend` | 3000 | React UI with Nginx |
| API Server | `mcp-ai-agents-api` | 5001 | Main API & coordination |
| Agent Registry | `agent-registry` | 5002 | MCP coordinator |
| Website Agent | `website-agent` | - | Website generation |
| Marketing Agent | `marketing-agent` | - | Marketing automation |
| Image Agent | `image-agent` | - | Image generation |
| Analytics Agent | `analytics-agent` | - | Data processing |
| VoiceBot Agent | `voicebot-agent` | - | Voice processing |
| MongoDB | `mongodb` | 27017 | Database |
| Redis | `redis` | 6379 | Task queue |

## 🛠️ Management Commands

### PowerShell Commands
```powershell
# Start all services
.\start-agents.ps1

# Stop all services
.\start-agents.ps1 -Stop

# Restart services
.\start-agents.ps1 -Restart

# Show status
.\start-agents.ps1 -Status

# View logs
.\start-agents.ps1 -Logs

# Rebuild images
.\start-agents.ps1 -Build
```

### Docker Compose Commands
```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# Scale specific agents
docker compose up -d --scale website-agent=3

# Stop services
docker compose down

# Rebuild and restart
docker compose up -d --build
```

## 📊 Monitoring & Health Checks

### Service Health Endpoints
- **API Server**: http://localhost:5001/health
- **Agent Registry**: http://localhost:5002/health  
- **Frontend**: http://localhost:3000/health

### Agent Status
```bash
# Check registered agents
curl http://localhost:5002/agents

# View system metrics
curl http://localhost:5002/metrics

# Agent capabilities
curl http://localhost:5002/agents/{agentId}
```

### Container Stats
```bash
# Real-time container stats
docker stats

# Container logs
docker compose logs -f [service-name]
```

## 🧪 Development

### Local Development
```bash
# Start only infrastructure (MongoDB, Redis)
docker compose up -d mongodb redis

# Run agents locally for development
cd agents
npm install
npm run start:registry
npm run start:website
npm run start:marketing
# ... etc
```

### Adding New Agents
1. Create agent implementation in `agents/[agentName]Agent.js`
2. Create Dockerfile in `agents/Dockerfile.[agentName]`
3. Add to `docker-compose.yml`
4. Update agent registry capabilities
5. Test with containerized system

## 🔧 Configuration

### Environment Variables
```bash
# MongoDB
MONGODB_URI=mongodb://mongodb:27017/mcp_agents

# Redis
REDIS_URL=redis://redis:6379

# Agent Configuration
AGENT_ID=auto-generated
REGISTRY_URL=http://agent-registry:5002

# API Configuration
PORT=5001
NODE_ENV=production
```

### Scaling Configuration
```yaml
# docker-compose.override.yml
services:
  website-agent:
    deploy:
      replicas: 3
  marketing-agent:
    deploy:
      replicas: 2
```

## 🔒 Security Features

### Container Security
- ✅ **Non-root users** in all containers
- ✅ **Read-only root filesystems** where possible
- ✅ **Resource limits** (CPU/memory)
- ✅ **Network isolation** with custom networks
- ✅ **Health checks** for all services

### Application Security
- ✅ **CORS configuration** for API endpoints
- ✅ **Security headers** (CSP, XSS protection)
- ✅ **Input validation** for all API calls
- ✅ **Rate limiting** on API endpoints
- ✅ **Authentication tokens** for agent communication

## 📈 Performance & Scaling

### Horizontal Scaling
```bash
# Scale specific agent types
docker compose up -d --scale website-agent=5
docker compose up -d --scale image-agent=3

# Auto-scaling based on queue length
# (Implement with monitoring solution)
```

### Resource Optimization
- **Memory limits**: 512MB per agent container
- **CPU limits**: 0.5 CPU per agent
- **Connection pooling**: MongoDB and Redis
- **Caching**: Nginx static file caching

## 🚨 Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check Docker daemon
docker info

# Check port conflicts
netstat -tulpn | grep :3000

# View service logs
docker compose logs -f [service-name]
```

**Agents not registering:**
```bash
# Check Redis connection
docker compose exec redis redis-cli ping

# Check agent logs
docker compose logs -f website-agent

# Verify network connectivity
docker compose exec website-agent ping agent-registry
```

**Performance issues:**
```bash
# Monitor resource usage
docker stats

# Check container health
docker compose ps

# Scale up agents
docker compose up -d --scale website-agent=3
```

### Debug Mode
```bash
# Start with debug logging
DEBUG=* docker compose up

# Connect to container for debugging
docker compose exec website-agent sh
```

## 📚 API Documentation

### Task Dispatch API
```bash
# Dispatch website generation task
curl -X POST http://localhost:5002/tasks/dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "generate_website",
    "taskData": {
      "businessName": "My Company",
      "websiteType": "business"
    }
  }'

# Get task result
curl http://localhost:5002/tasks/{taskId}/result
```

### Agent Management API
```bash
# List all agents
curl http://localhost:5002/agents

# Get specific agent
curl http://localhost:5002/agents/{agentId}

# System metrics
curl http://localhost:5002/metrics
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Add your agent in the appropriate directory
4. Update documentation and tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Model Context Protocol (MCP)** for agent coordination patterns
- **Docker** for containerization platform
- **Redis** for high-performance task queues
- **MongoDB** for flexible data storage
- **React** for modern frontend framework

---

**🎉 Your containerized AI agent system is ready for production deployment!**

For support and questions, please open an issue or join our community discussions.
