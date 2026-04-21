import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Conversation, AIResponse } from '../../types/ai.types';
import { ProjectBlueprint } from '../../types/project.types';
import { sendMessage, generateProject } from '../../services/ai-integration-service';
import { saveConversation } from '../../services/conversation-service';
import './chat-interface.css';

interface ChatInterfaceProps {
  conversationId?: string;
  onProjectGenerated?: (blueprint: ProjectBlueprint) => void;
  onError?: (error: string) => void;
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  onProjectGenerated,
  onError,
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: 'Hello! I\'m your AI Project Generator. Describe the project you want me to build, and I\'ll create a complete blueprint with all necessary files.',
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingProject, setIsGeneratingProject] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize conversation
  useEffect(() => {
    if (conversationId) {
      // Load existing conversation
      // This would typically come from an API call
      const loadConversation = async () => {
        try {
          // Placeholder for conversation loading logic
          console.log('Loading conversation:', conversationId);
        } catch (error) {
          handleError('Failed to load conversation');
        }
      };
      loadConversation();
    } else {
      // Create new conversation
      const newConversation: Conversation = {
        id: `conv_${Date.now()}`,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      };
      setConversation(newConversation);
    }
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleError = (error: string) => {
    console.error('ChatInterface error:', error);
    if (onError) {
      onError(error);
    }
    
    // Add error message to chat
    const errorMessage: Message = {
      id: `error_${Date.now()}`,
      content: `Sorry, I encountered an error: ${error}`,
      sender: 'ai',
      timestamp: new Date(),
      type: 'error'
    };
    
    setMessages(prev => [...prev, errorMessage]);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || isGeneratingProject) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      content: inputText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Send message to AI service
      const response: AIResponse = await sendMessage({
        message: inputText,
        conversationId: conversation?.id,
        context: messages.slice(-5) // Send last 5 messages as context
      });

      // Add AI response
      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        content: response.content,
        sender: 'ai',
        timestamp: new Date(),
        type: response.type || 'text',
        metadata: response.metadata
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update conversation
      if (conversation) {
        const updatedConversation: Conversation = {
          ...conversation,
          messages: [...conversation.messages, userMessage, aiMessage],
          updatedAt: new Date()
        };
        setConversation(updatedConversation);
        
        // Save conversation
        await saveConversation(updatedConversation);
      }

      // Check if AI suggests project generation
      if (response.metadata?.suggestProjectGeneration) {
        handleGenerateProject(inputText);
      }

    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateProject = async (projectDescription: string) => {
    if (isGeneratingProject) return;

    setIsGeneratingProject(true);
    
    const generatingMessage: Message = {
      id: `gen_${Date.now()}`,
      content: 'I\'m analyzing your project requirements and generating a complete blueprint...',
      sender: 'ai',
      timestamp: new Date(),
      type: 'system'
    };
    
    setMessages(prev => [...prev, generatingMessage]);

    try {
      const blueprint = await generateProject({
        description: projectDescription,
        conversationId: conversation?.id,
        requirements: extractRequirements(projectDescription)
      });

      const completeMessage: Message = {
        id: `complete_${Date.now()}`,
        content: `Project generation complete! I've created a blueprint with ${blueprint.files?.length || 0} files.`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'system',
        metadata: { blueprint }
      };

      setMessages(prev => [...prev, completeMessage]);

      if (onProjectGenerated) {
        onProjectGenerated(blueprint);
      }

    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Failed to generate project');
    } finally {
      setIsGeneratingProject(false);
    }
  };

  const extractRequirements = (description: string): string[] => {
    // Simple requirement extraction - can be enhanced
    const requirements: string[] = [];
    
    // Check for common requirements
    if (description.toLowerCase().includes('react')) requirements.push('react');
    if (description.toLowerCase().includes('typescript')) requirements.push('typescript');
    if (description.toLowerCase().includes('node')) requirements.push('nodejs');
    if (description.toLowerCase().includes('database')) requirements.push('database');
    if (description.toLowerCase().includes('api')) requirements.push('api');
    if (description.toLowerCase().includes('authentication')) requirements.push('auth');
    
    return requirements;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message) => {
    const isUser = message.sender === 'user';
    
    return (
      <div
        key={message.id}
        className={`message ${isUser ? 'user-message' : 'ai-message'} ${message.type}`}
      >
        <div className="message-header">
          <span className="message-sender">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
          <span className="message-timestamp">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        <div className="message-content">
          {message.content}
        </div>
        {message.type === 'error' && (
          <div className="message-error">
            <span className="error-icon">⚠️</span>
            Error occurred
          </div>
        )}
        {message.metadata?.blueprint && (
          <div className="blueprint-preview">
            <div className="blueprint-header">
              <strong>Project Blueprint Generated</strong>
            </div>
            <div className="blueprint-details">
              <span>Files: {message.metadata.blueprint.files?.length || 0}</span>
              <span>Type: {message.metadata.blueprint.projectType}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`chat-interface ${className}`}>
      <div className="chat-header">
        <h2>AI Project Generator</h2>
        <div className="chat-status">
          {isLoading && <span className="status-indicator loading">AI is typing...</span>