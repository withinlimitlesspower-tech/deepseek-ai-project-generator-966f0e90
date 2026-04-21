import { Router, Request, Response } from 'express';
import { ProjectGenerator } from '../core/project-generator';
import { ContextManager } from '../core/context-manager';
import { AIAssistant } from '../core/ai-assistant';
import { 
  ProjectRequest, 
  ProjectResponse, 
  ConversationRequest, 
  ConversationResponse,
  ErrorResponse 
} from '../types/project.types';
import { ProjectContext } from '../types/ai.types';

const router = Router();
const projectGenerator = new ProjectGenerator();
const contextManager = new ContextManager();
const aiAssistant = new AIAssistant();

/**
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AI Project Generator V5.5',
    version: '1.0.0'
  });
});

/**
 * Generate a complete project based on requirements
 * POST /api/projects/generate
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const projectRequest: ProjectRequest = req.body;
    
    // Validate request
    if (!projectRequest.requirements || projectRequest.requirements.trim() === '') {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Project requirements are required',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(errorResponse);
    }

    // Generate project
    const project = await projectGenerator.generateProject(projectRequest);
    
    // Store context if provided
    if (projectRequest.contextId) {
      await contextManager.updateContext(projectRequest.contextId, {
        projectType: project.projectType,
        technologies: project.technologies,
        requirements: projectRequest.requirements,
        generatedFiles: project.files.map(f => f.name)
      });
    }

    const response: ProjectResponse = {
      success: true,
      project: project,
      timestamp: new Date().toISOString(),
      contextId: projectRequest.contextId || undefined
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Project generation error:', error);
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate project',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * Continue conversation with AI assistant for project refinement
 * POST /api/projects/conversation
 */
router.post('/conversation', async (req: Request, res: Response) => {
  try {
    const conversationRequest: ConversationRequest = req.body;
    
    // Validate request
    if (!conversationRequest.message || conversationRequest.message.trim() === '') {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Message is required',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(errorResponse);
    }

    if (!conversationRequest.contextId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Context ID is required for conversation',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(errorResponse);
    }

    // Get existing context
    const context = await contextManager.getContext(conversationRequest.contextId);
    if (!context) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Context not found',
        timestamp: new Date().toISOString()
      };
      return res.status(404).json(errorResponse);
    }

    // Process conversation with AI
    const aiResponse = await aiAssistant.processConversation(
      conversationRequest.message,
      context
    );

    // Update context with new conversation
    const updatedContext: ProjectContext = {
      ...context,
      conversationHistory: [
        ...(context.conversationHistory || []),
        {
          role: 'user',
          content: conversationRequest.message,
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: aiResponse.response,
          timestamp: new Date().toISOString()
        }
      ]
    };

    await contextManager.updateContext(conversationRequest.contextId, updatedContext);

    const response: ConversationResponse = {
      success: true,
      response: aiResponse.response,
      suggestions: aiResponse.suggestions,
      contextId: conversationRequest.contextId,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Conversation error:', error);
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process conversation',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * Get project context by ID
 * GET /api/projects/context/:contextId
 */
router.get('/context/:contextId', async (req: Request, res: Response) => {
  try {
    const { contextId } = req.params;
    
    const context = await contextManager.getContext(contextId);
    
    if (!context) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Context not found',
        timestamp: new Date().toISOString()
      };
      return res.status(404).json(errorResponse);
    }

    res.status(200).json({
      success: true,
      context: context,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get context error:', error);
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve context',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * Create a new project context
 * POST /api/projects/context
 */
router.post('/context', async (req: Request, res: Response) => {
  try {
    const { projectType, initialRequirements } = req.body;
    
    if (!projectType || !initialRequirements) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Project type and initial requirements are required',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(errorResponse);
    }

    const contextId = await contextManager.createContext({
      projectType,
      requirements: initialRequirements,
      technologies: [],
      generatedFiles: [],
      conversationHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      contextId: contextId,
      message: 'Context created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Create context error:', error);
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create context',
      timestamp: new Date().toISOString()
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * Delete project context
 * DELETE /api/projects/context/:contextId
 */
router.delete('/context/:contextId', async (req: Request, res: Response) => {
  try {
    const { contextId } = req.params;
    
    const deleted = await contextManager.deleteContext(contextId);
    
    if (!deleted) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Context not found',
        timestamp: new Date().toISOString()
      };
      return res.status(404).json(errorResponse);
    }

    res.status(200).json({
      success: true,
      message: 'Context deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Delete context error:', error);
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete context',
      timestamp: new Date().toISOString()