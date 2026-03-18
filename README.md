<div align="center">
  <h1>AI Business Tool Kit</h1>
  <p><b>A Complete Containerized AI Agentic System using Model Context Protocol (MCP)</b></p>
  <p>Scalable, isolated microservices architecture for automated business operations.</p>
</div>

<br />

<div align="center">
  <h2>System Design Architecture</h2>
  <br />
  <table width="100%" border="1" cellpadding="15" cellspacing="0" style="border-collapse: collapse; min-width: 800px; margin: 0 auto; text-align: center;">
    <tr style="background-color: #f8f9fa;">
      <td colspan="3">
        <h3>Frontend (React UI)</h3>
        <p>User Interface • Voice Commands • Real-time Updates (Port: 3000)</p>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="border: none; padding: 20px;">⬇️ <b>REST API & WebSockets</b> ⬇️</td>
    </tr>
    <tr style="background-color: #e9ecef;">
      <td width="33%">
        <h3> API Server (Node.js)</h3>
        <p>Task Coordination & Endpoints (Port: 5001)</p>
      </td>
      <td width="33%">
        <h3> Agent Registry</h3>
        <p>MCP Coordinator & Auto Task Routing (Port: 5002)</p>
      </td>
      <td width="33%">
        <h3> Shared Infrastructure</h3>
        <p>MongoDB (27017) & Redis (6379)</p>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="border: none; padding: 20px;">⬇️ <b>Inter-Agent Communication & Task Execution</b> ⬇️</td>
    </tr>
    <tr style="background-color: #f8f9fa;">
      <td colspan="3">
        <h3> AI Agent Microservices (Isolated Containers)</h3>
        <br/>
        <b> Website Generator</b> (Landing Pages, Portfolios) <br/><br/>
        <b> Marketing Agent</b> (Email Campaigns, Social Media, Lead Gen) <br/><br/>
        <b> Image Generator</b> (AI Artwork, Logos, Banners) <br/><br/>
        <b> Analytics Agent</b> (Data Analysis, Reports, Metrics) <br/><br/>
        <b> VoiceBot Processor</b> (Speech Processing, Audio Analysis)
      </td>
    </tr>
  </table>
</div>

<br />

## 🌟 Overview
The **AI Business Tool Kit** is an advanced microservices-based application powered by the **Model Context Protocol (MCP)**. Each AI capability operates within an isolated Docker container, enabling horizontal scaling, secure task execution, and centralized orchestration via a unified Agent Registry. 

## ✨ Key Features
* **Containerized Microservices**: Isolated execution environments for AI agents, scalable via `docker-compose`.
* **Model Context Protocol (MCP)**: Centralized registry for dynamic agent discovery, task routing, and health monitoring.
* **Specialized AI Agents**: Plug-and-play agents spanning from Website Generation to Analytics and Voice Processing.
* **Real-time Engine**: Redis-backed inter-agent queues and web-sockets for real-time frontend updates.

## 🚀 Getting Started

### Prerequisites
* **Docker** (v20.10+) and **Docker Compose**
* **Node.js** (v18+) for local UI/backend development

### Quick Start
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd AI_Business_Application
   ```

2. **Boot the entire system:**
   * **Windows:**
     ```powershell
     .\start-agents.ps1
     ```
   * **Linux/Mac:**
     ```bash
     chmod +x start-agents.sh
     ./start-agents.sh
     ```

3. **Access the application:**
   * **Frontend Application:** [http://localhost:3000](http://localhost:3000)
   * **API Gateway:** [http://localhost:5001](http://localhost:5001)
   * **MCP Agent Registry:** [http://localhost:5002/agents](http://localhost:5002/agents)

## 🐳 Core Services Breakdown

| Service | Architecture Role | Description |
|---------|------------------|-------------|
| `mcp-ai-agents-frontend` | **Client (React)** | User-facing dashboard handling voice & data visualizations. |
| `mcp-ai-agents-api` | **Gateway (Express)** | Core API gateway parsing incoming UX requests. |
| `agent-registry` | **Coordinator** | Tracks agent health and dynamically routes AI tasks. |
| `website-agent` | **Worker Container** | Generates dynamic landing pages and portfolios. |
| `marketing-agent` | **Worker Container** | Automates social media creation and lead generation logic. |
| `image-agent` | **Worker Container** | Offloads visual generation tasks (logos, banners). |
| `analytics-agent` | **Worker Container** | Processes metrics and outputs actionable business insights. |

## 🛡️ Security & Performance
* **Security Hardening**: Non-root containers, security headers, input validation, rate limiting.
* **Load Management**: Nginx reverse proxy, auto-restarting services on failure, strict CPU/Memory resource constraints per agent.
* **Queue Optimization**: High-throughput Redis caching ensuring sub-second inter-server task routing.

## 🤝 Extending the System / Custom Agents
To extend the application's capabilities, developers can plug in custom agents:
1. Initialize logic in `agents/[AgentName]Agent.js`.
2. Define isolated dependencies in `Dockerfile.[AgentName]`.
3. Link the service inside `docker-compose.yml` (and scaling configs) to the `agent-registry` instance.

---
<div align="center">
  <i>Empowering Businesses with Scalable AI Capabilities.</i>
</div>
