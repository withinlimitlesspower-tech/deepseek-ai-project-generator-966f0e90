import React, { useState, useEffect, useCallback } from 'react';
import { Project, ProjectStatus, ProjectType } from '../types/project.types';
import { ConversationMessage } from '../types/ai.types';
import { generateProjectBlueprint } from '../utils/blueprint-renderer';
import { validateProjectInput } from '../utils/validation';
import { generateProjectFiles } from '../utils/file-generator';
import { projectService } from '../services/project-service';
import { conversationService } from '../services/conversation-service';
import { aiIntegrationService } from '../services/ai-integration-service';

interface ProjectBuilderProps {
  initialProject?: Project;
  onProjectGenerated?: (project: Project) => void;
  onError?: (error: string) => void;
}

const ProjectBuilder: React.FC<ProjectBuilderProps> = ({
  initialProject,
  onProjectGenerated,
  onError
}) => {
  // State management
  const [project, setProject] = useState<Project>(initialProject || {
    id: '',
    name: '',
    description: '',
    type: ProjectType.WEB_APPLICATION,
    status: ProjectStatus.DRAFT,
    requirements: [],
    technologies: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    conversationId: '',
    blueprint: null,
    files: []
  });

  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showBlueprint, setShowBlueprint] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'config' | 'files'>('chat');

  // Initialize conversation if project has one
  useEffect(() => {
    const loadConversation = async () => {
      if (project.conversationId) {
        try {
          setIsLoading(true);
          const conv = await conversationService.getConversation(project.conversationId);
          setConversation(conv.messages);
        } catch (error) {
          console.error('Failed to load conversation:', error);
          onError?.('Failed to load conversation history');
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadConversation();
  }, [project.conversationId, onError]);

  // Handle user input submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isGenerating) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date()
    };

    // Add user message to conversation
    setConversation(prev => [...prev, userMessage]);
    setUserInput('');
    setIsGenerating(true);

    try {
      // Get AI response
      const aiResponse = await aiIntegrationService.processMessage(
        userInput,
        conversation,
        project
      );

      // Update conversation with AI response
      const aiMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date()
      };

      setConversation(prev => [...prev, aiMessage]);

      // Update project if AI provided updates
      if (aiResponse.projectUpdates) {
        const updatedProject = {
          ...project,
          ...aiResponse.projectUpdates,
          updatedAt: new Date()
        };
        setProject(updatedProject);

        // Save project updates
        await projectService.updateProject(updatedProject);
      }

      // Save conversation
      if (!project.conversationId) {
        const newConv = await conversationService.createConversation({
          projectId: project.id,
          messages: [...conversation, userMessage, aiMessage]
        });
        setProject(prev => ({ ...prev, conversationId: newConv.id }));
      } else {
        await conversationService.updateConversation(project.conversationId, {
          messages: [...conversation, userMessage, aiMessage]
        });
      }

    } catch (error) {
      console.error('Error processing message:', error);
      onError?.('Failed to process your request. Please try again.');
      
      // Add error message to conversation
      const errorMessage: ConversationMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  }, [userInput, conversation, project, isGenerating, onError]);

  // Generate project blueprint
  const handleGenerateBlueprint = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Validate project requirements
      const validation = validateProjectInput(project);
      if (!validation.isValid) {
        onError?.(validation.errors.join(', '));
        return;
      }

      // Generate blueprint
      const blueprint = await generateProjectBlueprint(project);
      
      // Update project with blueprint
      const updatedProject = {
        ...project,
        blueprint,
        status: ProjectStatus.BLUEPRINT_READY,
        updatedAt: new Date()
      };
      
      setProject(updatedProject);
      setShowBlueprint(true);
      
      // Save project
      await projectService.updateProject(updatedProject);
      
    } catch (error) {
      console.error('Error generating blueprint:', error);
      onError?.('Failed to generate project blueprint');
    } finally {
      setIsLoading(false);
    }
  }, [project, onError]);

  // Generate project files
  const handleGenerateFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (!project.blueprint) {
        onError?.('Please generate a blueprint first');
        return;
      }

      // Generate files based on blueprint
      const files = await generateProjectFiles(project.blueprint);
      
      // Update project with files
      const updatedProject = {
        ...project,
        files,
        status: ProjectStatus.FILES_GENERATED,
        updatedAt: new Date()
      };
      
      setProject(updatedProject);
      setActiveTab('files');
      
      // Save project
      await projectService.updateProject(updatedProject);
      
      // Notify parent component
      onProjectGenerated?.(updatedProject);
      
    } catch (error) {
      console.error('Error generating files:', error);
      onError?.('Failed to generate project files');
    } finally {
      setIsLoading(false);
    }
  }, [project, onProjectGenerated, onError]);

  // Update project configuration
  const handleConfigUpdate = useCallback((updates: Partial<Project>) => {
    setProject(prev => ({
      ...prev,
      ...updates,
      updatedAt: new Date()
    }));
  }, []);

  // Save project
  const handleSaveProject = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (project.id) {
        await projectService.updateProject(project);
      } else {
        const savedProject = await projectService.createProject(project);
        setProject(savedProject);
      }
      
    } catch (error) {
      console.error('Error saving project:', error);
      onError?.('Failed to save project');
    } finally {
      setIsLoading(false);
    }
  }, [project, onError]);

  // Render conversation messages
  const renderConversation = () => (
    <div className="conversation-container">
      <div className="messages-list">
        {conversation.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role}`}
          >
            <div className="message-header">
              <span className="message-role">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </span>
              <span className="message-time">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Describe your project requirements..."
          disabled={isGenerating}
          rows={3}
        />
        <button
          type="submit"
          disabled={!userInput.trim() || isGenerating}
          className="submit-button"
        >
          {isGenerating ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );

  // Render project configuration
  const renderConfiguration = () => (
    <div className="config-container">