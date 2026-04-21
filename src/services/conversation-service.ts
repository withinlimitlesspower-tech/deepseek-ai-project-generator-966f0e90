import { Conversation, ConversationMessage, Project } from '../types/ai.types';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database-service';
import { ValidationService } from './validation-service';
import { Logger } from '../utils/logger';

export class ConversationService {
  private dbService: DatabaseService;
  private validationService: ValidationService;
  private logger: Logger;

  constructor() {
    this.dbService = new DatabaseService();
    this.validationService = new ValidationService();
    this.logger = new Logger('ConversationService');
  }

  /**
   * Create a new conversation for a project
   * @param projectId - The project ID
   * @param userId - The user ID
   * @param initialMessage - Optional initial message
   * @returns The created conversation
   */
  async createConversation(
    projectId: string,
    userId: string,
    initialMessage?: string
  ): Promise<Conversation> {
    try {
      // Validate inputs
      this.validationService.validateUUID(projectId, 'projectId');
      this.validationService.validateUUID(userId, 'userId');

      // Check if project exists
      const project = await this.dbService.getProjectById(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Check if user has access to project
      if (project.userId !== userId) {
        throw new Error('User does not have access to this project');
      }

      // Create conversation
      const conversation: Conversation = {
        id: uuidv4(),
        projectId,
        userId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        metadata: {
          projectName: project.name,
          projectType: project.type,
          totalMessages: 0
        }
      };

      // Add initial message if provided
      if (initialMessage) {
        const message: ConversationMessage = {
          id: uuidv4(),
          conversationId: conversation.id,
          content: initialMessage,
          role: 'user',
          timestamp: new Date(),
          metadata: {
            tokens: this.estimateTokens(initialMessage),
            isSystemMessage: false
          }
        };
        conversation.messages.push(message);
        conversation.metadata.totalMessages = 1;
      }

      // Save to database
      await this.dbService.saveConversation(conversation);

      this.logger.info(`Created conversation ${conversation.id} for project ${projectId}`);
      return conversation;
    } catch (error) {
      this.logger.error('Failed to create conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation by ID
   * @param conversationId - The conversation ID
   * @param userId - The user ID for authorization
   * @returns The conversation
   */
  async getConversation(conversationId: string, userId: string): Promise<Conversation> {
    try {
      // Validate inputs
      this.validationService.validateUUID(conversationId, 'conversationId');
      this.validationService.validateUUID(userId, 'userId');

      // Get conversation
      const conversation = await this.dbService.getConversationById(conversationId);
      if (!conversation) {
        throw new Error(`Conversation with ID ${conversationId} not found`);
      }

      // Check authorization
      if (conversation.userId !== userId) {
        throw new Error('Unauthorized access to conversation');
      }

      return conversation;
    } catch (error) {
      this.logger.error('Failed to get conversation:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for a project
   * @param projectId - The project ID
   * @param userId - The user ID for authorization
   * @returns Array of conversations
   */
  async getProjectConversations(projectId: string, userId: string): Promise<Conversation[]> {
    try {
      // Validate inputs
      this.validationService.validateUUID(projectId, 'projectId');
      this.validationService.validateUUID(userId, 'userId');

      // Check if project exists and user has access
      const project = await this.dbService.getProjectById(projectId);
      if (!project) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      if (project.userId !== userId) {
        throw new Error('User does not have access to this project');
      }

      // Get conversations
      const conversations = await this.dbService.getConversationsByProjectId(projectId);

      // Sort by updatedAt (newest first)
      return conversations.sort((a, b) => 
        b.updatedAt.getTime() - a.updatedAt.getTime()
      );
    } catch (error) {
      this.logger.error('Failed to get project conversations:', error);
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   * @param conversationId - The conversation ID
   * @param userId - The user ID
   * @param content - The message content
   * @param role - The message role (user/assistant)
   * @returns The updated conversation
   */
  async addMessage(
    conversationId: string,
    userId: string,
    content: string,
    role: 'user' | 'assistant' = 'user'
  ): Promise<Conversation> {
    try {
      // Validate inputs
      this.validationService.validateUUID(conversationId, 'conversationId');
      this.validationService.validateUUID(userId, 'userId');
      this.validationService.validateString(content, 'content', 1, 5000);

      // Get conversation
      const conversation = await this.getConversation(conversationId, userId);
      
      if (!conversation.isActive) {
        throw new Error('Cannot add message to inactive conversation');
      }

      // Create message
      const message: ConversationMessage = {
        id: uuidv4(),
        conversationId,
        content,
        role,
        timestamp: new Date(),
        metadata: {
          tokens: this.estimateTokens(content),
          isSystemMessage: false
        }
      };

      // Add message to conversation
      conversation.messages.push(message);
      conversation.updatedAt = new Date();
      conversation.metadata.totalMessages = conversation.messages.length;

      // Save to database
      await this.dbService.saveConversation(conversation);

      this.logger.info(`Added message to conversation ${conversationId}`);
      return conversation;
    } catch (error) {
      this.logger.error('Failed to add message:', error);
      throw error;
    }
  }

  /**
   * Add an AI response to a conversation
   * @param conversationId - The conversation ID
   * @param content - The AI response content
   * @returns The updated conversation
   */
  async addAIResponse(conversationId: string, content: string): Promise<Conversation> {
    try {
      // Validate inputs
      this.validationService.validateUUID(conversationId, 'conversationId');
      this.validationService.validateString(content, 'content', 1, 10000);

      // Get conversation without user validation (internal service call)
      const conversation = await this.dbService.getConversationById(conversationId);
      if (!conversation) {
        throw new Error(`Conversation with ID ${conversationId} not found`);
      }

      if (!conversation.isActive) {
        throw new Error('Cannot add message to inactive conversation');
      }

      // Create AI message
      const message: ConversationMessage = {
        id: uuidv4(),
        conversationId,
        content,
        role: 'assistant',
        timestamp: new Date(),
        metadata: {
          tokens: this.estimateTokens(content),
          isSystemMessage: false,
          isAIResponse: true
        }
      };

      // Add message to conversation
      conversation.messages.push(message);
      conversation.updatedAt = new Date();
      conversation.metadata.totalMessages = conversation.messages.length;

      // Save to database
      await this.dbService.saveConversation(conversation);

      this.logger.info(`Added AI response to conversation ${conversationId}`);
      return conversation;
    } catch (error) {
      this.logger.error('Failed to add AI response:', error);
      throw error;
    }
  }

  /**
   * Update conversation metadata
   * @param conversationId - The conversation ID
   * @param userId - The user ID
   * @param updates - Partial metadata updates
   * @returns The updated conversation
   */
  async updateConversationMetadata(
    conversationId: string,
    userId: string,
    updates: Partial<Conversation['metadata']>
  ): Promise<Conversation> {
    try {
      // Validate inputs
      this.validationService.validateUUID(conversationId, 'conversationId');
      this.validationService.validateUUID(userId, 'userId');

      // Get conversation
      const conversation = await this.getConversation(conversationId, userId);

      // Update metadata
      conversation.metadata = {
        ...conversation.metadata,
        ...updates
      };
      conversation.updatedAt = new Date();

      // Save to database
      await this.dbService.saveConversation(con