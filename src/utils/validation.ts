// src/utils/validation.ts

/**
 * Input validation and sanitization utilities
 * Provides comprehensive validation functions for various data types
 */

// Types for validation results
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  sanitizedValue?: any;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  customValidator?: (value: any) => ValidationResult;
}

/**
 * Main validation class
 */
export class Validator {
  /**
   * Validate a value against a set of rules
   */
  static validate(value: any, rules: ValidationRule): ValidationResult {
    try {
      // Check required field
      if (rules.required && (value === undefined || value === null || value === '')) {
        return {
          isValid: false,
          message: 'This field is required'
        };
      }

      // If value is not required and empty, it's valid
      if (!rules.required && (value === undefined || value === null || value === '')) {
        return { isValid: true, sanitizedValue: value };
      }

      // Type validation
      if (rules.type) {
        const typeResult = this.validateType(value, rules.type);
        if (!typeResult.isValid) {
          return typeResult;
        }
      }

      // String-specific validations
      if (typeof value === 'string') {
        const stringResult = this.validateString(value, rules);
        if (!stringResult.isValid) {
          return stringResult;
        }
      }

      // Number-specific validations
      if (typeof value === 'number') {
        const numberResult = this.validateNumber(value, rules);
        if (!numberResult.isValid) {
          return numberResult;
        }
      }

      // Array-specific validations
      if (Array.isArray(value)) {
        const arrayResult = this.validateArray(value, rules);
        if (!arrayResult.isValid) {
          return arrayResult;
        }
      }

      // Custom validator
      if (rules.customValidator) {
        const customResult = rules.customValidator(value);
        if (!customResult.isValid) {
          return customResult;
        }
      }

      // Sanitize the value
      const sanitizedValue = this.sanitizeValue(value, rules.type);

      return {
        isValid: true,
        sanitizedValue
      };
    } catch (error) {
      return {
        isValid: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate multiple fields at once
   */
  static validateMultiple(fields: Record<string, { value: any; rules: ValidationRule }>): {
    isValid: boolean;
    results: Record<string, ValidationResult>;
    sanitizedData: Record<string, any>;
  } {
    const results: Record<string, ValidationResult> = {};
    const sanitizedData: Record<string, any> = {};

    let allValid = true;

    for (const [fieldName, { value, rules }] of Object.entries(fields)) {
      const result = this.validate(value, rules);
      results[fieldName] = result;

      if (!result.isValid) {
        allValid = false;
      } else {
        sanitizedData[fieldName] = result.sanitizedValue;
      }
    }

    return {
      isValid: allValid,
      results,
      sanitizedData
    };
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || typeof email !== 'string') {
      return {
        isValid: false,
        message: 'Email must be a valid string'
      };
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(trimmedEmail)) {
      return {
        isValid: false,
        message: 'Please enter a valid email address'
      };
    }

    // Additional email validation
    if (trimmedEmail.length > 254) {
      return {
        isValid: false,
        message: 'Email address is too long'
      };
    }

    return {
      isValid: true,
      sanitizedValue: trimmedEmail
    };
  }

  /**
   * Validate URL
   */
  static validateUrl(url: string): ValidationResult {
    try {
      if (!url || typeof url !== 'string') {
        return {
          isValid: false,
          message: 'URL must be a valid string'
        };
      }

      const trimmedUrl = url.trim();
      
      // Try to parse as URL
      const parsedUrl = new URL(trimmedUrl.includes('://') ? trimmedUrl : `https://${trimmedUrl}`);
      
      // Validate protocol
      const allowedProtocols = ['http:', 'https:', 'ftp:', 'ftps:'];
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        return {
          isValid: false,
          message: 'URL must use a valid protocol (http, https, ftp, ftps)'
        };
      }

      // Validate hostname
      if (!parsedUrl.hostname) {
        return {
          isValid: false,
          message: 'URL must contain a valid hostname'
        };
      }

      return {
        isValid: true,
        sanitizedValue: parsedUrl.toString()
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'Please enter a valid URL'
      };
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string, options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
  } = {}): ValidationResult {
    const {
      minLength = 8,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true
    } = options;

    if (!password || typeof password !== 'string') {
      return {
        isValid: false,
        message: 'Password must be a valid string'
      };
    }

    const errors: string[] = [];

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        message: errors.join(', ')
      };
    }

    return {
      isValid: true,
      sanitizedValue: password
    };
  }

  /**
   * Validate phone number (basic international format)
   */
  static validatePhoneNumber(phone: string): ValidationResult {
    if (!phone || typeof phone !== 'string') {
      return {
        isValid: false,
        message: 'Phone number must be a valid string'
      };
    }

    // Remove all non-digit characters except plus sign
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Basic validation: at least 10 digits, can start with +
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    
    if (!phoneRegex.test(cleaned)) {
      return {
        isValid: false,
        message: 'Please enter a valid phone number (10-15 digits, optional + prefix)'
      };
    }

    return {
      isValid: true,
      sanitizedValue: cleaned
    };
  }

  /**
   * Sanitize HTML input to prevent XSS
   */
  static sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    // Basic HTML sanitization - remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '');
  }

  /**
   * Sanitize user input by trimming and escaping special characters
   */
  static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return