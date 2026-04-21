import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AIProvider, AIRequest, AIResponse, AIError, AIConfig, AIModel } from '../types/ai.types';
import { ProjectBlueprint, ProjectContext } from '../types/project.types';
import { logger } from '../utils/logger';
import { config } from '../config/config';

/**
 * AI Integration Service
 * Handles communication with external AI providers
 */
export class AIIntegrationService {
    private providers: Map<AIProvider, AxiosInstance>;
    private activeProvider: AIProvider;
    private config: AIConfig;

    constructor() {
        this.providers = new Map();
        this.activeProvider = config.ai.defaultProvider;
        this.config = config.ai;
        
        this.initializeProviders();
    }

    /**
     * Initialize HTTP clients for all configured AI providers
     */
    private initializeProviders(): void {
        for (const [provider, providerConfig] of Object.entries(this.config.providers)) {
            const axiosInstance = axios.create({
                baseURL: providerConfig.baseUrl,
                timeout: providerConfig.timeout || 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${providerConfig.apiKey}`,
                    ...providerConfig.customHeaders
                }
            });

            // Add request interceptor for logging
            axiosInstance.interceptors.request.use(
                (config) => {
                    logger.debug(`AI Request to ${provider}: ${config.url}`);
                    return config;
                },
                (error) => {
                    logger.error(`AI Request error to ${provider}:`, error);
                    return Promise.reject(error);
                }
            );

            // Add response interceptor for error handling
            axiosInstance.interceptors.response.use(
                (response) => response,
                (error) => {
                    logger.error(`AI Response error from ${provider}:`, error);
                    return Promise.reject(this.normalizeError(error, provider as AIProvider));
                }
            );

            this.providers.set(provider as AIProvider, axiosInstance);
        }
    }

    /**
     * Generate project blueprint using AI
     */
    async generateProjectBlueprint(
        context: ProjectContext,
        model?: AIModel
    ): Promise<ProjectBlueprint> {
        try {
            const request: AIRequest = {
                prompt: this.buildProjectPrompt(context),
                model: model || this.config.defaultModel,
                temperature: this.config.temperature,
                maxTokens: this.config.maxTokens,
                context: {
                    projectType: context.projectType,
                    requirements: context.requirements,
                    constraints: context.constraints
                }
            };

            const response = await this.sendRequest(request);
            
            return this.parseBlueprintResponse(response, context);
        } catch (error) {
            logger.error('Failed to generate project blueprint:', error);
            throw this.handleAIError(error as AIError);
        }
    }

    /**
     * Continue conversation with AI
     */
    async continueConversation(
        messages: Array<{ role: string; content: string }>,
        model?: AIModel
    ): Promise<AIResponse> {
        try {
            const request: AIRequest = {
                messages,
                model: model || this.config.defaultModel,
                temperature: this.config.temperature,
                maxTokens: this.config.maxTokens
            };

            return await this.sendRequest(request);
        } catch (error) {
            logger.error('Failed to continue conversation:', error);
            throw this.handleAIError(error as AIError);
        }
    }

    /**
     * Validate project structure using AI
     */
    async validateProjectStructure(
        blueprint: ProjectBlueprint,
        context: ProjectContext
    ): Promise<{ isValid: boolean; issues: string[]; suggestions: string[] }> {
        try {
            const request: AIRequest = {
                prompt: this.buildValidationPrompt(blueprint, context),
                model: this.config.validationModel || this.config.defaultModel,
                temperature: 0.1, // Lower temperature for validation
                maxTokens: 1000
            };

            const response = await this.sendRequest(request);
            return this.parseValidationResponse(response);
        } catch (error) {
            logger.error('Failed to validate project structure:', error);
            throw this.handleAIError(error as AIError);
        }
    }

    /**
     * Switch active AI provider
     */
    switchProvider(provider: AIProvider): void {
        if (!this.providers.has(provider)) {
            throw new Error(`Provider ${provider} is not configured`);
        }
        
        this.activeProvider = provider;
        logger.info(`Switched AI provider to: ${provider}`);
    }

    /**
     * Get available AI models for current provider
     */
    getAvailableModels(): AIModel[] {
        const providerConfig = this.config.providers[this.activeProvider];
        return providerConfig?.availableModels || [];
    }

    /**
     * Get provider health status
     */
    async getProviderHealth(provider?: AIProvider): Promise<boolean> {
        const targetProvider = provider || this.activeProvider;
        const axiosInstance = this.providers.get(targetProvider);
        
        if (!axiosInstance) {
            throw new Error(`Provider ${targetProvider} is not configured`);
        }

        try {
            const response = await axiosInstance.get('/health', { timeout: 5000 });
            return response.status === 200;
        } catch (error) {
            logger.warn(`Provider ${targetProvider} health check failed:`, error);
            return false;
        }
    }

    /**
     * Send request to active AI provider
     */
    private async sendRequest(request: AIRequest): Promise<AIResponse> {
        const axiosInstance = this.providers.get(this.activeProvider);
        
        if (!axiosInstance) {
            throw new Error(`Active provider ${this.activeProvider} is not configured`);
        }

        try {
            const endpoint = this.config.providers[this.activeProvider].endpoints.completion;
            const response: AxiosResponse = await axiosInstance.post(endpoint, request);
            
            return this.normalizeResponse(response.data, this.activeProvider);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Normalize response from different AI providers
     */
    private normalizeResponse(data: any, provider: AIProvider): AIResponse {
        const providerConfig = this.config.providers[provider];
        const normalizer = providerConfig.responseNormalizer;
        
        if (normalizer && typeof normalizer === 'function') {
            return normalizer(data);
        }

        // Default normalization
        return {
            id: data.id || `ai-${Date.now()}`,
            content: data.choices?.[0]?.message?.content || data.content || data.text || '',
            model: data.model || this.config.defaultModel,
            provider,
            usage: {
                promptTokens: data.usage?.prompt_tokens || data.usage?.promptTokens || 0,
                completionTokens: data.usage?.completion_tokens || data.usage?.completionTokens || 0,
                totalTokens: data.usage?.total_tokens || data.usage?.totalTokens || 0
            },
            metadata: {
                finishReason: data.choices?.[0]?.finish_reason || 'completed',
                created: data.created || Date.now()
            }
        };
    }

    /**
     * Normalize errors from different AI providers
     */
    private normalizeError(error: any, provider: AIProvider): AIError {
        const status = error.response?.status || 500;
        const providerError = error.response?.data?.error || error.response?.data;
        
        return {
            message: providerError?.message || error.message || 'Unknown AI error',
            code: providerError?.code || `AI_${status}`,
            statusCode: status,
            provider,
            details: providerError?.details || error.response?.data
        };
    }

    /**
     * Build project generation prompt
     */
    private buildProjectPrompt(context: ProjectContext): string {
        return `
        Generate a complete project blueprint based on the following requirements:
        
        Project Type: ${context.projectType}
        Requirements: ${JSON.stringify(context.requirements, null, 2)}
        Constraints: ${JSON.stringify(context.constraints, null, 2)}
        Tech Stack: ${context.techStack?.join(', ') || 'Not specified'}
        
        Please provide:
        1. Project structure with directories and files
        2. Key components and their responsibilities
        3. API endpoints if applicable
        4. Database schema if needed
        5. Configuration files
        6. Dependencies
        
        Format the response as a structured JSON blueprint.
        `;
    }

    /**
     * Build validation prompt
     */
    private buildValidationPrompt(blueprint: ProjectBlueprint, context: ProjectContext): string {
        return `
        Validate this project blueprint against the requirements:
        
        Original Requirements: ${JSON.stringify(context.requirements, null, 2)}
        Project Type: ${context.projectType}
        
        Blueprint to validate:
        ${JSON.stringify(blueprint, null, 2)}
        
        Check for:
        1. Missing requirements
        2. Architectural issues
        3. Security concerns
        4. Performance considerations
        5. Best practices violations
        
        Provide validation results with issues and suggestions.
        `;
    }

    /**
     * Parse AI response into project blueprint
     */
    private parseBlueprintResponse(response: AIResponse,