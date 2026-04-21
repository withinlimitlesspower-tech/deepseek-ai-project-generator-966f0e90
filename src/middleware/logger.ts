import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Types for log entries
interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  method: string;
  url: string;
  statusCode?: number;
  responseTime?: number;
  ip?: string;
  userAgent?: string;
  userId?: string;
  projectId?: string;
  message?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Configuration interface
interface LoggerConfig {
  logToConsole: boolean;
  logToFile: boolean;
  logDirectory: string;
  maxFileSize: number; // in bytes
  maxFiles: number;
  logLevel: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  excludePaths: string[];
  includeRequestHeaders: string[];
  includeResponseHeaders: string[];
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  logToConsole: true,
  logToFile: true,
  logDirectory: path.join(process.cwd(), 'logs'),
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  logLevel: 'INFO',
  excludePaths: ['/health', '/favicon.ico'],
  includeRequestHeaders: ['user-agent', 'content-type', 'authorization'],
  includeResponseHeaders: ['content-type', 'content-length'],
};

class LoggerMiddleware {
  private config: LoggerConfig;
  private currentLogFile: string;
  private logQueue: LogEntry[] = [];
  private isWriting = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentLogFile = this.getCurrentLogFileName();
    this.ensureLogDirectory();
    this.startLogRotationCheck();
  }

  /**
   * Ensures log directory exists
   */
  private ensureLogDirectory(): void {
    if (this.config.logToFile && !fs.existsSync(this.config.logDirectory)) {
      try {
        fs.mkdirSync(this.config.logDirectory, { recursive: true });
      } catch (error) {
        console.error('Failed to create log directory:', error);
      }
    }
  }

  /**
   * Gets current log file name based on date
   */
  private getCurrentLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.config.logDirectory, `app-${date}.log`);
  }

  /**
   * Checks if log rotation is needed
   */
  private startLogRotationCheck(): void {
    if (this.config.logToFile) {
      setInterval(() => this.checkLogRotation(), 60000); // Check every minute
    }
  }

  /**
   * Checks and performs log rotation if needed
   */
  private async checkLogRotation(): Promise<void> {
    try {
      if (fs.existsSync(this.currentLogFile)) {
        const stats = fs.statSync(this.currentLogFile);
        if (stats.size > this.config.maxFileSize) {
          await this.rotateLogs();
        }
      }
    } catch (error) {
      console.error('Log rotation check failed:', error);
    }
  }

  /**
   * Rotates log files
   */
  private async rotateLogs(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.logDirectory)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .sort();

      // Remove oldest files if we exceed maxFiles
      while (files.length >= this.config.maxFiles) {
        const oldestFile = files.shift();
        if (oldestFile) {
          fs.unlinkSync(path.join(this.config.logDirectory, oldestFile));
        }
      }

      // Create new log file
      this.currentLogFile = this.getCurrentLogFileName();
    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }

  /**
   * Determines if path should be excluded from logging
   */
  private shouldExcludePath(url: string): boolean {
    return this.config.excludePaths.some(excludedPath => 
      url.startsWith(excludedPath)
    );
  }

  /**
   * Gets filtered request headers
   */
  private getFilteredHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
    const filtered: Record<string, string> = {};
    
    this.config.includeRequestHeaders.forEach(header => {
      const value = headers[header.toLowerCase()];
      if (value) {
        filtered[header] = Array.isArray(value) ? value.join(', ') : value;
      }
    });

    return filtered;
  }

  /**
   * Writes log entry to file
   */
  private async writeLogToFile(entry: LogEntry): Promise<void> {
    if (!this.config.logToFile) return;

    this.logQueue.push(entry);
    
    if (!this.isWriting) {
      this.isWriting = true;
      await this.processLogQueue();
    }
  }

  /**
   * Processes the log queue
   */
  private async processLogQueue(): Promise<void> {
    while (this.logQueue.length > 0) {
      const entry = this.logQueue.shift();
      if (entry) {
        try {
          const logLine = JSON.stringify(entry) + '\n';
          fs.appendFileSync(this.currentLogFile, logLine, { encoding: 'utf8' });
        } catch (error) {
          console.error('Failed to write log to file:', error);
        }
      }
    }
    this.isWriting = false;
  }

  /**
   * Logs to console based on log level
   */
  private logToConsole(entry: LogEntry): void {
    if (!this.config.logToConsole) return;

    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const levelColors = {
      INFO: '\x1b[32m', // Green
      WARN: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m', // Red
      DEBUG: '\x1b[36m', // Cyan
    };
    const resetColor = '\x1b[0m';

    const message = entry.message || `${entry.method} ${entry.url} ${entry.statusCode || ''}`;
    
    console.log(
      `${levelColors[entry.level]}[${entry.level}]${resetColor} ${timestamp} ${message}` +
      (entry.responseTime ? ` (${entry.responseTime}ms)` : '') +
      (entry.error ? ` - Error: ${entry.error.message}` : '')
    );
  }

  /**
   * Creates middleware function
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Skip logging for excluded paths
      if (this.shouldExcludePath(req.url)) {
        return next();
      }

      const startTime = Date.now();
      const requestId = uuidv4();
      const requestHeaders = this.getFilteredHeaders(req.headers);

      // Store original end method
      const originalEnd = res.end;
      const originalJson = res.json;

      // Override end method to capture response data
      res.end = ((...args: any[]) => {
        const responseTime = Date.now() - startTime;
        
        // Create log entry
        const logEntry: LogEntry = {
          id: requestId,
          timestamp: new Date().toISOString(),
          level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          responseTime,
          ip: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent'] as string,
          userId: (req as any).user?.id,
          projectId: (req as any).projectId,
          message: `${req.method} ${req.url} - ${res.statusCode}`,
        };

        // Add error information if present
        if (res.statusCode >= 400) {
          const error = (req as any).error;
          if (error) {
            logEntry.error = {
              name: error.name || 'Error',
              message: error.message || 'Unknown error',
              stack: this.config.logLevel === 'DEBUG' ? error.stack : undefined,
            };
          }
        }

        // Log based on configuration
        if (this.shouldLogLevel(logEntry.level)) {
          this.logToConsole(logEntry);
          this.writeLogToFile(logEntry);
        }

        // Call original end method
        return originalEnd.apply(res, args);
      }) as any;

      // Override json method to capture JSON responses
      res.json = ((body: any) => {
        (req as any).responseBody = body;
        return originalJson.call(res, body);
      }) as any;

      // Log request start for DEBUG level
      if (this.config.log