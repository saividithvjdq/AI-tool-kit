# MechXTech Containerized AI Agents Startup Script
# Model Context Protocol (MCP) Implementation
# PowerShell Version for Windows

param(
    [switch]$Build = $false,
    [switch]$Clean = $false,
    [switch]$Logs = $false,
    [switch]$Stop = $false
)

# Helper functions
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Blue }
function Write-Header { param($Message) Write-Host "`n[START] $Message" -ForegroundColor Cyan }

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "    MechXTech Containerized AI Agents         " -ForegroundColor Green
Write-Host "    Model Context Protocol (MCP)              " -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan

# Change to the correct directory (parent directory)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$parentDir = Split-Path -Parent $scriptDir
Write-Info "Changing to MCP root directory: $parentDir"
Set-Location $parentDir

# Function to check if Docker is running
function Test-DockerRunning {
    try {
        $null = docker version 2>$null
        return $true
    }
    catch {
        return $false
    }
}

# Function to check Docker Compose availability
function Test-DockerCompose {
    try {
        $null = docker compose version 2>$null
        return $true
    }
    catch {
        try {
            $null = docker-compose version 2>$null
            return $true
        }
        catch {
            return $false
        }
    }
}

# Function to get Docker Compose command
function Get-DockerComposeCommand {
    try {
        $null = docker compose version 2>$null
        return "docker compose"
    }
    catch {
        return "docker-compose"
    }
}

# Stop containers if requested
if ($Stop) {
    Write-Warning "Stopping all MCP containers..."
    $composeCmd = Get-DockerComposeCommand
    if ($composeCmd -eq "docker compose") {
        docker compose down
    } else {
        docker-compose down
    }
    Write-Success "All containers stopped!"
    exit 0
}

# Check Docker installation
Write-Info "Checking Docker installation..."

if (-not (Test-DockerRunning)) {
    Write-Error "Docker is not running!"
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}
Write-Success "Docker is running"

if (-not (Test-DockerCompose)) {
    Write-Error "Docker Compose not found!"
    Write-Host "Please install Docker Compose and try again." -ForegroundColor Yellow
    exit 1
}

$composeCmd = Get-DockerComposeCommand
Write-Success "Found Docker Compose: $composeCmd"

# Clean up if requested
if ($Clean) {
    Write-Warning "Cleaning up existing containers and volumes..."
    if ($composeCmd -eq "docker compose") {
        docker compose down -v --remove-orphans
    } else {
        docker-compose down -v --remove-orphans
    }
    docker system prune -f
    Write-Success "Cleanup completed!"
}

# Build containers if requested
if ($Build -or $Clean) {
    Write-Header "Building MCP Agent containers..."
    if ($composeCmd -eq "docker compose") {
        docker compose build --no-cache
    } else {
        docker-compose build --no-cache
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build containers!"
        exit 1
    }
    Write-Success "Containers built successfully!"
}

# Start the MCP system
Write-Header "Starting MCP containerized system..."
if ($composeCmd -eq "docker compose") {
    docker compose up -d
} else {
    docker-compose up -d
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start MCP system!"
    Write-Host "Run with -Logs to see detailed error information" -ForegroundColor Yellow
    exit 1
}

# Wait for services to initialize
Write-Info "Waiting for services to initialize..."
Start-Sleep -Seconds 15

# Check container status
Write-Header "Checking container status..."
Write-Host "Container Status:" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

$containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=mcp-"
if ($containers) {
    $containers | ForEach-Object { Write-Host $_ -ForegroundColor White }
} else {
    Write-Warning "No MCP containers found running"
}

# Test key services
Write-Header "Testing service endpoints..."

$endpoints = @(
    @{ Name = "API Server"; Url = "http://localhost:5001/health"; Port = "5001" },
    @{ Name = "Agent Registry"; Url = "http://localhost:5002/agents"; Port = "5002" },
    @{ Name = "Frontend App"; Url = "http://localhost:3000"; Port = "3000" }
)

foreach ($endpoint in $endpoints) {
    try {
        Write-Host "Testing $($endpoint.Name) on port $($endpoint.Port)..." -ForegroundColor Gray
        $response = Invoke-WebRequest -Uri $endpoint.Url -TimeoutSec 10 -UseBasicParsing 2>$null
        
        if ($response.StatusCode -eq 200) {
            Write-Host "[ONLINE] $($endpoint.Name)" -ForegroundColor Green
        } else {
            Write-Host "[PARTIAL] $($endpoint.Name): Status $($response.StatusCode)" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[OFFLINE] $($endpoint.Name)" -ForegroundColor Red
    }
}

# Check agent registry if available
Write-Header "Checking agent status..."
try {
    $agentsResponse = Invoke-RestMethod -Uri "http://localhost:5002/agents" -TimeoutSec 5
    
    if ($agentsResponse -and $agentsResponse.agents) {
        Write-Host "`nAgent Status:" -ForegroundColor Cyan
        Write-Host "=============" -ForegroundColor Cyan
        
        $agentsResponse.agents | ForEach-Object {
            $agentName = $_.type -replace '-', ' '
            $agentName = (Get-Culture).TextInfo.ToTitleCase($agentName)
            $status = if ($_.isOnline) { "ONLINE" } else { "OFFLINE" }
            $statusColor = if ($_.isOnline) { "Green" } else { "Red" }
            
            Write-Host "  $agentName : $status" -ForegroundColor $statusColor
        }
    }
}
catch {
    Write-Warning "Could not retrieve agent status (registry may still be starting)"
}

# Display access information
Write-Host "`n[ACCESS] Service URLs:" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host "Frontend Application:    http://localhost:3000" -ForegroundColor White
Write-Host "API Server:             http://localhost:5001" -ForegroundColor White
Write-Host "Agent Registry:         http://localhost:5002/agents" -ForegroundColor White
Write-Host "MongoDB:                mongodb://localhost:27017" -ForegroundColor White
Write-Host "Redis:                  redis://localhost:6379" -ForegroundColor White

# Display usage instructions
Write-Host "`nUsage:" -ForegroundColor Yellow
Write-Host "======" -ForegroundColor Yellow
Write-Host "Stop all containers:     .\start-agents-clean.ps1 -Stop" -ForegroundColor White
Write-Host "Rebuild containers:      .\start-agents-clean.ps1 -Build" -ForegroundColor White
Write-Host "Clean rebuild:           .\start-agents-clean.ps1 -Clean -Build" -ForegroundColor White
Write-Host "View logs:               .\start-agents-clean.ps1 -Logs" -ForegroundColor White

# Show logs if requested
if ($Logs) {
    Write-Header "Showing container logs..."
    Write-Host "Press Ctrl+C to stop log viewing" -ForegroundColor Gray
    if ($composeCmd -eq "docker compose") {
        docker compose logs -f
    } else {
        docker-compose logs -f
    }
} else {
    Write-Host "`n[COMPLETE] MCP System Started Successfully!" -ForegroundColor Green
    Write-Host "Use -Logs parameter to view real-time logs" -ForegroundColor Gray
}
