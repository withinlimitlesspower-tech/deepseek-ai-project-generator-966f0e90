import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { AppError } from '../types/error.types';
import { ErrorResponse } from '../types/api.types';

/**
 * Global error handling middleware
 * Catches all errors in the application and returns consistent error responses
 */
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error with request context
  Logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    userId: req.user?.id || 'anonymous'
  });

  // Handle known AppError instances
  if (error instanceof AppError) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details || null,
        timestamp: new Date().toISOString()
      }
    };

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle validation errors (Joi, Zod, etc.)
  if (error.name === 'ValidationError') {
    const validationError = error as any;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validationError.details || validationError.errors,
        timestamp: new Date().toISOString()
      }
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle database errors
  if (error.name === 'MongoError' || error.name === 'SequelizeError') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : null,
        timestamp: new Date().toISOString()
      }
    };

    res.status(500).json(errorResponse);
    return;
  }

  // Handle JWT authentication errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    };

    res.status(401).json(errorResponse);
    return;
  }

  // Handle rate limiting errors
  if (error.name === 'RateLimitError') {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        details: 'Please try again later',
        timestamp: new Date().toISOString()
      }
    };

    res.status(429).json(errorResponse);
    return;
  }

  // Handle file system errors
  if (error.name === 'FileSystemError' || error.message.includes('ENOENT')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'FILE_SYSTEM_ERROR',
        message: 'File operation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : null,
        timestamp: new Date().toISOString()
      }
    };

    res.status(500).json(errorResponse);
    return;
  }

  // Handle AI service errors
  if (error.message.includes('AI') || error.message.includes('OpenAI') || error.message.includes('DeepSeek')) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'AI service unavailable',
        details: process.env.NODE_ENV === 'development' ? error.message : null,
        timestamp: new Date().toISOString()
      }
    };

    res.status(503).json(errorResponse);
    return;
  }

  // Default error handler for unknown errors
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      details: process.env.NODE_ENV === 'development' 
        ? {
            message: error.message,
            stack: error.stack,
            type: error.name
          }
        : null,
      timestamp: new Date().toISOString()
    }
  };

  res.status(500).json(errorResponse);
};

/**
 * Async error handler wrapper for Express routes
 * Eliminates the need for try-catch blocks in route handlers
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 Not Found error handler
 * Should be placed after all routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      details: null,
      timestamp: new Date().toISOString()
    }
  };

  res.status(404).json(errorResponse);
};

/**
 * Error boundary for unhandled promise rejections
 */
export const unhandledRejectionHandler = (reason: any, promise: Promise<any>) => {
  Logger.error('Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.stack : reason,
    promise: promise,
    timestamp: new Date().toISOString()
  });
};

/**
 * Error boundary for uncaught exceptions
 */
export const uncaughtExceptionHandler = (error: Error) => {
  Logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });

  // Graceful shutdown on critical errors
  setTimeout(() => {
    process.exit(1);
  }, 1000);
};

/**
 * Initialize global error handlers
 */
export const initializeErrorHandlers = (): void => {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', unhandledRejectionHandler);
  
  // Handle uncaught exceptions
  process.on('uncaughtException', uncaughtExceptionHandler);
  
  Logger.info('Global error handlers initialized');
};