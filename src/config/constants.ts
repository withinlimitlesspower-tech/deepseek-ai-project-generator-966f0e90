// src/config/constants.ts

/**
 * Application constants and configuration
 * Centralized configuration for the AI Project Generator
 */

// Environment constants
export const ENV = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  TEST: 'test',
  STAGING: 'staging'
} as const;

// API constants
export const API = {
  VERSION: 'v1',
  BASE_PATH: '/api',
  MAX_REQUEST_SIZE: '10mb',
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  CORS_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  CORS_HEADERS: ['Content-Type', 'Authorization', 'X-Requested-With']
} as const;

// Database constants
export const DATABASE = {
  MAX_POOL_SIZE: 10,
  MIN_POOL_SIZE: 2,
  CONNECTION_TIMEOUT: 30000,
  IDLE_TIMEOUT: 60000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  QUERY_TIMEOUT: 30000,
  MIGRATIONS_TABLE: 'knex_migrations',
  SEEDS_DIRECTORY: './seeds'
} as const;

// Project generation constants
export const PROJECT = {
  MAX_FILES_PER_PROJECT: 50,
  MAX_FILE_SIZE_BYTES: 1024 * 1024, // 1MB
  MAX_PROJECT_NAME_LENGTH: 100,
  MIN_PROJECT_NAME_LENGTH: 3,
  ALLOWED_FILE_EXTENSIONS: [
    '.ts', '.js', '.tsx', '.jsx', '.json', '.md', '.txt',
    '.css', '.scss', '.html', '.yml', '.yaml', '.env',
    '.sql', '.graphql', '.prisma', '.dockerfile'
  ],
  DEFAULT_PROJECT_STRUCTURE: {
    ROOT_FILES: ['package.json', 'README.md', '.gitignore', 'tsconfig.json'],
    SRC_DIRECTORIES: ['src', 'public', 'tests', 'docs', 'config']
  },
  GENERATION_TIMEOUT_MS: 300000, // 5 minutes
  MAX_CONCURRENT_GENERATIONS: 3
} as const;

// Conversation constants
export const CONVERSATION = {
  MAX_MESSAGE_LENGTH: 5000,
  MAX_MESSAGES_PER_CONVERSATION: 100,
  MAX_CONVERSATION_TITLE_LENGTH: 200,
  MESSAGE_TYPES: {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system'
  } as const,
  CONTEXT_WINDOW_SIZE: 10, // Number of messages to keep in context
  SESSION_TIMEOUT_MS: 30 * 60 * 1000 // 30 minutes
} as const;

// AI Assistant constants
export const AI = {
  MODEL_NAME: 'DeepSeek V3.2',
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.7,
  TOP_P: 0.9,
  FREQUENCY_PENALTY: 0.0,
  PRESENCE_PENALTY: 0.0,
  STOP_SEQUENCES: ['\n\n', '', '---'],
  RESPONSE_FORMATS: {
    CODE: 'code',
    TEXT: 'text',
    JSON: 'json',
    MARKDOWN: 'markdown'
  } as const,
  DEFAULT_RESPONSE_FORMAT: 'markdown' as const
} as const;

// File generation constants
export const FILE = {
  MAX_PATH_LENGTH: 255,
  MAX_DIRECTORY_DEPTH: 10,
  RESERVED_FILENAMES: ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'],
  ILLEGAL_CHARACTERS: ['<', '>', ':', '"', '|', '?', '*', '\\', '/'],
  ENCODING: 'utf-8' as const
} as const;

// Validation constants
export const VALIDATION = {
  PROJECT_NAME_REGEX: /^[a-zA-Z0-9][a-zA-Z0-9\s\-_\.]*[a-zA-Z0-9]$/,
  FILENAME_REGEX: /^[a-zA-Z0-9][a-zA-Z0-9\s\-_\.]*[a-zA-Z0-9]$/,
  PATH_REGEX: /^[a-zA-Z0-9][a-zA-Z0-9\/\-\_\.\s]*[a-zA-Z0-9]$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128
} as const;

// Security constants
export const SECURITY = {
  JWT_SECRET_MIN_LENGTH: 32,
  PASSWORD_HASH_ROUNDS: 12,
  SESSION_EXPIRY_HOURS: 24,
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  API_KEY_LENGTH: 32,
  RATE_LIMIT_BY_IP: true,
  RATE_LIMIT_BY_USER: true,
  CSRF_ENABLED: process.env.NODE_ENV === ENV.PRODUCTION,
  HELMET_ENABLED: true,
  CONTENT_SECURITY_POLICY: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'"],
    STYLE_SRC: ["'self'", "'unsafe-inline'"],
    IMG_SRC: ["'self'", "data:", "https:"],
    CONNECT_SRC: ["'self'"]
  }
} as const;

// Logging constants
export const LOGGING = {
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug',
    TRACE: 'trace'
  } as const,
  DEFAULT_LEVEL: 'info' as const,
  MAX_FILE_SIZE: '10m',
  MAX_FILES: '14d',
  DATE_PATTERN: 'YYYY-MM-DD',
  TIMEZONE: 'UTC'
} as const;

// Error codes and messages
export const ERRORS = {
  // HTTP Status Codes
  HTTP: {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },

  // Error Messages
  MESSAGES: {
    // Project errors
    PROJECT_NOT_FOUND: 'Project not found',
    PROJECT_NAME_EXISTS: 'Project name already exists',
    PROJECT_GENERATION_FAILED: 'Project generation failed',
    PROJECT_VALIDATION_FAILED: 'Project validation failed',
    
    // File errors
    FILE_TOO_LARGE: 'File size exceeds maximum limit',
    INVALID_FILE_EXTENSION: 'Invalid file extension',
    INVALID_FILE_PATH: 'Invalid file path',
    FILE_GENERATION_FAILED: 'File generation failed',
    
    // Conversation errors
    CONVERSATION_NOT_FOUND: 'Conversation not found',
    MESSAGE_TOO_LONG: 'Message exceeds maximum length',
    INVALID_MESSAGE_TYPE: 'Invalid message type',
    
    // AI errors
    AI_SERVICE_UNAVAILABLE: 'AI service is currently unavailable',
    AI_RESPONSE_TIMEOUT: 'AI response timeout',
    AI_INVALID_REQUEST: 'Invalid AI request',
    
    // Validation errors
    VALIDATION_FAILED: 'Validation failed',
    INVALID_INPUT: 'Invalid input provided',
    MISSING_REQUIRED_FIELD: 'Required field is missing',
    
    // Authentication errors
    UNAUTHORIZED_ACCESS: 'Unauthorized access',
    INVALID_CREDENTIALS: 'Invalid credentials',