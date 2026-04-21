import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../types/ai.types';

// Extend Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        email: string;
      };
    }
  }
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Token blacklist for logout functionality
const tokenBlacklist = new Set<string>();

/**
 * Interface for JWT payload
 */
interface JWTPayload {
  userId: string;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 * @param userId - User ID
 * @param role - User role
 * @param email - User email
 * @returns JWT token
 */
export const generateToken = (userId: string, role: UserRole, email: string): string => {
  const payload: JWTPayload = {
    userId,
    role,
    email
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      throw new Error('Token has been revoked');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

/**
 * Add token to blacklist (for logout)
 * @param token - Token to blacklist
 */
export const blacklistToken = (token: string): void => {
  tokenBlacklist.add(token);
  
  // Clean up old tokens periodically (in production, use Redis with TTL)
  if (tokenBlacklist.size > 1000) {
    // Simple cleanup strategy - remove first 100 tokens
    const tokens = Array.from(tokenBlacklist).slice(0, 100);
    tokens.forEach(t => tokenBlacklist.delete(t));
  }
};

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No token provided or invalid format. Use: Bearer <token>'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      role: decoded.role,
      email: decoded.email
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication'
    });
  }
};

/**
 * Role-based authorization middleware
 * @param allowedRoles - Array of roles allowed to access the route
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Check if user has required role
      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Sets user if token is valid, but doesn't require it
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      
      if (decoded) {
        req.user = {
          id: decoded.userId,
          role: decoded.role,
          email: decoded.email
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    // Continue without authentication on error
    next();
  }
};

/**
 * Rate limiting middleware (basic implementation)
 * In production, use a proper rate limiter like express-rate-limit
 */
export const rateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      
      let clientData = requests.get(ip);
      
      if (!clientData || now > clientData.resetTime) {
        clientData = {
          count: 0,
          resetTime: now + windowMs
        };
        requests.set(ip, clientData);
      }
      
      clientData.count++;
      
      // Clean up old entries periodically
      if (requests.size > 1000) {
        for (const [key, data] of requests.entries()) {
          if (now > data.resetTime) {
            requests.delete(key);
          }
        }
      }
      
      if (clientData.count > maxRequests) {
        res.status(429).json({
          success: false,
          error: 'Too many requests',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
        });
        return;
      }
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000).toString());
      
      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Allow request on error
      next();
    }
  };
};

/**
 * Validate API key middleware
 * For machine-to-machine authentication
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'API key required'
      });
      return;
    }
    
    // In production, validate against database or environment variable
    const validApiKeys = process.env.API_KEYS?.split(',') || [];
    
    if (!validApiKeys.includes(apiKey as string)) {
      res.status(403).json({
        success: false,
        error: 'Invalid API key'
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('API key validation