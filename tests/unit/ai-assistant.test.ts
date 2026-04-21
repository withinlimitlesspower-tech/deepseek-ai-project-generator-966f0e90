// tests/unit/ai-assistant.test.ts

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIAssistant } from '../../src/core/ai-assistant';
import { ProjectBlueprint, ConversationContext, AIResponse } from '../../src/types/ai.types';
import { ProjectType, TechStack } from '../../src/types/project.types';

// Mock dependencies
jest.mock('../../src/core/project-generator');
jest.mock('../../src/core/context-manager');
jest.mock('../../src/services/ai-integration-service');

import { ProjectGenerator } from '../../src/core/project-generator';
import { ContextManager } from '../../src/core/context-manager';
import { AIIntegrationService } from '../../src/services/ai-integration-service';

describe('AIAssistant', () => {
    let aiAssistant: AIAssistant;
    let mockProjectGenerator: jest.Mocked<ProjectGenerator>;
    let mockContextManager: jest.Mocked<ContextManager>;
    let mockAIIntegrationService: jest.Mocked<AIIntegrationService>;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create mock instances
        mockProjectGenerator = new ProjectGenerator() as jest.Mocked<ProjectGenerator>;
        mockContextManager = new ContextManager() as jest.Mocked<ContextManager>;
        mockAIIntegrationService = new AIIntegrationService() as jest.Mocked<AIIntegrationService>;

        // Initialize AIAssistant with mocked dependencies
        aiAssistant = new AIAssistant(
            mockProjectGenerator,
            mockContextManager,
            mockAIIntegrationService
        );
    });

    describe('constructor', () => {
        it('should initialize with all dependencies', () => {
            expect(aiAssistant).toBeInstanceOf(AIAssistant);
            expect(mockProjectGenerator).toBeDefined();
            expect(mockContextManager).toBeDefined();
            expect(mockAIIntegrationService).toBeDefined();
        });

        it('should throw error if dependencies are missing', () => {
            expect(() => new AIAssistant(null as any, mockContextManager, mockAIIntegrationService))
                .toThrow('ProjectGenerator is required');
            
            expect(() => new AIAssistant(mockProjectGenerator, null as any, mockAIIntegrationService))
                .toThrow('ContextManager is required');
            
            expect(() => new AIAssistant(mockProjectGenerator, mockContextManager, null as any))
                .toThrow('AIIntegrationService is required');
        });
    });

    describe('generateProject', () => {
        const mockProjectRequest = {
            name: 'Test Project',
            description: 'A test project',
            type: ProjectType.WEB_APPLICATION,
            techStack: [TechStack.TYPESCRIPT, TechStack.REACT, TechStack.NODEJS],
            requirements: ['Authentication', 'Database', 'API endpoints']
        };

        const mockBlueprint: ProjectBlueprint = {
            id: 'test-blueprint-123',
            name: 'Test Project',
            description: 'A test project',
            type: ProjectType.WEB_APPLICATION,
            techStack: [TechStack.TYPESCRIPT, TechStack.REACT, TechStack.NODEJS],
            structure: {
                root: '/test-project',
                directories: ['src', 'tests', 'config'],
                files: ['package.json', 'tsconfig.json', 'README.md']
            },
            files: [
                {
                    path: 'package.json',
                    content: '{"name": "test-project"}',
                    language: 'json'
                },
                {
                    path: 'src/index.ts',
                    content: 'console.log("Hello World");',
                    language: 'typescript'
                }
            ],
            dependencies: {
                production: ['express', 'react', 'react-dom'],
                development: ['typescript', '@types/node', 'jest']
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const mockContext: ConversationContext = {
            conversationId: 'conv-123',
            userId: 'user-456',
            history: [],
            preferences: {
                codeStyle: 'standard',
                includeTests: true,
                includeDocumentation: true
            },
            currentProject: null
        };

        it('should generate project successfully with valid request', async () => {
            // Setup mocks
            mockContextManager.getContext.mockResolvedValue(mockContext);
            mockAIIntegrationService.generateBlueprint.mockResolvedValue(mockBlueprint);
            mockProjectGenerator.generateProjectFiles.mockResolvedValue({
                success: true,
                filesGenerated: 10,
                totalSize: 2048,
                outputPath: '/projects/test-project'
            });

            // Execute
            const result = await aiAssistant.generateProject(
                'conv-123',
                'user-456',
                mockProjectRequest
            );

            // Verify
            expect(result.success).toBe(true);
            expect(result.blueprint).toEqual(mockBlueprint);
            expect(result.filesGenerated).toBe(10);
            expect(mockContextManager.getContext).toHaveBeenCalledWith('conv-123', 'user-456');
            expect(mockAIIntegrationService.generateBlueprint).toHaveBeenCalledWith(
                mockProjectRequest,
                mockContext
            );
            expect(mockProjectGenerator.generateProjectFiles).toHaveBeenCalledWith(
                mockBlueprint,
                mockContext.preferences
            );
        });

        it('should handle missing context gracefully', async () => {
            // Setup mocks
            mockContextManager.getContext.mockResolvedValue(null);

            // Execute and verify
            await expect(aiAssistant.generateProject(
                'conv-123',
                'user-456',
                mockProjectRequest
            )).rejects.toThrow('Conversation context not found');

            expect(mockAIIntegrationService.generateBlueprint).not.toHaveBeenCalled();
            expect(mockProjectGenerator.generateProjectFiles).not.toHaveBeenCalled();
        });

        it('should handle AI service errors', async () => {
            // Setup mocks
            mockContextManager.getContext.mockResolvedValue(mockContext);
            mockAIIntegrationService.generateBlueprint.mockRejectedValue(
                new Error('AI service unavailable')
            );

            // Execute and verify
            await expect(aiAssistant.generateProject(
                'conv-123',
                'user-456',
                mockProjectRequest
            )).rejects.toThrow('Failed to generate project blueprint: AI service unavailable');

            expect(mockProjectGenerator.generateProjectFiles).not.toHaveBeenCalled();
        });

        it('should handle file generation errors', async () => {
            // Setup mocks
            mockContextManager.getContext.mockResolvedValue(mockContext);
            mockAIIntegrationService.generateBlueprint.mockResolvedValue(mockBlueprint);
            mockProjectGenerator.generateProjectFiles.mockRejectedValue(
                new Error('File system error')
            );

            // Execute and verify
            await expect(aiAssistant.generateProject(
                'conv-123',
                'user-456',
                mockProjectRequest
            )).rejects.toThrow('Failed to generate project files: File system error');
        });

        it('should validate project request parameters', async () => {
            // Test missing name
            await expect(aiAssistant.generateProject(
                'conv-123',
                'user-456',
                { ...mockProjectRequest, name: '' }
            )).rejects.toThrow('Project name is required');

            // Test missing type
            await expect(aiAssistant.generateProject(
                'conv-123',
                'user-456',
                { ...mockProjectRequest, type: '' as any }
            )).rejects.toThrow('Project type is required');

            // Test empty tech stack
            await expect(aiAssistant.generateProject(
                'conv-123',
                'user-456',
                { ...mockProjectRequest, techStack: [] }
            )).rejects.toThrow('At least one technology must be specified');
        });
    });

    describe('processMessage', () => {
        const mockMessage = {
            text: 'Create a React app with TypeScript and Node.js backend',
            timestamp: new Date(),
            sender: 'user'
        };

        const mockResponse: AIResponse = {
            text: 'I\'ll help you create a React app with TypeScript and Node.js backend. What specific features do you need?',
            type: 'clarification',
            suggestions: ['Add authentication', 'Include database', 'Add API endpoints'],
            metadata: {
                intent: 'project_generation',
                confidence: 0.85,
                entities: ['react', 'typescript', 'node.js']
            }
        };

        const mockContext: ConversationContext = {
            conversationId: 'conv-123',
            userId: 'user-456',
            history: [mockMessage],
            preferences: {
                codeStyle: 'standard',
                includeTests: true,
                includeDocumentation: true
            },
            currentProject: null
        };

        it('should process message and return AI response', async () => {
            // Setup mocks
            mockContextManager.getContext.mockResolvedValue(mockContext);
            mockContextManager.updateContext.mockResolvedValue(undefined);
            mockAIIntegrationService.processMessage.mockResolvedValue(mockResponse);

            // Execute
            const result = await ai