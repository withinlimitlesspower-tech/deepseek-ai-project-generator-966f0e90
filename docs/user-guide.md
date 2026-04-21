# AI Project Generator V5.5 - User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Quick Start](#quick-start)
3. [Core Features](#core-features)
4. [Project Generation](#project-generation)
5. [Conversation System](#conversation-system)
6. [API Reference](#api-reference)
7. [CLI Usage](#cli-usage)
8. [Web Interface](#web-interface)
9. [Configuration](#configuration)
10. [Deployment](#deployment)
11. [Troubleshooting](#troubleshooting)
12. [FAQ](#faq)

## Introduction

Welcome to AI Project Generator V5.5, a powerful tool that combines conversational AI with complete project generation capabilities. This system allows you to describe your project requirements in natural language and receive fully functional, production-ready code.

### Key Capabilities
- **Natural Language Processing**: Describe projects in plain English
- **Full-Stack Generation**: Complete projects with frontend, backend, and database
- **Context Awareness**: Remembers conversation history and project context
- **Blueprint Preview**: See project structure before generation
- **Multiple Output Formats**: CLI, Web Interface, and API access

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- Docker (optional, for containerized deployment)

### Installation

# Clone the repository
git clone https://github.com/your-org/ai-project-generator.git
cd ai-project-generator

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the development server
npm run dev

# Or use Docker
docker-compose up

### Your First Project

**Using CLI:**
# Start interactive mode
npm run cli

# Or use direct command
npm run generate -- --type="web-app" --name="MyTodoApp" --description="A simple todo application"

**Using Web Interface:**
1. Open `http://localhost:3000` in your browser
2. Click "New Project"
3. Describe your project requirements
4. Review the blueprint
5. Generate and download

## Core Features

### 1. Project Generation
The system can generate complete projects including:
- Backend API with Express.js/Node.js
- Frontend with React/TypeScript
- Database models and migrations
- Docker configuration
- Testing setup
- Documentation

### 2. Conversation System
- Maintains context across multiple interactions
- Understands technical requirements
- Provides suggestions and alternatives
- Learns from user preferences

### 3. Blueprint System
Before generating code, the system shows:
- Project structure
- Technology stack
- File organization
- Dependencies
- Architecture diagram

### 4. Validation & Quality
- Code linting and formatting
- Type safety with TypeScript
- Security best practices
- Performance optimizations
- Error handling patterns

## Project Generation

### Project Types
The system supports various project types:

1. **Web Application** (`web-app`)
   - Full-stack web applications
   - REST APIs
   - Authentication systems
   - Database integration

2. **API Service** (`api-service`)
   - Microservices
   - GraphQL APIs
   - WebSocket servers
   - Background workers

3. **Library/Package** (`library`)
   - NPM packages
   - TypeScript libraries
   - Utility modules
   - Plugin systems

4. **CLI Tool** (`cli-tool`)
   - Command-line interfaces
   - Interactive prompts
   - File system operations
   - External command execution

### Generation Process

1. **Requirement Analysis**
      // Example requirement
   const requirements = {
     type: "web-app",
     name: "ECommercePlatform",
     description: "A full-featured e-commerce platform with user accounts, product catalog, shopping cart, and payment processing",
     technologies: ["React", "Node.js", "PostgreSQL", "Redis"],
     features: ["User authentication", "Product search", "Order management", "Payment integration"]
   };
   
2. **Blueprint Creation**
   - Architecture design
   - Technology selection
   - File structure planning
   - Dependency mapping

3. **Code Generation**
   - Template-based generation
   - Custom logic injection
   - Configuration setup
   - Documentation creation

4. **Validation & Testing**
   - Syntax validation
   - Type checking
   - Test generation
   - Security audit

### Custom Templates
Create custom templates in `templates/` directory:

# templates/custom-web-app/template.yaml
name: "Custom Web App"
description: "My custom web application template"
structure:
  - src/
    - components/
    - pages/
    - services/
  - public/
  - tests/
dependencies:
  - react
  - react-router-dom
  - axios
scripts:
  start: "react-scripts start"
  build: "react-scripts build"
  test: "react-scripts test"

## Conversation System

### Starting a Conversation

**CLI:**
npm run chat
# or
npm run cli -- --mode=chat

**API:**
curl -X POST http://localhost:3000/api/conversation/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "context": "web-development"}'

### Conversation Context
The system maintains context including:
- User preferences
- Previous projects
- Technical constraints
- Business requirements

### Example Conversation Flow

User: I need a blog platform with user authentication
AI: I'll help you create a blog platform. What features do you need?
User: User registration, post creation, comments, and search
AI: Great. Which database would you prefer?
User: PostgreSQL
AI: Perfect. Here's the blueprint for your blog platform...

### Context Management
// Example context object
const context = {
  userId: "user123",
  sessionId: "session456",
  history: [
    { role: "user", content: "I need a todo app" },
    { role: "assistant", content: "What features?" }
  ],
  preferences: {
    language: "TypeScript",
    framework: "React",
    database: "PostgreSQL"
  },
  constraints: {
    budget: "free",
    timeline: "1 week",
    teamSize: "solo"
  }
};

## API Reference

### Base URL
http://localhost:3000/api

### Authentication
All endpoints require an API key:
curl -H "X-API-Key: your-api-key" ...

### Endpoints

#### 1. Project Generation

**Start Project Generation**
POST /projects/generate
Content-Type: application/json

{
  "name": "ProjectName",
  "type": "web-app",
  "description": "Project description",
  "requirements": ["feature1", "feature2"],
  "technologies": ["React", "Node.js"],
  "userId": "optional-user-id"
}

Response:
{
  "projectId": "proj_123",
  "status": "generating",
  "blueprint": { /* blueprint data */ },
  "estimatedTime": 30
}

**Get Project Status**
GET /projects/{projectId}/status

**Download Project**
GET /projects/{projectId}/download

#### 2. Conversation Management

**Start Conversation**
POST /conversation/start
Content-Type: application/json

{
  "userId": "user123",
  "context": "web-development",
  "initialMessage": "Hello, I need help with a project"
}

**Send Message**
POST /conversation/{conversationId}/message
Content-Type: application/json

{
  "message": "Can you add authentication to my project?",
  "context": { /* optional context update */ }
}

**Get Conversation History**
GET /conversation/{conversationId}/history

#### 3. System Management

**Health Check**
GET /health

**Get System Info**
GET /system/info

**Update Configuration**
PUT /system/config
Content-Type: application/json

{
  "setting": "value",
  "templatePath": "/custom/templates"
}

### WebSocket API
For real-time updates:

const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'project-updates',
    projectId: 'proj_123'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};

## CLI Usage

### Installation
npm install -g ai-project-generator
# or
npx ai-project-generator

### Commands

#### Generate Command
# Basic generation
ai-gen generate --name="MyApp" --type="web-app"

# With specific requirements
ai-gen generate \