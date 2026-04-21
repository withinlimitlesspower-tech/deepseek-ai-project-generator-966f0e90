import request from 'supertest';
import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { Server } from 'http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../src/app';
import { Project } from '../../src/database/models/project-model';
import { Conversation } from '../../src/database/models/conversation-model';
import { generateTestToken } from '../utils/test-helpers';

describe('End-to-End Workflow Tests', () => {
  let server: Server;
  let mongoServer: MongoMemoryServer;
  let authToken: string;
  let projectId: string;
  let conversationId: string;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // Connect to test database
    await mongoose.connect(mongoUri);
    
    // Start Express server
    server = app.listen(0);
    
    // Generate test authentication token
    authToken = generateTestToken({
      userId: 'test-user-123',
      email: 'test@example.com'
    });
  });

  afterAll(async () => {
    // Cleanup
    await mongoose.connection.close();
    await mongoServer.stop();
    server.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await Project.deleteMany({});
    await Conversation.deleteMany({});
  });

  describe('Complete Project Generation Workflow', () => {
    it('should complete full project generation workflow', async () => {
      // Step 1: Start a conversation
      const conversationResponse = await request(server)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I want to create a React TypeScript project with authentication',
          context: {
            projectType: 'web-application',
            techStack: ['react', 'typescript', 'nodejs'],
            requirements: ['authentication', 'database', 'api']
          }
        })
        .expect(201);

      conversationId = conversationResponse.body.data._id;
      expect(conversationResponse.body.success).toBe(true);
      expect(conversationResponse.body.data.messages).toHaveLength(1);

      // Step 2: Create a project based on conversation
      const projectResponse = await request(server)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'React Auth App',
          description: 'A React application with authentication system',
          conversationId: conversationId,
          techStack: ['react', 'typescript', 'express', 'mongodb'],
          features: ['user-auth', 'protected-routes', 'api-integration']
        })
        .expect(201);

      projectId = projectResponse.body.data._id;
      expect(projectResponse.body.success).toBe(true);
      expect(projectResponse.body.data.status).toBe('initialized');

      // Step 3: Generate project blueprint
      const blueprintResponse = await request(server)
        .post(`/api/projects/${projectId}/generate-blueprint`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          detailed: true,
          includeTests: true,
          includeDocumentation: true
        })
        .expect(200);

      expect(blueprintResponse.body.success).toBe(true);
      expect(blueprintResponse.body.data.blueprint).toBeDefined();
      expect(blueprintResponse.body.data.blueprint.components).toBeDefined();

      // Step 4: Generate project files
      const generateResponse = await request(server)
        .post(`/api/projects/${projectId}/generate-files`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          overwrite: false,
          validateSyntax: true
        })
        .expect(200);

      expect(generateResponse.body.success).toBe(true);
      expect(generateResponse.body.data.generatedFiles).toBeGreaterThan(0);
      expect(generateResponse.body.data.projectStatus).toBe('files_generated');

      // Step 5: Verify project structure
      const projectDetails = await request(server)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(projectDetails.body.success).toBe(true);
      expect(projectDetails.body.data.status).toBe('files_generated');
      expect(projectDetails.body.data.fileStructure).toBeDefined();

      // Step 6: Continue conversation with project context
      const followupResponse = await request(server)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Add a dashboard component to the project',
          projectId: projectId
        })
        .expect(200);

      expect(followupResponse.body.success).toBe(true);
      expect(followupResponse.body.data.messages).toHaveLength(2);

      // Step 7: Update project with new requirements
      const updateResponse = await request(server)
        .patch(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          features: ['user-auth', 'protected-routes', 'api-integration', 'dashboard'],
          updatedRequirements: ['Add dashboard with analytics']
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.features).toContain('dashboard');

      // Step 8: Regenerate updated files
      const regenerateResponse = await request(server)
        .post(`/api/projects/${projectId}/regenerate-files`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          components: ['Dashboard', 'AnalyticsChart'],
          updateOnly: true
        })
        .expect(200);

      expect(regenerateResponse.body.success).toBe(true);
      expect(regenerateResponse.body.data.updatedFiles).toBeGreaterThan(0);

      // Step 9: Export project
      const exportResponse = await request(server)
        .get(`/api/projects/${projectId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(exportResponse.body.success).toBe(true);
      expect(exportResponse.body.data.downloadUrl).toBeDefined();
      expect(exportResponse.body.data.zipSize).toBeGreaterThan(0);

      // Step 10: Verify final state
      const finalProject = await Project.findById(projectId);
      expect(finalProject).toBeDefined();
      expect(finalProject?.status).toBe('completed');
      expect(finalProject?.generatedFiles).toBeGreaterThan(0);
      expect(finalProject?.lastGeneratedAt).toBeDefined();
    });

    it('should handle workflow with validation errors', async () => {
      // Test invalid project creation
      const invalidProjectResponse = await request(server)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Invalid: empty name
          description: 'Test project'
        })
        .expect(400);

      expect(invalidProjectResponse.body.success).toBe(false);
      expect(invalidProjectResponse.body.error).toBeDefined();
    });

    it('should handle concurrent project operations', async () => {
      // Create multiple projects simultaneously
      const projectPromises = Array(3).fill(null).map((_, index) =>
        request(server)
          .post('/api/projects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Concurrent Project ${index + 1}`,
            description: `Test concurrent project ${index + 1}`,
            techStack: ['react', 'typescript']
          })
      );

      const responses = await Promise.all(projectPromises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all projects were created
      const projects = await Project.find({});
      expect(projects).toHaveLength(3);
    });

    it('should maintain conversation context throughout workflow', async () => {
      // Start conversation
      const conversationRes = await request(server)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Build a task management app',
          context: { domain: 'productivity' }
        });

      const convId = conversationRes.body.data._id;

      // Add multiple messages with context
      const messages = [
        'I need user authentication',
        'Add task categories',
        'Include due date reminders'
      ];

      for (const message of messages) {
        await request(server)
          .post(`/api/conversations/${convId}/messages`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ message });
      }

      // Get conversation history
      const historyRes = await request(server)
        .get(`/api/conversations/${convId}`)
        .