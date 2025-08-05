#!/bin/bash

# MCP AI Agents - Containerized Deployment Script
# This script builds and starts the complete containerized AI agent system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="mcp-ai-agents"
NETWORK_NAME="mcp-network"
MONGODB_VERSION="7.0"
REDIS_VERSION="7.2-alpine"

echo -e "${BLUE}🚀 MCP AI Agents - Containerized Deployment${NC}"
echo -e "${BLUE}==========================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running"

# Check if Docker Compose is available
if ! docker compose version > /dev/null 2>&1; then
    print_error "Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

print_status "Docker Compose is available"

# Create Docker network if it doesn't exist
if ! docker network ls | grep -q $NETWORK_NAME; then
    echo "Creating Docker network: $NETWORK_NAME"
    docker network create $NETWORK_NAME
    print_status "Created Docker network: $NETWORK_NAME"
else
    print_status "Docker network $NETWORK_NAME already exists"
fi

# Build all images
echo -e "\n${BLUE}🔨 Building Docker images...${NC}"

# Build agent images
echo "Building agent registry image..."
docker build -f agents/Dockerfile.registry -t ${PROJECT_NAME}-registry:latest ./agents/

echo "Building website generator agent..."
docker build -f agents/Dockerfile.website -t ${PROJECT_NAME}-website:latest ./agents/

echo "Building marketing automation agent..."
docker build -f agents/Dockerfile.marketing -t ${PROJECT_NAME}-marketing:latest ./agents/

echo "Building image generator agent..."
docker build -f agents/Dockerfile.image -t ${PROJECT_NAME}-image:latest ./agents/

echo "Building analytics processor agent..."
docker build -f agents/Dockerfile.analytics -t ${PROJECT_NAME}-analytics:latest ./agents/

echo "Building voice bot processor agent..."
docker build -f agents/Dockerfile.voicebot -t ${PROJECT_NAME}-voicebot:latest ./agents/

echo "Building frontend image..."
docker build -f Dockerfile.frontend -t ${PROJECT_NAME}-frontend:latest .

echo "Building API server image..."
docker build -f Dockerfile -t ${PROJECT_NAME}-api:latest .

print_status "All Docker images built successfully"

# Start the services
echo -e "\n${BLUE}🚀 Starting containerized services...${NC}"

# Start with docker-compose
docker compose up -d

print_status "All services started"

# Wait for services to be healthy
echo -e "\n${BLUE}🏥 Checking service health...${NC}"

# Function to check service health
check_service_health() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo "Checking $service health on port $port..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:$port/health > /dev/null 2>&1; then
            print_status "$service is healthy"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - $service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_warning "$service health check timed out"
    return 1
}

# Wait a bit for services to start
sleep 10

# Check service health
check_service_health "API Server" 5001
check_service_health "Agent Registry" 5002
check_service_health "Frontend" 3000

# Show running containers
echo -e "\n${BLUE}📋 Running containers:${NC}"
docker compose ps

# Show service URLs
echo -e "\n${GREEN}🌐 Service URLs:${NC}"
echo "Frontend:        http://localhost:3000"
echo "API Server:      http://localhost:5001"
echo "Agent Registry:  http://localhost:5002"
echo "MongoDB:         mongodb://localhost:27017"
echo "Redis:           redis://localhost:6379"

# Show agent status
echo -e "\n${BLUE}🤖 Agent Status:${NC}"
echo "Checking registered agents..."

# Wait a bit more for agents to register
sleep 5

# Check agents via registry API
if curl -s http://localhost:5002/agents > /dev/null 2>&1; then
    echo "Registered agents:"
    curl -s http://localhost:5002/agents | jq '.agents[] | {agentType: .agentType, status: .status, isOnline: .isOnline}' 2>/dev/null || echo "Agents are starting up..."
else
    print_warning "Agent registry not accessible yet"
fi

# Show logs command
echo -e "\n${BLUE}📝 Useful commands:${NC}"
echo "View all logs:        docker compose logs -f"
echo "View specific logs:   docker compose logs -f [service-name]"
echo "Stop all services:    docker compose down"
echo "Restart services:     docker compose restart"
echo "Scale agents:         docker compose up -d --scale website-agent=3"

# Show system metrics
echo -e "\n${BLUE}📊 System Status:${NC}"
echo "Docker containers:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"

print_status "MCP AI Agents deployment completed successfully!"

echo -e "\n${GREEN}🎉 Your containerized AI agent system is now running!${NC}"
echo -e "${GREEN}Visit http://localhost:3000 to access the frontend${NC}"
echo -e "${GREEN}API documentation: http://localhost:5001/docs${NC}"
echo -e "${GREEN}Agent management: http://localhost:5002/agents${NC}"

# Optional: Open browser (uncomment if desired)
# if command -v open > /dev/null 2>&1; then
#     open http://localhost:3000
# elif command -v xdg-open > /dev/null 2>&1; then
#     xdg-open http://localhost:3000
# fi
