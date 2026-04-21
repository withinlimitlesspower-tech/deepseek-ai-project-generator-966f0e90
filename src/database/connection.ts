import mongoose from 'mongoose';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Database connection manager for MongoDB using Mongoose
 * Handles connection lifecycle, error handling, and reconnection logic
 */
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private readonly maxRetries: number = 5;
  private readonly retryDelay: number = 5000; // 5 seconds

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance of DatabaseConnection
   */
  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Establish connection to MongoDB database
   * @returns Promise<boolean> - Connection success status
   */
  public async connect(): Promise<boolean> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return true;
    }

    try {
      const mongoUri = this.buildMongoUri();
      
      logger.info(`Attempting to connect to MongoDB (Attempt ${this.connectionAttempts + 1}/${this.maxRetries})`);
      logger.debug(`Connection URI: ${this.maskPassword(mongoUri)}`);

      // Set Mongoose options
      const options: mongoose.ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        retryWrites: true,
        retryReads: true,
      };

      // Connect to MongoDB
      await mongoose.connect(mongoUri, options);
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      this.setupEventListeners();
      
      logger.info('✅ MongoDB connected successfully');
      return true;

    } catch (error) {
      this.connectionAttempts++;
      
      if (this.connectionAttempts < this.maxRetries) {
        logger.warn(`Connection attempt ${this.connectionAttempts} failed. Retrying in ${this.retryDelay/1000} seconds...`);
        logger.error(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Wait before retrying
        await this.delay(this.retryDelay);
        return this.connect(); // Retry connection
      } else {
        logger.error(`❌ Failed to connect to MongoDB after ${this.maxRetries} attempts`);
        logger.error(`Final error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw new Error(`Database connection failed after ${this.maxRetries} attempts`);
      }
    }
  }

  /**
   * Close database connection
   * @returns Promise<void>
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      logger.info('Database already disconnected');
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Database connection closed');
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  /**
   * Get current connection status
   * @returns boolean - Connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get Mongoose connection instance
   * @returns mongoose.Connection
   */
  public getConnection(): mongoose.Connection {
    return mongoose.connection;
  }

  /**
   * Build MongoDB connection URI from configuration
   * @returns string - MongoDB connection URI
   */
  private buildMongoUri(): string {
    const { db } = config;
    
    if (db.uri) {
      return db.uri;
    }

    // Build URI from individual components
    let uri = 'mongodb://';
    
    if (db.username && db.password) {
      uri += `${encodeURIComponent(db.username)}:${encodeURIComponent(db.password)}@`;
    }
    
    uri += `${db.host}:${db.port || 27017}/${db.name}`;
    
    // Add options if provided
    if (db.options) {
      uri += `?${db.options}`;
    }
    
    return uri;
  }

  /**
   * Set up Mongoose event listeners
   */
  private setupEventListeners(): void {
    const connection = mongoose.connection;

    connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });

    connection.on('error', (error) => {
      logger.error('Mongoose connection error:', error);
      this.isConnected = false;
    });

    connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
      this.isConnected = false;
      
      // Attempt to reconnect if this was unexpected
      if (config.db.autoReconnect) {
        logger.info('Attempting to reconnect...');
        setTimeout(() => this.connect(), this.retryDelay);
      }
    });

    connection.on('reconnected', () => {
      logger.info('Mongoose reconnected to MongoDB');
      this.isConnected = true;
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Utility function to delay execution
   * @param ms - Milliseconds to delay
   * @returns Promise<void>
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mask password in connection URI for logging
   * @param uri - MongoDB connection URI
   * @returns string - URI with masked password
   */
  private maskPassword(uri: string): string {
    return uri.replace(/:(.*?)@/, ':****@');
  }

  /**
   * Health check for database connection
   * @returns Promise<{ status: string; details: any }>
   */
  public async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const connection = this.getConnection();
      const adminDb = connection.db?.admin();
      
      if (!adminDb) {
        return {
          status: 'unhealthy',
          details: { error: 'Admin database not available' }
        };
      }

      const pingResult = await adminDb.command({ ping: 1 });
      const serverStatus = await adminDb.serverStatus();
      
      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          ping: pingResult.ok === 1 ? 'success' : 'failed',
          host: connection.host,
          port: connection.port,
          name: connection.name,
          readyState: connection.readyState,
          serverVersion: serverStatus.version,
          connections: serverStatus.connections,
          uptime: serverStatus.uptime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: this.isConnected,
          error: error instanceof Error ? error.message : 'Unknown error',
          readyState: mongoose.connection.readyState
        }
      };
    }
  }
}

// Export singleton instance
export const database = DatabaseConnection.getInstance();
export default database;