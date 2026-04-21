// src/core/ai-assistant.ts
// AI Assistant Core Logic - DeepSeek V3.2 Project Generator V5.5
// Main conversation and project generation handler

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Types and Interfaces
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProjectGenerationRequest {
  id: string;
  userPrompt: string;
  context: ConversationContext;
  requirements: ProjectRequirements;
  timestamp: Date;
}

export interface ProjectRequirements {
  technologyStack?: string[];
  projectType?: 'web' | 'mobile' | 'desktop' | 'api' | 'full-stack';
  complexity?: 'basic' | 'intermediate' | 'advanced';
  includeTests?: boolean;
  includeDocumentation?: boolean;
  preferredLanguage?: string;
  additionalConstraints?: string[];
}

export interface ConversationContext {
  history: ConversationMessage[];
  currentProject?: ProjectState;
  userPreferences?: UserPreferences;
}

export interface ProjectState {
  id: string;
  name: string;
  description: string;
  files: ProjectFile[];
  structure: ProjectStructure;
  status: 'generating' | 'complete' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  isGenerated: boolean;
}

export interface ProjectStructure {
  root: string;
  directories: string[];
  files: ProjectFile[];
}

export interface UserPreferences {
  preferredTechStack?: string[];
  codingStyle?: 'functional' | 'oop' | 'mixed';
  includeComments?: boolean;
  generateTests?: boolean;
  documentationLevel?: 'minimal' | 'standard' | 'detailed';
}

export interface AIAssistantConfig {
  maxHistoryLength: number;
  responseTimeout: number;
  enableMemory: boolean;
  defaultTechStack: string[];
  projectTemplates: Record<string, any>;
}

export interface GenerationResult {
  success: boolean;
  project?: ProjectState;
  files?: ProjectFile[];
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

// Error Classes
export class AIAssistantError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'AIAssistantError';
  }
}

export class GenerationError extends AIAssistantError {
  constructor(message: string, context?: any) {
    super(message, 'GENERATION_ERROR', context);
    this.name = 'GenerationError';
  }
}

export class ValidationError extends AIAssistantError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

// Main AI Assistant Class
export class AIAssistant extends EventEmitter {
  private config: AIAssistantConfig;
  private context: ConversationContext;
  private isGenerating: boolean = false;
  private generationQueue: ProjectGenerationRequest[] = [];

  constructor(config?: Partial<AIAssistantConfig>) {
    super();
    
    this.config = {
      maxHistoryLength: 50,
      responseTimeout: 30000,
      enableMemory: true,
      defaultTechStack: ['typescript', 'react', 'nodejs', 'express'],
      projectTemplates: {},
      ...config
    };

    this.context = {
      history: [],
      userPreferences: {
        codingStyle: 'mixed',
        includeComments: true,
        generateTests: true,
        documentationLevel: 'standard'
      }
    };
  }

  /**
   * Process user message and generate response
   */
  async processMessage(
    userMessage: string,
    metadata?: Record<string, any>
  ): Promise<ConversationMessage> {
    try {
      this.validateMessage(userMessage);

      // Add user message to history
      const userMsg: ConversationMessage = {
        id: uuidv4(),
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        metadata
      };

      this.addToHistory(userMsg);

      // Check if message contains project generation request
      const isProjectRequest = this.detectProjectRequest(userMessage);
      
      let assistantResponse: ConversationMessage;

      if (isProjectRequest) {
        assistantResponse = await this.handleProjectRequest(userMessage);
      } else {
        assistantResponse = await this.generateConversationResponse(userMessage);
      }

      this.addToHistory(assistantResponse);
      
      // Emit events
      this.emit('messageProcessed', {
        userMessage: userMsg,
        assistantResponse,
        context: this.context
      });

      return assistantResponse;

    } catch (error) {
      const errorMsg = this.handleError(error);
      throw new AIAssistantError(
        `Failed to process message: ${errorMsg}`,
        'PROCESS_ERROR',
        { userMessage, error }
      );
    }
  }

  /**
   * Generate a complete project based on requirements
   */
  async generateProject(
    prompt: string,
    requirements?: Partial<ProjectRequirements>
  ): Promise<GenerationResult> {
    if (this.isGenerating) {
      throw new AIAssistantError(
        'Another generation is in progress',
        'GENERATION_BUSY'
      );
    }

    try {
      this.isGenerating = true;
      
      const request: ProjectGenerationRequest = {
        id: uuidv4(),
        userPrompt: prompt,
        context: { ...this.context },
        requirements: this.parseRequirements(prompt, requirements),
        timestamp: new Date()
      };

      this.emit('generationStarted', request);

      // Analyze requirements and generate project structure
      const projectStructure = await this.analyzeRequirements(request);
      
      // Generate files based on structure
      const generatedFiles = await this.generateProjectFiles(projectStructure);
      
      // Create project state
      const project: ProjectState = {
        id: uuidv4(),
        name: this.generateProjectName(prompt),
        description: this.generateProjectDescription(prompt),
        files: generatedFiles,
        structure: projectStructure,
        status: 'complete',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update context
      this.context.currentProject = project;

      const result: GenerationResult = {
        success: true,
        project,
        files: generatedFiles,
        metadata: {
          generationTime: new Date(),
          filesCount: generatedFiles.length,
          totalSize: this.calculateProjectSize(generatedFiles)
        }
      };

      this.emit('generationComplete', result);
      return result;

    } catch (error) {
      const errorResult: GenerationResult = {
        success: false,
        error: this.handleError(error),
        warnings: ['Project generation failed']
      };

      this.emit('generationError', errorResult);
      throw new GenerationError(
        `Project generation failed: ${errorResult.error}`,
        { prompt, requirements }
      );

    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Get current conversation context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): void {
    if (!this.context.userPreferences) {
      this.context.userPreferences = {};
    }
    
    this.context.userPreferences = {
      ...this.context.userPreferences,
      ...preferences
    };

    this.emit('preferencesUpdated', this.context.userPreferences);
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.context.history = [];
    this.emit('historyCleared');
  }

  /**
   * Export project to filesystem or archive
   */
  async exportProject(
    projectId: string,
    format: 'zip' | 'directory' = 'directory'
  ): Promise<string> {
    const project = this.context.currentProject;
    
    if (!project || project.id !== projectId) {
      throw new AIAssistantError(
        'Project not found',
        'PROJECT_NOT_FOUND',
        { projectId }
      );
    }

    try {
      let exportPath: string;

      if (format === 'zip') {
        exportPath = await this.createZipArchive(project);
      } else {
        exportPath = await this.createDirectoryStructure(project);
      }

      this.emit('projectExported', { projectId, format, exportPath });
      return exportPath;

    } catch (error) {
      throw new AIAssistantError(
        `Export failed: ${this.handleError(error)}`,
        'EXPORT_ERROR',
        { projectId, format }
      );
    }
  }

  // Private Methods

  private validateMessage(message: string): void {
    if (!message || typeof message !== 'string') {
      throw new ValidationError('Message must be a non-empty string');
    }

    if (message.length > 5000) {
      throw new ValidationError('Message too long (max 5000 characters)');
    }
  }

  private detectProjectRequest(message: string): boolean {
    const projectKeywords = [
      'generate', 'create', 'build', 'make',