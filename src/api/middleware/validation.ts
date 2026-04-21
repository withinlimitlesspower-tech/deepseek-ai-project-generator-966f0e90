import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../../types/ai.types';
import { logger } from '../../utils/logger';

/**
 * Validation middleware factory
 * Creates middleware for validating request data against Zod schemas
 */
export class ValidationMiddleware {
  /**
   * Validate request body against provided schema
   */
  static validateBody(schema: z.ZodSchema<any>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validatedData = schema.parse(req.body);
        req.body = validatedData;
        next();
      } catch (error) {
        ValidationMiddleware.handleValidationError(error, res, 'body');
      }
    };
  }

  /**
   * Validate request query parameters against provided schema
   */
  static validateQuery(schema: z.ZodSchema<any>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validatedData = schema.parse(req.query);
        req.query = validatedData;
        next();
      } catch (error) {
        ValidationMiddleware.handleValidationError(error, res, 'query');
      }
    };
  }

  /**
   * Validate request parameters against provided schema
   */
  static validateParams(schema: z.ZodSchema<any>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validatedData = schema.parse(req.params);
        req.params = validatedData;
        next();
      } catch (error) {
        ValidationMiddleware.handleValidationError(error, res, 'params');
      }
    };
  }

  /**
   * Validate request headers against provided schema
   */
  static validateHeaders(schema: z.ZodSchema<any>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const validatedData = schema.parse(req.headers);
        req.headers = { ...req.headers, ...validatedData };
        next();
      } catch (error) {
        ValidationMiddleware.handleValidationError(error, res, 'headers');
      }
    };
  }

  /**
   * Comprehensive validation for multiple request parts
   */
  static validateAll(validations: {
    body?: z.ZodSchema<any>;
    query?: z.ZodSchema<any>;
    params?: z.ZodSchema<any>;
    headers?: z.ZodSchema<any>;
  }) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (validations.body) {
          req.body = validations.body.parse(req.body);
        }
        if (validations.query) {
          req.query = validations.query.parse(req.query);
        }
        if (validations.params) {
          req.params = validations.params.parse(req.params);
        }
        if (validations.headers) {
          req.headers = { ...req.headers, ...validations.headers.parse(req.headers) };
        }
        next();
      } catch (error) {
        ValidationMiddleware.handleValidationError(error, res, 'multiple');
      }
    };
  }

  /**
   * Handle validation errors consistently
   */
  private static handleValidationError(
    error: unknown,
    res: Response,
    validationType: string
  ): void {
    if (error instanceof ZodError) {
      const validationError: ValidationError = {
        type: 'VALIDATION_ERROR',
        message: `Validation failed for ${validationType}`,
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        })),
        timestamp: new Date().toISOString()
      };

      logger.warn(`Validation error in ${validationType}:`, validationError);

      res.status(400).json({
        success: false,
        error: validationError
      });
    } else {
      logger.error('Unexpected validation error:', error);
      
      res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred during validation',
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  /**
   * Sanitize input data to prevent XSS attacks
   */
  static sanitizeInput(req: Request, res: Response, next: NextFunction): void {
    try {
      // Sanitize body
      if (req.body && typeof req.body === 'object') {
        req.body = ValidationMiddleware.sanitizeObject(req.body);
      }

      // Sanitize query
      if (req.query && typeof req.query === 'object') {
        req.query = ValidationMiddleware.sanitizeObject(req.query);
      }

      // Sanitize params
      if (req.params && typeof req.params === 'object') {
        req.params = ValidationMiddleware.sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      logger.error('Sanitization error:', error);
      next(); // Continue even if sanitization fails
    }
  }

  /**
   * Recursively sanitize object properties
   */
  private static sanitizeObject(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => ValidationMiddleware.sanitizeObject(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = ValidationMiddleware.sanitizeValue(value);
      }
      return sanitized;
    }

    return ValidationMiddleware.sanitizeValue(obj);
  }

  /**
   * Sanitize individual values
   */
  private static sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Basic XSS prevention - escape HTML special characters
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    return value;
  }

  /**
   * Validate file uploads
   */
  static validateFileUpload(options: {
    allowedMimeTypes?: string[];
    maxFileSize?: number;
    maxFiles?: number;
  } = {}) {
    const {
      allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      maxFileSize = 5 * 1024 * 1024, // 5MB default
      maxFiles = 5
    } = options;

    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
          return next();
        }

        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

        // Check number of files
        if (files.length > maxFiles) {
          throw new Error(`Maximum ${maxFiles} files allowed`);
        }

        // Validate each file
        for (const file of files) {
          if (!('mimetype' in file) || !('size' in file)) {
            throw new Error('Invalid file structure');
          }

          // Check MIME type
          if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
          }

          // Check file size
          if (file.size > maxFileSize) {
            throw new Error(`File ${file.originalname} exceeds maximum size of ${maxFileSize / (1024 * 1024)}MB`);
          }
        }

        next();
      } catch (error) {
        const validationError: ValidationError = {
          type: 'FILE_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'File validation failed',
          timestamp: new Date().toISOString()
        };

        logger.warn('File validation error:', validationError);

        res.status(400).json({
          success: false,
          error: validationError