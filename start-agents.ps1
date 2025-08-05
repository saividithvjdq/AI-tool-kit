# MCP AI Agents function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Header { param($Message) Write-Host "`n[START] $Message" -ForegroundColor Cyan }tainerized Deployment Script (PowerShell)
# This script builds and starts the complete containerized AI agent system

param(
    [switch]$Build = $false,
    [switch]$Stop = $false,
    [switch]$Restart = $false,
    [switch]$Status = $false,
    [switch]$Logs = $false
)

# Configuration
$ProjectName = "mcp-ai-agents"
$NetworkName = "mcp-network"

# Colors for output
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Blue }
function Write-Header { param($Message) Write-Host "`n🚀 $Message" -ForegroundColor Cyan }

Write-Header "MCP AI Agents - Containerized Deployment"
Write-Host "=========================================" -ForegroundColor Cyan

# Handle different operations
if ($Stop) {
    Write-Header "Stopping all services..."
    docker compose down
    Write-Success "All services stopped"
    exit 0
}

if ($Restart) {
    Write-Header "Restarting all services..."
    docker compose restart
    Write-Success "All services restarted"
    exit 0
}

if ($Status) {
    Write-Header "Service Status"
    docker compose ps
    Write-Host "`n[STATS] Container Stats:" -ForegroundColor Blue
    docker stats --no-stream --format "table {{.Name}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.MemPerc}}`t{{.NetIO}}`t{{.BlockIO}}"
    exit 0
}

if ($Logs) {
    Write-Header "Showing logs for all services..."
    docker compose logs -f
    exit 0
}

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Success "Docker is running"
}
catch {
    Write-Error "Docker is not running. Please start Docker first."
    exit 1
}

# Check if Docker Compose is available
try {
    docker compose version | Out-Null
    Write-Success "Docker Compose is available"
}
catch {
    Write-Error "Docker Compose is not available. Please install Docker Compose."
    exit 1
}

# Create Docker network if it doesn't exist
$networkExists = docker network ls --format "{{.Name}}" | Where-Object { $_ -eq $NetworkName }
if (-not $networkExists) {
    Write-Info "Creating Docker network: $NetworkName"
    docker network create $NetworkName
    Write-Success "Created Docker network: $NetworkName"
}
else {
    Write-Success "Docker network $NetworkName already exists"
}

# Build images if requested or if this is first run
if ($Build -or -not (docker images --format "{{.Repository}}" | Where-Object { $_ -like "*$ProjectName*" })) {
    Write-Header "Building Docker images..."
    
    Write-Info "Building agent registry image..."
    docker build -f agents/Dockerfile.registry -t "${ProjectName}-registry:latest" ./agents/
    
    Write-Info "Building website generator agent..."
    docker build -f agents/Dockerfile.website -t "${ProjectName}-website:latest" ./agents/
    
    Write-Info "Building marketing automation agent..."
    docker build -f agents/Dockerfile.marketing -t "${ProjectName}-marketing:latest" ./agents/
    
    Write-Info "Building image generator agent..."
    docker build -f agents/Dockerfile.image -t "${ProjectName}-image:latest" ./agents/
    
    Write-Info "Building analytics processor agent..."
    docker build -f agents/Dockerfile.analytics -t "${ProjectName}-analytics:latest" ./agents/
    
    Write-Info "Building voice bot processor agent..."
    docker build -f agents/Dockerfile.voicebot -t "${ProjectName}-voicebot:latest" ./agents/
    
    Write-Info "Building frontend image..."
    docker build -f Dockerfile.frontend -t "${ProjectName}-frontend:latest" .
    
    Write-Info "Building API server image..."
    docker build -f Dockerfile -t "${ProjectName}-api:latest" .
    
    Write-Success "All Docker images built successfully"
}

# Start the services
Write-Header "Starting containerized services..."
docker compose up -d
Write-Success "All services started"

# Wait for services to be healthy
Write-Header "Checking service health..."

function Test-ServiceHealth {
    param($ServiceName, $Port, $MaxAttempts = 30)
    
    Write-Info "Checking $ServiceName health on port $Port..."
    
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                Write-Success "$ServiceName is healthy"
                return $true
            }
        }
        catch {
            # Service not ready yet
        }
        
        Write-Info "Attempt $attempt/$MaxAttempts - $ServiceName not ready yet..."
        Start-Sleep -Seconds 2
    }
    
    Write-Warning "$ServiceName health check timed out"
    return $false
}

# Wait a bit for services to start
Start-Sleep -Seconds 10

# Check service health
Test-ServiceHealth "API Server" 5001
Test-ServiceHealth "Agent Registry" 5002
Test-ServiceHealth "Frontend" 3000

# Show running containers
Write-Header "Running containers:"
docker compose ps

# Show service URLs
Write-Host "`n[ACCESS] Service URLs:" -ForegroundColor Green
Write-Host "Frontend:        http://localhost:3000" -ForegroundColor White
Write-Host "API Server:      http://localhost:5001" -ForegroundColor White
Write-Host "Agent Registry:  http://localhost:5002" -ForegroundColor White
Write-Host "MongoDB:         mongodb://localhost:27017" -ForegroundColor White
Write-Host "Redis:           redis://localhost:6379" -ForegroundColor White

# Show agent status
Write-Header "Agent Status:"
Write-Info "Checking registered agents..."

# Wait a bit more for agents to register
Start-Sleep -Seconds 5

# Check agents via registry API
try {
    $agentsResponse = Invoke-RestMethod -Uri "http://localhost:5002/agents" -UseBasicParsing -ErrorAction Stop
    Write-Host "Registered agents:" -ForegroundColor Green
    $agentsResponse.agents | ForEach-Object {
        $status = if ($_.isOnline) { "[ONLINE]" } else { "[OFFLINE]" }
        Write-Host "  - $($_.agentType): $status" -ForegroundColor White
    }
}
catch {
    Write-Warning "Agent registry not accessible yet - agents are starting up..."
}

# Show useful commands
Write-Header "Useful commands:"
Write-Host "View all logs:        docker compose logs -f" -ForegroundColor White
Write-Host "View specific logs:   docker compose logs -f [service-name]" -ForegroundColor White
Write-Host "Stop all services:    docker compose down" -ForegroundColor White
Write-Host "Restart services:     docker compose restart" -ForegroundColor White
Write-Host "Scale agents:         docker compose up -d --scale website-agent=3" -ForegroundColor White
Write-Host "PowerShell commands:" -ForegroundColor Yellow
Write-Host "  .\start-agents.ps1 -Stop     # Stop all services" -ForegroundColor White
Write-Host "  .\start-agents.ps1 -Restart  # Restart all services" -ForegroundColor White
Write-Host "  .\start-agents.ps1 -Status   # Show status" -ForegroundColor White
Write-Host "  .\start-agents.ps1 -Logs     # Show logs" -ForegroundColor White
Write-Host "  .\start-agents.ps1 -Build    # Rebuild images" -ForegroundColor White

# Show system metrics
Write-Header "System Status:"
Write-Host "Docker containers:" -ForegroundColor Blue
docker stats --no-stream --format "table {{.Name}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.MemPerc}}`t{{.NetIO}}`t{{.BlockIO}}"

Write-Success "MCP AI Agents deployment completed successfully!"

Write-Host "`n[COMPLETE] Your containerized AI agent system is now running!" -ForegroundColor Green
Write-Host "Visit http://localhost:3000 to access the frontend" -ForegroundColor Green
Write-Host "API documentation: http://localhost:5001/docs" -ForegroundColor Green
Write-Host "Agent management: http://localhost:5002/agents" -ForegroundColor Green

# Optional: Open browser
$openBrowser = Read-Host "`nWould you like to open the frontend in your browser? (y/N)"
if ($openBrowser -eq 'y' -or $openBrowser -eq 'Y') {
    Start-Process "http://localhost:3000"
}
