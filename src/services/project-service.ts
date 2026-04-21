import { Project, ProjectInput, ProjectUpdate, ProjectStatus } from '../types/project.types';
import { ProjectModel } from '../database/models/project-model';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError, NotFoundError, DatabaseError } from '../utils/validation';

/**
 * Service layer for project management operations
 * Handles business logic and data persistence
 */
export class ProjectService {
  private projectModel: ProjectModel;

  constructor() {
    this.projectModel = new ProjectModel();
  }

  /**
   * Create a new project with validation and initialization
   * @param projectData - Project input data
   * @returns Created project
   */
  async createProject(projectData: ProjectInput): Promise<Project> {
    try {
      // Validate required fields
      if (!projectData.name || !projectData.description) {
        throw new ValidationError('Project name and description are required');
      }

      // Generate unique project ID
      const projectId = uuidv4();

      // Create project object with defaults
      const newProject: Project = {
        id: projectId,
        name: projectData.name,
        description: projectData.description,
        status: ProjectStatus.DRAFT,
        createdAt: new Date(),
        updatedAt: new Date(),
        files: [],
        metadata: projectData.metadata || {},
        blueprint: projectData.blueprint || null,
        conversationHistory: []
      };

      // Save to database
      const createdProject = await this.projectModel.create(newProject);
      
      if (!createdProject) {
        throw new DatabaseError('Failed to create project in database');
      }

      return createdProject;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Error creating project: ${error.message}`);
    }
  }

  /**
   * Get project by ID
   * @param projectId - Project identifier
   * @returns Project details
   */
  async getProjectById(projectId: string): Promise<Project> {
    try {
      if (!projectId) {
        throw new ValidationError('Project ID is required');
      }

      const project = await this.projectModel.findById(projectId);
      
      if (!project) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      return project;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Error retrieving project: ${error.message}`);
    }
  }

  /**
   * Get all projects with optional filtering
   * @param filters - Optional filters for status, date range, etc.
   * @returns Array of projects
   */
  async getAllProjects(filters?: {
    status?: ProjectStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    try {
      const projects = await this.projectModel.findAll(filters);
      return projects;
    } catch (error) {
      throw new DatabaseError(`Error retrieving projects: ${error.message}`);
    }
  }

  /**
   * Update project details
   * @param projectId - Project identifier
   * @param updateData - Data to update
   * @returns Updated project
   */
  async updateProject(projectId: string, updateData: ProjectUpdate): Promise<Project> {
    try {
      if (!projectId) {
        throw new ValidationError('Project ID is required');
      }

      // Check if project exists
      const existingProject = await this.projectModel.findById(projectId);
      if (!existingProject) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      // Prepare update data with timestamp
      const updatePayload = {
        ...updateData,
        updatedAt: new Date()
      };

      const updatedProject = await this.projectModel.update(projectId, updatePayload);
      
      if (!updatedProject) {
        throw new DatabaseError('Failed to update project in database');
      }

      return updatedProject;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof DatabaseError) {
        throw error;
      }
      throw new DatabaseError(`Error updating project: ${error.message}`);
    }
  }

  /**
   * Delete a project
   * @param projectId - Project identifier
   * @returns Success status
   */
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      if (!projectId) {
        throw new ValidationError('Project ID is required');
      }

      // Check if project exists
      const existingProject = await this.projectModel.findById(projectId);
      if (!existingProject) {
        throw new NotFoundError(`Project with ID ${projectId} not found`);
      }

      const deleted = await this.projectModel.delete(projectId);
      return deleted;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Error deleting project: ${error.message}`);
    }
  }

  /**
   * Add a file to project
   * @param projectId - Project identifier
   * @param fileData - File information
   * @returns Updated project
   */
  async addFileToProject(
    projectId: string,
    fileData: {
      filename: string;
      content: string;
      path: string;
      type: string;
    }
  ): Promise<Project> {
    try {
      if (!projectId) {
        throw new ValidationError('Project ID is required');
      }

      if (!fileData.filename || !fileData.content) {
        throw new ValidationError('Filename and content are required');
      }

      const project = await this.getProjectById(projectId);
      
      // Create file object
      const newFile = {
        id: uuidv4(),
        filename: fileData.filename,
        content: fileData.content,
        path: fileData.path || '',
        type: fileData.type || 'text',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add file to project
      project.files.push(newFile);
      project.updatedAt = new Date();

      // Update project in database
      const updatedProject = await this.projectModel.update(projectId, {
        files: project.files,
        updatedAt: project.updatedAt
      });

      return updatedProject;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Error adding file to project: ${error.message}`);
    }
  }

  /**
   * Update project status
   * @param projectId - Project identifier
   * @param status - New status
   * @returns Updated project
   */
  async updateProjectStatus(projectId: string, status: ProjectStatus): Promise<Project> {
    try {
      if (!projectId) {
        throw new ValidationError('Project ID is required');
      }

      if (!Object.values(ProjectStatus).includes(status)) {
        throw new ValidationError('Invalid project status');
      }

      const project = await this.getProjectById(projectId);
      
      // Update status
      const updatedProject = await this.projectModel.update(projectId, {
        status,
        updatedAt: new Date()
      });

      return updatedProject;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Error updating project status: ${error.message}`);
    }
  }

  /**
   * Add conversation message to project history
   * @param projectId - Project identifier
   * @param message - Conversation message
   * @returns Updated project
   */
  async addConversationMessage(
    projectId: string,
    message: {
      role: 'user' | 'assistant';
      content: string;
      timestamp?: Date;
    }
  ): Promise<Project> {
    try {
      if (!projectId) {
        throw new ValidationError('Project ID is required');
      }

      if (!message.content || !message.role) {
        throw new ValidationError('Message content and role are required');
      }

      const project = await this.getProjectById(projectId);
      
      // Create conversation entry
      const conversationEntry = {
        id: uuidv4(),
        role: message.role,
        content: message.content,
        timestamp: message.timestamp || new Date()
      };

      // Add to conversation history
      project.conversationHistory.push(conversationEntry);
      project.updatedAt = new Date();

      // Update project in database
      const updatedProject = await this.projectModel.update(projectId, {
        conversationHistory: project.conversationHistory,
        updatedAt: project.updatedAt
      });

      return updatedProject;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Error adding conversation message: ${error.message}`);
    }
  }

  /**
   * Get project conversation history
   * @param projectId - Project identifier
   * @returns Conversation history
   */
  async getConversationHistory(projectId: string): Promise<any[]> {
    try {