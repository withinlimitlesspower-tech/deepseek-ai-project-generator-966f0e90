import { Request, Response } from 'express';
import { ProjectService } from '../services/project-service';
import { ConversationService } from '../services/conversation-service';
import { 
  CreateProjectRequest, 
  UpdateProjectRequest, 
  GenerateProjectRequest,
  ProjectResponse,
  ApiResponse
} from '../types/project.types';
import { validateRequest } from '../utils/validation';
import { BlueprintRenderer } from '../utils/blueprint-renderer';
import { FileGenerator } from '../utils/file-generator';

export class ProjectController {
  private projectService: ProjectService;
  private conversationService: ConversationService;
  private blueprintRenderer: BlueprintRenderer;
  private fileGenerator: FileGenerator;

  constructor() {
    this.projectService = new ProjectService();
    this.conversationService = new ConversationService();
    this.blueprintRenderer = new BlueprintRenderer();
    this.fileGenerator = new FileGenerator();
    
    // Bind methods to maintain 'this' context
    this.createProject = this.createProject.bind(this);
    this.getProject = this.getProject.bind(this);
    this.updateProject = this.updateProject.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
    this.listProjects = this.listProjects.bind(this);
    this.generateProject = this.generateProject.bind(this);
    this.getProjectBlueprint = this.getProjectBlueprint.bind(this);
    this.downloadProjectFiles = this.downloadProjectFiles.bind(this);
  }

  /**
   * Create a new project
   */
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = validateRequest<CreateProjectRequest>(req.body, {
        name: 'required|string|min:3|max:100',
        description: 'required|string|min:10|max:500',
        projectType: 'required|string|in:web,mobile,desktop,api,library',
        techStack: 'optional|array',
        userId: 'required|string'
      });

      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors
        } as ApiResponse);
        return;
      }

      const projectData: CreateProjectRequest = req.body;
      
      // Create project in database
      const project = await this.projectService.createProject(projectData);
      
      // Create initial conversation for the project
      await this.conversationService.createConversation({
        projectId: project.id,
        userId: projectData.userId,
        title: `Initial conversation for ${project.name}`,
        messages: [{
          role: 'system',
          content: `Project "${project.name}" has been created. Description: ${project.description}`,
          timestamp: new Date()
        }]
      });

      const response: ApiResponse<ProjectResponse> = {
        success: true,
        message: 'Project created successfully',
        data: this.mapToProjectResponse(project)
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create project',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * Get project by ID
   */
  async getProject(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const userId = req.query.userId as string;

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'Project ID is required'
        } as ApiResponse);
        return;
      }

      const project = await this.projectService.getProjectById(projectId, userId);

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<ProjectResponse> = {
        success: true,
        message: 'Project retrieved successfully',
        data: this.mapToProjectResponse(project)
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error getting project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve project',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * Update project
   */
  async updateProject(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      
      // Validate request body
      const validationResult = validateRequest<UpdateProjectRequest>(req.body, {
        name: 'optional|string|min:3|max:100',
        description: 'optional|string|min:10|max:500',
        status: 'optional|string|in:draft,in_progress,completed,archived',
        techStack: 'optional|array'
      });

      if (!validationResult.isValid) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationResult.errors
        } as ApiResponse);
        return;
      }

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'Project ID is required'
        } as ApiResponse);
        return;
      }

      const updateData: UpdateProjectRequest = req.body;
      const userId = req.query.userId as string;

      const updatedProject = await this.projectService.updateProject(
        projectId, 
        updateData, 
        userId
      );

      if (!updatedProject) {
        res.status(404).json({
          success: false,
          message: 'Project not found or unauthorized'
        } as ApiResponse);
        return;
      }

      const response: ApiResponse<ProjectResponse> = {
        success: true,
        message: 'Project updated successfully',
        data: this.mapToProjectResponse(updatedProject)
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update project',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * Delete project
   */
  async deleteProject(req: Request, res: Response): Promise<void> {
    try {
      const projectId = req.params.id;
      const userId = req.query.userId as string;

      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'Project ID is required'
        } as ApiResponse);
        return;
      }

      const deleted = await this.projectService.deleteProject(projectId, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Project not found or unauthorized'
        } as ApiResponse);
        return;
      }

      // Also delete associated conversations
      await this.conversationService.deleteConversationsByProjectId(projectId);

      const response: ApiResponse = {
        success: true,
        message: 'Project deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * List all projects for a user
   */
  async listProjects(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required'
        } as ApiResponse);
        return;
      }

      const { projects, total, totalPages } = await this.projectService.listProjects(
        userId, 
        page, 
        limit, 
        status
      );

      const response: ApiResponse<{
        projects: ProjectResponse[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        }
      }> = {
        success: true,
        message: 'Projects retrieved successfully',
        data: {
          projects: projects.map(project => this.mapToProjectResponse(project)),
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error listing projects:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list projects',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ApiResponse);
    }
  }

  /**
   * Generate project files based on conversation
   */
  async generateProject(req: Request, res: