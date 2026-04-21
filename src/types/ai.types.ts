// src/types/ai.types.ts
// TypeScript type definitions for AI interactions and project generation

// ==================== CORE AI TYPES ====================

/**
 * Represents the AI assistant's identity and capabilities
 */
export interface AIIdentity {
  name: string;
  model: string;
  version: string;
  expertise: string[];
  purpose: string;
}

/**
 * Base message structure for AI conversations
 */
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Conversation context for maintaining history
 */
export interface ConversationContext {
  sessionId: string;
  messages: AIMessage[];
  projectContext?: ProjectContext;
  userPreferences?: UserPreferences;
}

// ==================== PROJECT GENERATION TYPES ====================

/**
 * Project generation request
 */
export interface ProjectGenerationRequest {
  projectType: ProjectType;
  name: string;
  description: string;
  requirements: string[];
  technologies?: TechnologyStack;
  preferences?: ProjectPreferences;
}

/**
 * Available project types
 */
export enum ProjectType {
  WEB_APP = 'web-app',
  MOBILE_APP = 'mobile-app',
  API_SERVICE = 'api-service',
  LIBRARY = 'library',
  CLI_TOOL = 'cli-tool',
  FULL_STACK = 'full-stack',
  MACHINE_LEARNING = 'machine-learning',
  DATA_ANALYSIS = 'data-analysis',
  GAME = 'game',
  OTHER = 'other'
}

/**
 * Technology stack configuration
 */
export interface TechnologyStack {
  frontend?: string[];
  backend?: string[];
  database?: string[];
  devops?: string[];
  testing?: string[];
  other?: string[];
}

/**
 * Project preferences and constraints
 */
export interface ProjectPreferences {
  language: 'typescript' | 'javascript' | 'python' | 'java' | 'go' | 'rust' | 'other';
  framework?: string;
  architecture?: ArchitecturePattern;
  testingFramework?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'cargo' | 'other';
  deploymentTarget?: DeploymentTarget;
  codeStyle?: CodeStylePreferences;
}

/**
 * Architecture patterns
 */
export enum ArchitecturePattern {
  MVC = 'mvc',
  MVVM = 'mvvm',
  MICROSERVICES = 'microservices',
  MONOLITH = 'monolith',
  SERVERLESS = 'serverless',
  EVENT_DRIVEN = 'event-driven',
  LAYERED = 'layered',
  CLEAN_ARCHITECTURE = 'clean-architecture'
}

/**
 * Deployment targets
 */
export enum DeploymentTarget {
  VERCEL = 'vercel',
  NETLIFY = 'netlify',
  AWS = 'aws',
  GCP = 'gcp',
  AZURE = 'azure',
  HEROKU = 'heroku',
  DOCKER = 'docker',
  KUBERNETES = 'kubernetes',
  SELF_HOSTED = 'self-hosted'
}

/**
 * Code style preferences
 */
export interface CodeStylePreferences {
  indentSize: number;
  useTabs: boolean;
  quoteStyle: 'single' | 'double';
  semicolons: boolean;
  trailingCommas: 'none' | 'es5' | 'all';
  bracketSpacing: boolean;
  arrowParens: 'always' | 'avoid';
  lineLength: number;
}

// ==================== PROJECT STRUCTURE TYPES ====================

/**
 * Complete project structure
 */
export interface ProjectStructure {
  name: string;
  type: ProjectType;
  rootDirectory: string;
  files: ProjectFile[];
  directories: ProjectDirectory[];
  dependencies: Dependency[];
  scripts: Script[];
  configs: ConfigFile[];
}

/**
 * Individual project file
 */
export interface ProjectFile {
  path: string;
  name: string;
  content: string;
  type: FileType;
  language: ProgrammingLanguage;
  isGenerated: boolean;
  dependencies?: string[];
}

/**
 * Project directory
 */
export interface ProjectDirectory {
  path: string;
  name: string;
  children: (ProjectFile | ProjectDirectory)[];
  purpose?: string;
}

/**
 * File types
 */
export enum FileType {
  SOURCE = 'source',
  CONFIG = 'config',
  TEST = 'test',
  DOCUMENTATION = 'documentation',
  ASSET = 'asset',
  SCRIPT = 'script',
  OTHER = 'other'
}

/**
 * Programming languages
 */
export enum ProgrammingLanguage {
  TYPESCRIPT = 'typescript',
  JAVASCRIPT = 'javascript',
  PYTHON = 'python',
  JAVA = 'java',
  GO = 'go',
  RUST = 'rust',
  HTML = 'html',
  CSS = 'css',
  JSON = 'json',
  YAML = 'yaml',
  MARKDOWN = 'markdown',
  SHELL = 'shell',
  OTHER = 'other'
}

/**
 * Dependency information
 */
export interface Dependency {
  name: string;
  version: string;
  type: DependencyType;
  isDev: boolean;
  description?: string;
}

/**
 * Dependency types
 */
export enum DependencyType {
  NPM = 'npm',
  PIP = 'pip',
  CARGO = 'cargo',
  GO_MOD = 'go-mod',
  MAVEN = 'maven',
  GRADLE = 'gradle',
  OTHER = 'other'
}

/**
 * Script definition
 */
export interface Script {
  name: string;
  command: string;
  description?: string;
  category: ScriptCategory;
}

/**
 * Script categories
 */
export enum ScriptCategory {
  BUILD = 'build',
  TEST = 'test',
  DEV = 'dev',
  LINT = 'lint',
  FORMAT = 'format',
  DEPLOY = 'deploy',
  OTHER = 'other'
}

/**
 * Configuration file
 */
export interface ConfigFile {
  name: string;
  content: string;
  format: ConfigFormat;
  purpose: string;
}

/**
 * Configuration formats
 */
export enum ConfigFormat {
  JSON = 'json',
  YAML = 'yaml',
  TOML = 'toml',
  XML = 'xml',
  INI = 'ini',
  JS = 'javascript',
  OTHER = 'other'
}

// ==================== CONTEXT AND PREFERENCES ====================

/**
 * Project context for ongoing generation
 */
export interface ProjectContext {
  currentStep: GenerationStep;
  completedSteps: GenerationStep[];
  generatedFiles: string[];
  pendingTasks: string[];
  errors: GenerationError[];
  warnings: string[];
}

/**
 * Generation steps
 */
export enum GenerationStep {
  INITIALIZATION = 'initialization',
  REQUIREMENTS_ANALYSIS = 'requirements-analysis',
  ARCHITECTURE_DESIGN = 'architecture-design',
  FILE_STRUCTURE = 'file-structure',
  CODE_GENERATION = 'code-generation',
  DEPENDENCY_SETUP = 'dependency-setup',
  CONFIGURATION = 'configuration',
  TEST_SETUP = 'test-setup',
  DOCUMENTATION = 'documentation',
  VALIDATION = 'validation',
  FINALIZATION = 'finalization'
}

/**
 * User preferences for AI interaction
 */
export interface UserPreferences {
  codeQuality: 'minimal' | 'standard' | 'production';
  comments: 'none' | 'minimal' | 'detailed';
  errorHandling: 'basic' | 'comprehensive';
  testing: 'none' | 'basic' | 'comprehensive';
  documentation: 'none' | 'basic' | 'comprehensive';
  performance: 'standard' | 'optimized';
  security: 'basic' | 'enhanced';
}

// ==================== RESPONSE AND ERROR TYPES ====================

/**
 * Base response from AI operations
 */
export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AIError;
  warnings?: string[];
  metadata?: ResponseMetadata;
}

/**
 * Project generation response
 */
export interface ProjectGenerationResponse {
  project: ProjectStructure;
  generationTime: number;
  filesGenerated: number;
  totalSize: number;
  nextSteps?: string[];
}

/**
 * AI error types
 */
export interface AIError {
  code: ErrorCode;
  message: string;
  details?: any;
  recoverable: boolean;
  suggestion?: string;
}

/**
 * Error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'validation_error',
  GENERATION_ERROR = 'generation_error',
  CONTEXT_ERROR = 'context_error',
  DEPENDENCY_ERROR = 'dependency_error',
  CONFIGURATION_ERROR = 'configuration_error',
  FILE_SYSTEM_ERROR = 'file_system_error',
  TIMEOUT_ERROR = 'timeout_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  timestamp: Date;
  requestId: string;
  model: string;
  tokensUsed?: number;
  processingTime?: number;
}

// ==================== UTILITY TYPES ====================

/**
 * Blueprint for project generation
 */
export interface Project