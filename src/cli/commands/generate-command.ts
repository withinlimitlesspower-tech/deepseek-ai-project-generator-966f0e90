import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { ProjectGenerator } from '../../core/project-generator.js';
import { ContextManager } from '../../core/context-manager.js';
import { BlueprintRenderer } from '../../utils/blueprint-renderer.js';
import { FileGenerator } from '../../utils/file-generator.js';
import { Validation } from '../../utils/validation.js';
import { ProjectType, ProjectConfig } from '../../types/project.types.js';
import { logger } from '../../middleware/logger.js';

/**
 * Generate command for creating new projects
 * Handles project generation with interactive prompts and validation
 */
export class GenerateCommand {
  private program: Command;
  private projectGenerator: ProjectGenerator;
  private contextManager: ContextManager;
  private blueprintRenderer: BlueprintRenderer;
  private fileGenerator: FileGenerator;

  constructor() {
    this.program = new Command();
    this.projectGenerator = new ProjectGenerator();
    this.contextManager = new ContextManager();
    this.blueprintRenderer = new BlueprintRenderer();
    this.fileGenerator = new FileGenerator();
  }

  /**
   * Initialize the generate command with options and actions
   */
  public initialize(): Command {
    return this.program
      .command('generate')
      .alias('gen')
      .description('Generate a new project with specified configuration')
      .option('-n, --name <name>', 'Project name')
      .option('-t, --type <type>', 'Project type (web, api, cli, fullstack)')
      .option('-d, --description <description>', 'Project description')
      .option('-o, --output <path>', 'Output directory path')
      .option('-f, --force', 'Force overwrite existing directory')
      .option('-q, --quick', 'Quick mode with default settings')
      .action(async (options) => {
        await this.execute(options);
      });
  }

  /**
   * Execute the generate command with provided options
   */
  private async execute(options: any): Promise<void> {
    try {
      logger.info('Starting project generation process...');

      // Validate environment
      await this.validateEnvironment();

      // Get project configuration
      const config = await this.getProjectConfig(options);

      // Validate configuration
      this.validateConfig(config);

      // Show blueprint preview
      await this.showBlueprintPreview(config);

      // Confirm generation
      const confirmed = await this.confirmGeneration(config);
      if (!confirmed) {
        logger.warn('Project generation cancelled by user.');
        return;
      }

      // Generate project
      await this.generateProject(config);

      // Show success message
      this.showSuccessMessage(config);

    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Validate the environment before generation
   */
  private async validateEnvironment(): Promise<void> {
    const spinner = ora('Validating environment...').start();

    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const requiredVersion = '16.0.0';
      if (this.compareVersions(nodeVersion, requiredVersion) < 0) {
        spinner.fail();
        throw new Error(`Node.js version ${requiredVersion} or higher is required. Current: ${nodeVersion}`);
      }

      // Check for necessary permissions
      const testPath = path.join(process.cwd(), '.temp-test');
      try {
        await fs.writeFile(testPath, 'test');
        await fs.remove(testPath);
      } catch {
        spinner.fail();
        throw new Error('Insufficient file system permissions in current directory.');
      }

      spinner.succeed('Environment validated successfully.');
    } catch (error) {
      spinner.fail();
      throw error;
    }
  }

  /**
   * Get project configuration from options or prompts
   */
  private async getProjectConfig(options: any): Promise<ProjectConfig> {
    // If quick mode, use defaults
    if (options.quick) {
      return this.getDefaultConfig(options);
    }

    // Collect configuration through interactive prompts
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: options.name || 'my-project',
        validate: (input: string) => {
          if (!input.trim()) return 'Project name is required.';
          if (!/^[a-z0-9-]+$/.test(input)) {
            return 'Project name must contain only lowercase letters, numbers, and hyphens.';
          }
          return true;
        },
        when: !options.name,
      },
      {
        type: 'list',
        name: 'type',
        message: 'Project type:',
        choices: [
          { name: 'Web Application', value: 'web' },
          { name: 'API Server', value: 'api' },
          { name: 'CLI Tool', value: 'cli' },
          { name: 'Full-stack Application', value: 'fullstack' },
          { name: 'Library', value: 'library' },
        ],
        default: options.type || 'web',
        when: !options.type,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        default: options.description || 'A new project generated by AI Project Generator',
        when: !options.description,
      },
      {
        type: 'input',
        name: 'output',
        message: 'Output directory:',
        default: options.output || process.cwd(),
        validate: (input: string) => {
          const fullPath = path.resolve(input);
          if (!fs.existsSync(path.dirname(fullPath))) {
            return 'Parent directory does not exist.';
          }
          return true;
        },
        when: !options.output,
      },
      {
        type: 'confirm',
        name: 'force',
        message: 'Overwrite existing directory?',
        default: options.force || false,
        when: (currentAnswers: any) => {
          const outputPath = currentAnswers.output || options.output || process.cwd();
          const projectName = currentAnswers.name || options.name || 'my-project';
          const fullPath = path.join(outputPath, projectName);
          return fs.existsSync(fullPath);
        },
      },
      {
        type: 'confirm',
        name: 'includeTests',
        message: 'Include test setup?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'includeDocker',
        message: 'Include Docker configuration?',
        default: false,
      },
      {
        type: 'confirm',
        name: 'includeCI',
        message: 'Include CI/CD configuration?',
        default: false,
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author name:',
        default: process.env.USER || 'Anonymous',
      },
      {
        type: 'input',
        name: 'license',
        message: 'License:',
        default: 'MIT',
      },
    ]);

    // Merge options and answers
    const config: ProjectConfig = {
      name: options.name || answers.name,
      type: (options.type || answers.type) as ProjectType,
      description: options.description || answers.description,
      outputPath: path.resolve(options.output || answers.output || process.cwd()),
      force: options.force || answers.force || false,
      includeTests: answers.includeTests,
      includeDocker: answers.includeDocker,
      includeCI: answers.includeCI,
      author: answers.author,
      license: answers.license,
      version: '1.0.0',
      createdAt: new Date(),
      dependencies: {},
      devDependencies: {},
    };

    return config;
  }

  /**
   * Get default configuration for quick mode
   */
  private getDefaultConfig(options: any): ProjectConfig {
    return {
      name: options.name || 'my-project',
      type: (options.type || 'web') as ProjectType,
      description: options.description || 'A new project generated by AI Project Generator',
      outputPath: path.resolve(options.output || process.cwd()),
      force: options.force || false,
      includeTests: true,
      includeDocker: false,
      includeCI: false,
      author: process.env.USER || 'Anonymous',
      license: 'MIT',
      version: '1.0.0',
      createdAt: new Date(),
      dependencies: {},
      devDependencies: {},
    };
  }

  /**
   * Validate project configuration
   */
  private validateConfig(config: ProjectConfig): void {
    const spinner = ora('Validating configuration...').start();

    try {
      // Validate project name
      if (!Validation.isValidProjectName(config.name)) {
        spinner.fail();
        throw new Error(`Invalid project name: ${config.name}`);
      }

      // Validate project type
      if (!Object.values(ProjectType).includes(config.type)) {
        spinner.fail();
        throw new Error(`Invalid project type: ${config.type}`);
      }

      // Check if directory already exists
      const projectPath = path.join(config.outputPath, config.name);
      if (fs.existsSync(projectPath) && !config.force) {
        spinner.fail();