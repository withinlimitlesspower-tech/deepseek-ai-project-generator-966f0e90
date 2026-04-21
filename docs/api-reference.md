# AI Project Generator V5.5 - API Reference

## Overview

The AI Project Generator V5.5 provides a comprehensive REST API for generating complete software projects, managing conversations, and integrating with AI models. This API is built with TypeScript, Express.js, and follows RESTful principles.

## Base URL

http://localhost:3000/api/v1

## Authentication

Most endpoints require authentication via API key. Include the API key in the request headers:

X-API-Key: your-api-key-here

## Rate Limiting

- **Standard Users**: 100 requests per hour
- **Premium Users**: 1000 requests per hour
- **Admin Users**: 5000 requests per hour

## Error Handling

All errors follow this format:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}

## Common HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

---

## Project Endpoints

### Create a New Project

Creates a new project with the specified configuration.

**Endpoint:** `POST /projects`

**Headers:**
- `Content-Type: application/json`
- `X-API-Key: your-api-key`

**Request Body:**
{
  "name": "My Awesome Project",
  "description": "A full-stack web application",
  "type": "web-application",
  "stack": ["react", "nodejs", "mongodb"],
  "complexity": "intermediate",
  "features": ["authentication", "real-time", "file-upload"],
  "preferences": {
    "language": "typescript",
    "framework": "express",
    "database": "mongodb",
    "testing": "jest"
  },
  "metadata": {
    "targetAudience": "developers",
    "deployment": "docker"
  }
}

**Response (201 Created):**
{
  "success": true,
  "data": {
    "project": {
      "id": "project_123456789",
      "name": "My Awesome Project",
      "description": "A full-stack web application",
      "type": "web-application",
      "status": "generating",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "estimatedCompletion": "2024-01-01T00:05:00.000Z"
    },
    "blueprint": {
      "id": "blueprint_123456789",
      "structure": {
        "frontend": ["src/components", "src/pages", "src/hooks"],
        "backend": ["src/api", "src/services", "src/middleware"],
        "database": ["src/models", "src/migrations"],
        "tests": ["tests/unit", "tests/integration", "tests/e2e"]
      },
      "technologies": ["React 18", "Node.js 20", "MongoDB 7"],
      "estimatedFiles": 45,
      "estimatedTime": "5 minutes"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}

**Possible Errors:**
- `400`: Invalid request body
- `401`: Missing or invalid API key
- `429`: Rate limit exceeded
- `500`: Internal server error

### Get Project by ID

Retrieves a specific project by its ID.

**Endpoint:** `GET /projects/:projectId`

**Headers:**
- `X-API-Key: your-api-key`

**Path Parameters:**
- `projectId` (string, required): The ID of the project to retrieve

**Response (200 OK):**
{
  "success": true,
  "data": {
    "id": "project_123456789",
    "name": "My Awesome Project",
    "description": "A full-stack web application",
    "type": "web-application",
    "status": "completed",
    "stack": ["react", "nodejs", "mongodb"],
    "complexity": "intermediate",
    "features": ["authentication", "real-time", "file-upload"],
    "preferences": {
      "language": "typescript",
      "framework": "express",
      "database": "mongodb",
      "testing": "jest"
    },
    "files": [
      {
        "path": "package.json",
        "size": 1024,
        "type": "config"
      },
      {
        "path": "src/index.ts",
        "size": 2048,
        "type": "source"
      }
    ],
    "generatedAt": "2024-01-01T00:05:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:05:00.000Z"
  },
  "timestamp": "2024-01-01T00:06:00.000Z"
}

**Possible Errors:**
- `401`: Missing or invalid API key
- `403`: Project belongs to another user
- `404`: Project not found
- `500`: Internal server error

### List All Projects

Retrieves a paginated list of projects for the authenticated user.

**Endpoint:** `GET /projects`

**Headers:**
- `X-API-Key: your-api-key`

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20, max: 100)
- `status` (string, optional): Filter by status (generating, completed, failed)
- `type` (string, optional): Filter by project type
- `sortBy` (string, optional): Sort field (createdAt, updatedAt, name)
- `sortOrder` (string, optional): Sort order (asc, desc)

**Response (200 OK):**
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "project_123456789",
        "name": "My Awesome Project",
        "description": "A full-stack web application",
        "type": "web-application",
        "status": "completed",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:05:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "pages": 1
    }
  },
  "timestamp": "2024-01-01T00:06:00.000Z"
}

**Possible Errors:**
- `401`: Missing or invalid API key
- `400`: Invalid query parameters
- `500`: Internal server error

### Update Project

Updates an existing project's metadata.

**Endpoint:** `PATCH /projects/:projectId`

**Headers:**
- `Content-Type: application/json`
- `X-API-Key: your-api-key`

**Path Parameters:**
- `projectId` (string, required): The ID of the project to update

**Request Body:**
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "metadata": {
    "notes": "Additional project notes"
  }
}

**Response (200 OK):**
{
  "success": true,
  "data": {
    "id": "project_123456789",
    "name": "Updated Project Name",
    "description": "Updated description",
    "updatedAt": "2024-01-01T00:07:00.000Z"
  },
  "timestamp": "2024-01-01T00:07:00.000Z"
}

**Possible Errors:**
- `400`: Invalid request body
- `401`: Missing or invalid API key
- `403`: Project belongs to another user
- `404`: Project not found
- `500`: Internal server error

### Delete Project

Deletes a project and all associated files.

**Endpoint:** `DELETE /projects/:projectId`

**Headers:**
- `X-API-Key: your-api-key`

**Path Parameters:**
- `projectId` (string, required): The ID of the project to delete

**Response (200 OK):**
{
  "success": true,
  "data": {
    "message": "Project deleted successfully",
    "projectId": "project_123456789"
  },
  "timestamp": "2024-01-01T