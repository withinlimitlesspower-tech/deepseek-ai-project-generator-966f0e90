// src/index.ts
// Main application entry point for DeepSeek V3.2 - AI Project Generator V5.5
// This file serves as the primary entry point for the application

import { Application } from './core/Application';
import { Logger } from './utils/Logger';
import { ConfigManager } from './config/ConfigManager';
import { ProjectGenerator } from './generator/ProjectGenerator';
import { ConversationManager } from './conversation/ConversationManager';
import { ErrorHandler } from './error/ErrorHandler';

/**
 * Main application class that initializes and runs the AI Project Generator
 */
class DeepSeekProjectGenerator {
  private application: Application;
  private logger: Logger;
  private configManager: ConfigManager;
  private projectGenerator: ProjectGenerator;
  private conversationManager: ConversationManager;
  private errorHandler: ErrorHandler;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  constructor() {
    this.logger = new Logger('Main');
    this.errorHandler = new ErrorHandler();
    this.configManager = new ConfigManager();
    this.application = new Application();
    this.projectGenerator = new ProjectGenerator();
    this.conversationManager = new ConversationManager();
  }

  /**
   * Initialize the application with all required components
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing DeepSeek V3.2 - AI Project Generator V5.5...');

      // Load configuration
      await this.configManager.loadConfig();
      this.logger.info('Configuration loaded successfully');

      // Initialize application components
      await this.application.initialize();
      await this.projectGenerator.initialize();
      await this.conversationManager.initialize();

      // Set up error handling
      this.setupErrorHandling();

      this.isInitialized = true;
      this.logger.info('Application initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize application:', error);
      await this.errorHandler.handleCriticalError(error);
      process.exit(1);
    }
  }

  /**
   * Set up global error handling
   */
  private setupErrorHandling(): void {
    process.on('uncaughtException', async (error) => {
      await this.errorHandler.handleUncaughtException(error);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      await this.errorHandler.handleUnhandledRejection(reason, promise);
    });

    process.on('SIGINT', async () => {
      await this.shutdown();
    });

    process.on('SIGTERM', async () => {
      await this.shutdown();
    });
  }

  /**
   * Start the main application loop
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Application must be initialized before starting');
    }

    try {
      this.logger.info('Starting AI Project Generator V5.5...');
      this.isRunning = true;

      // Start application components
      await this.application.start();
      await this.projectGenerator.start();
      await this.conversationManager.start();

      this.logger.info('AI Project Generator V5.5 is now running');
      this.logger.info('Ready to generate complete, production-ready projects');
      this.logger.info('Press Ctrl+C to exit');

      // Keep the application running
      await this.runMainLoop();
    } catch (error) {
      this.logger.error('Failed to start application:', error);
      await this.shutdown();
    }
  }

  /**
   * Main application loop
   */
  private async runMainLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Main application logic here
        // This could include checking for new requests, processing queues, etc.
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        this.logger.error('Error in main loop:', error);
        await this.errorHandler.handleRuntimeError(error);
      }
    }
  }

  /**
   * Gracefully shutdown the application
   */
  public async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    this.logger.info('Shutting down AI Project Generator V5.5...');
    this.isRunning = false;

    try {
      // Shutdown components in reverse order
      await this.conversationManager.shutdown();
      await this.projectGenerator.shutdown();
      await this.application.shutdown();
      await this.configManager.saveConfig();

      this.logger.info('Application shutdown complete');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Get application status
   */
  public getStatus(): {
    initialized: boolean;
    running: boolean;
    version: string;
    components: string[];
  } {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      version: '5.5',
      components: [
        'Application Core',
        'Project Generator',
        'Conversation Manager',
        'Configuration Manager',
        'Error Handler'
      ]
    };
  }
}

/**
 * Main function - Application entry point
 */
async function main(): Promise<void> {
  const app = new DeepSeekProjectGenerator();

  try {
    // Initialize the application
    await app.initialize();

    // Start the application
    await app.start();

    // Log application status
    const status = app.getStatus();
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎯 DEEPSEEK V3.2 - AI PROJECT GENERATOR V5.5');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Status: ${status.running ? 'RUNNING' : 'STOPPED'}`);
    console.log(`Version: ${status.version}`);
    console.log(`Components: ${status.components.join(', ')}`);
    console.log('═══════════════════════════════════════════════════════════\n');
  } catch (error) {
    console.error('Fatal error in main function:', error);
    await app.shutdown();
  }
}

// Only run main if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error in main execution:', error);
    process.exit(1);
  });
}

// Export for testing and module usage
export { DeepSeekProjectGenerator, main };