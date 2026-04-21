import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Define environment schema for validation
const EnvironmentSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Database Configuration
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_MIN: z.string().transform(Number).default('2'),
  DATABASE_POOL_MAX: z.string().transform(Number).default('10'),
  
  // JWT Configuration
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),
  
  // API Configuration
  API_PREFIX: z.string().default('/api/v1'),
  API_RATE_LIMIT_WINDOW: z.string().transform(Number).default('900000'), // 15 minutes in ms
  API_RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  
  // AI Configuration
  AI_MODEL_NAME: z.string().default('deepseek-v3.2'),
  AI_MAX_TOKENS: z.string().transform(Number).default('4096'),
  AI_TEMPERATURE: z.string().transform(Number).default('0.7'),
  
  // File Storage Configuration
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('./logs'),
  
  // CORS Configuration
  CORS_ORIGIN: z.string().default('*'),
  
  // Cache Configuration
  REDIS_URL: z.string().optional(),
  CACHE_TTL: z.string().transform(Number).default('3600'), // 1 hour in seconds
});

// Type for validated environment variables
export type Environment = z.infer<typeof EnvironmentSchema>;

// Environment variable loader with validation
class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: Environment;
  private validated: boolean = false;

  private constructor() {
    this.config = this.loadEnvironment();
  }

  public static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private loadEnvironment(): Environment {
    try {
      // Build environment object from process.env
      const envObject = {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_POOL_MIN: process.env.DATABASE_POOL_MIN,
        DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
        API_PREFIX: process.env.API_PREFIX,
        API_RATE_LIMIT_WINDOW: process.env.API_RATE_LIMIT_WINDOW,
        API_RATE_LIMIT_MAX: process.env.API_RATE_LIMIT_MAX,
        AI_MODEL_NAME: process.env.AI_MODEL_NAME,
        AI_MAX_TOKENS: process.env.AI_MAX_TOKENS,
        AI_TEMPERATURE: process.env.AI_TEMPERATURE,
        UPLOAD_DIR: process.env.UPLOAD_DIR,
        MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_DIR: process.env.LOG_DIR,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        REDIS_URL: process.env.REDIS_URL,
        CACHE_TTL: process.env.CACHE_TTL,
      };

      // Validate environment variables
      const validatedConfig = EnvironmentSchema.parse(envObject);
      this.validated = true;
      
      // Log successful validation (only in non-production)
      if (validatedConfig.NODE_ENV !== 'production') {
        console.log('✅ Environment configuration validated successfully');
      }
      
      return validatedConfig;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingVars = error.errors
          .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
          .map(err => err.path.join('.'));
        
        const errorMessage = `❌ Environment validation failed:\n${
          missingVars.length > 0 
            ? `Missing required variables: ${missingVars.join(', ')}`
            : error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
        }`;
        
        throw new Error(errorMessage);
      }
      throw error;
    }
  }

  // Get entire configuration
  public getConfig(): Environment {
    if (!this.validated) {
      throw new Error('Environment configuration has not been validated');
    }
    return this.config;
  }

  // Get individual configuration values with type safety
  public get<T extends keyof Environment>(key: T): Environment[T] {
    const config = this.getConfig();
    const value = config[key];
    
    if (value === undefined) {
      throw new Error(`Configuration key "${String(key)}" is not defined`);
    }
    
    return value;
  }

  // Check if running in development mode
  public isDevelopment(): boolean {
    return this.get('NODE_ENV') === 'development';
  }

  // Check if running in production mode
  public isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  // Check if running in test mode
  public isTest(): boolean {
    return this.get('NODE_ENV') === 'test';
  }

  // Get database configuration object
  public getDatabaseConfig() {
    return {
      url: this.get('DATABASE_URL'),
      pool: {
        min: this.get('DATABASE_POOL_MIN'),
        max: this.get('DATABASE_POOL_MAX'),
      },
    };
  }

  // Get API configuration object
  public getApiConfig() {
    return {
      prefix: this.get('API_PREFIX'),
      rateLimit: {
        windowMs: this.get('API_RATE_LIMIT_WINDOW'),
        max: this.get('API_RATE_LIMIT_MAX'),
      },
    };
  }

  // Get AI configuration object
  public getAiConfig() {
    return {
      modelName: this.get('AI_MODEL_NAME'),
      maxTokens: this.get('AI_MAX_TOKENS'),
      temperature: this.get('AI_TEMPERATURE'),
    };
  }

  // Get JWT configuration object
  public getJwtConfig() {
    return {
      secret: this.get('JWT_SECRET'),
      expiresIn: this.get('JWT_EXPIRES_IN'),
    };
  }

  // Get file upload configuration
  public getUploadConfig() {
    return {
      uploadDir: path.resolve(process.cwd(), this.get('UPLOAD_DIR')),
      maxFileSize: this.get('MAX_FILE_SIZE'),
    };
  }

  // Get logging configuration
  public getLogConfig() {
    return {
      level: this.get('LOG_LEVEL'),
      dir: path.resolve(process.cwd(), this.get('LOG_DIR')),
    };
  }

  // Get CORS configuration
  public getCorsConfig() {
    const origin = this.get('CORS_ORIGIN');
    return {
      origin: origin === '*' ? '*' : origin.split(',').map(o => o.trim()),
      credentials: true,
    };
  }

  // Get cache configuration
  public getCacheConfig() {
    return {
      redisUrl: this.get('REDIS_URL'),
      ttl: this.get('CACHE_TTL'),
    };
  }

  // Reload environment variables (useful for testing)
  public reload(): void {
    dotenv.config();
    this.config = this.loadEnvironment();
  }
}

// Export singleton instance
export const env = EnvironmentConfig.getInstance();

// Export helper functions for direct access
export const getEnv = <T extends keyof Environment>(key: T): Environment[T] => env.get(key);
export const isDevelopment = (): boolean => env.isDevelopment();
export const isProduction = (): boolean => env.isProduction();
export const isTest = (): boolean => env.isTest();

// Default export
export default env;