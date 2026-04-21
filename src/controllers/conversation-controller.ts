import { Request, Response } from 'express';
import { ConversationService } from '../services/conversation-service';
import { ProjectService } from '../services/project-service';
import { AIIntegrationService } from '../services/ai-integration-service';
import { 
  CreateConversationRequest, 
  UpdateConversationRequest, 
  AddMessageRequest,
  ConversationResponse,
  MessageResponse
} from '../types/ai.types';
import { validateRequest } from '../utils/validation';
import { ApiError } from '../utils/error-handler';
import { StatusCodes } from 'http-status-codes';

export class ConversationController {
  private conversationService: ConversationService;
  private projectService: ProjectService;
  private aiIntegrationService: AIIntegrationService;

  constructor() {
    this.conversationService = new ConversationService();
    this.projectService = new ProjectService();
    this.aiIntegrationService = new AIIntegrationService();
  }

  /**
   * Create a new conversation for a project
   */
  async createConversation(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateConversationRequest = req.body;
      
      // Validate request
      validateRequest(request, {
        projectId: 'required|string',
        title: 'required|string|min:1|max:200',
        context: 'optional|string|max:1000'
      });

      // Check if project exists
      const project = await this.projectService.getProjectById(request.projectId);
      if (!project) {
        throw new ApiError('Project not found', StatusCodes.NOT_FOUND);
      }

      // Create conversation
      const conversation = await this.conversationService.createConversation({
        projectId: request.projectId,
        title: request.title,
        context: request.context || '',
        metadata: {
          createdBy: req.user?.id || 'system',
          createdAt: new Date()
        }
      });

      const response: ConversationResponse = {
        id: conversation.id,
        projectId: conversation.projectId,
        title: conversation.title,
        context: conversation.context,
        messages: conversation.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        metadata: conversation.metadata,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      };

      res.status(StatusCodes.CREATED).json({
        success: true,
        data: response,
        message: 'Conversation created successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to create conversation',
        StatusCodes.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get all conversations for a project
   */
  async getProjectConversations(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      
      if (!projectId) {
        throw new ApiError('Project ID is required', StatusCodes.BAD_REQUEST);
      }

      // Check if project exists
      const project = await this.projectService.getProjectById(projectId);
      if (!project) {
        throw new ApiError('Project not found', StatusCodes.NOT_FOUND);
      }

      const conversations = await this.conversationService.getConversationsByProject(projectId);
      
      const response: ConversationResponse[] = conversations.map(conversation => ({
        id: conversation.id,
        projectId: conversation.projectId,
        title: conversation.title,
        context: conversation.context,
        messages: conversation.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        metadata: conversation.metadata,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }));

      res.status(StatusCodes.OK).json({
        success: true,
        data: response,
        message: 'Conversations retrieved successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to retrieve conversations',
        StatusCodes.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      
      if (!conversationId) {
        throw new ApiError('Conversation ID is required', StatusCodes.BAD_REQUEST);
      }

      const conversation = await this.conversationService.getConversationById(conversationId);
      if (!conversation) {
        throw new ApiError('Conversation not found', StatusCodes.NOT_FOUND);
      }

      const response: ConversationResponse = {
        id: conversation.id,
        projectId: conversation.projectId,
        title: conversation.title,
        context: conversation.context,
        messages: conversation.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        metadata: conversation.metadata,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      };

      res.status(StatusCodes.OK).json({
        success: true,
        data: response,
        message: 'Conversation retrieved successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to retrieve conversation',
        StatusCodes.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Update conversation details
   */
  async updateConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      const request: UpdateConversationRequest = req.body;
      
      if (!conversationId) {
        throw new ApiError('Conversation ID is required', StatusCodes.BAD_REQUEST);
      }

      // Validate request
      validateRequest(request, {
        title: 'optional|string|min:1|max:200',
        context: 'optional|string|max:1000'
      });

      // Check if conversation exists
      const existingConversation = await this.conversationService.getConversationById(conversationId);
      if (!existingConversation) {
        throw new ApiError('Conversation not found', StatusCodes.NOT_FOUND);
      }

      // Update conversation
      const updatedConversation = await this.conversationService.updateConversation(conversationId, {
        title: request.title,
        context: request.context,
        metadata: {
          ...existingConversation.metadata,
          updatedBy: req.user?.id || 'system',
          updatedAt: new Date()
        }
      });

      const response: ConversationResponse = {
        id: updatedConversation.id,
        projectId: updatedConversation.projectId,
        title: updatedConversation.title,
        context: updatedConversation.context,
        messages: updatedConversation.messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        metadata: updatedConversation.metadata,
        createdAt: updatedConversation.createdAt,
        updatedAt: updatedConversation.updatedAt
      };

      res.status(StatusCodes.OK).json({
        success: true,
        data: response,
        message: 'Conversation updated successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to update conversation',
        StatusCodes.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      
      if (!conversationId) {
        throw new ApiError('Conversation ID is required', StatusCodes.BAD_REQUEST);
      }

      // Check if conversation exists
      const existingConversation = await this.conversationService.getConversationById(conversationId);
      if (!existingConversation) {
        throw new ApiError('Conversation not found', StatusCodes.NOT_FOUND);
      }

      await this.conversationService.deleteConversation(conversationId);

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Conversation deleted successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to delete conversation',
        StatusCodes.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(req: Request, res: