// tests/integration/api.test.ts
import request from 'supertest';
import { Express } from 'express';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../../src/index';
import { Project } from '../../src/database/models/project-model';
import { Conversation } from '../../src/database/models/conversation-model';

describe('API Integration Tests', () => {
  let app: Express;
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let testProjectId: string;
  let testConversationId: string;

  // Test user credentials
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPass123!'
  };

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to test database
    await mongoose.connect(mongoUri);
    
    // Create app instance
    app = createApp();
    
    // Register test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(registerResponse.status).toBe(201);
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toHaveProperty('token');
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear database before each test
    await Project.deleteMany({});
    await Conversation.deleteMany({});
  });

  describe('Authentication Endpoints', () => {
    it('should register a new user', async () => {
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'NewPass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('userId');
    });

    it('should login existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('Project Endpoints', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'A test project for integration testing',
        type: 'web-application',
        framework: 'react',
        language: 'typescript'
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('name', projectData.name);
      expect(response.body).toHaveProperty('description', projectData.description);
      expect(response.body).toHaveProperty('status', 'draft');
      expect(response.body).toHaveProperty('createdBy');

      testProjectId = response.body._id;
    });

    it('should get all projects for user', async () => {
      // Create multiple projects first
      await Project.create([
        {
          name: 'Project 1',
          description: 'First project',
          type: 'web-application',
          createdBy: new mongoose.Types.ObjectId()
        },
        {
          name: 'Project 2',
          description: 'Second project',
          type: 'cli-tool',
          createdBy: new mongoose.Types.ObjectId()
        }
      ]);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should get a specific project by ID', async () => {
      const project = await Project.create({
        name: 'Specific Project',
        description: 'Project to retrieve',
        type: 'web-application',
        createdBy: new mongoose.Types.ObjectId()
      });

      const response = await request(app)
        .get(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', project._id.toString());
      expect(response.body).toHaveProperty('name', 'Specific Project');
    });

    it('should update a project', async () => {
      const project = await Project.create({
        name: 'Original Project',
        description: 'Original description',
        type: 'web-application',
        createdBy: new mongoose.Types.ObjectId()
      });

      const updateData = {
        name: 'Updated Project',
        description: 'Updated description',
        status: 'generating'
      };

      const response = await request(app)
        .put(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('description', updateData.description);
      expect(response.body).toHaveProperty('status', updateData.status);
    });

    it('should delete a project', async () => {
      const project = await Project.create({
        name: 'Project to Delete',
        description: 'Will be deleted',
        type: 'web-application',
        createdBy: new mongoose.Types.ObjectId()
      });

      const response = await request(app)
        .delete(`/api/projects/${project._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Project deleted successfully');

      // Verify deletion
      const deletedProject = await Project.findById(project._id);
      expect(deletedProject).toBeNull();
    });

    it('should generate project blueprint', async () => {
      const project = await Project.create({
        name: 'Blueprint Project',
        description: 'Project for blueprint generation',
        type: 'web-application',
        framework: 'react',
        language: 'typescript',
        createdBy: new mongoose.Types.ObjectId()
      });

      const response = await request(app)
        .post(`/api/projects/${project._id}/blueprint`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          requirements: 'Create a todo app with React and TypeScript'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('blueprint');
      expect(response.body.blueprint).toHaveProperty('structure');
      expect(response.body.blueprint).toHaveProperty('files');
      expect(Array.isArray(response.body.blueprint.files)).toBe(true);
    });

    it('should generate project files', async () => {
      const project = await Project.create({
        name: 'File Generation Project',
        description: 'Project for file generation',
        type: 'web-application',
        framework: 'react',
        language: 'typescript',
        blueprint: {
          structure: {
            name: 'todo-app',
            type: 'react-typescript',
            version: '1.0.0'
          },
          files: [
            {
              path: 'src/index.tsx',
              content: '// Main entry point',
              type: 'typescript'
            }
          ]
        },
        createdBy: new mongoose.Types.ObjectId()
      });

      const response = await request(app)
        .post(`/api/projects/${project._id}/generate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Project files generated successfully');
      expect(response.body).toHaveProperty('files');
      expect(Array.isArray(response.body.files)).toBe(true);
      expect(response.body.files.length).toBeGreaterThan(0);