import fs from 'fs/promises';
import path from 'path';
import { FileGenerationOptions, GeneratedFile, ProjectStructure } from '../types/project.types';
import { ContextManager } from '../core/context-manager';

/**
 * Utility class for generating files and directories in a project
 */
export class FileGenerator {
  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  /**
   * Creates a directory if it doesn't exist
   * @param dirPath - Path to the directory
   * @returns Promise resolving to true if created, false if already exists
   */
  async createDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      this.contextManager.addLog(`Directory created: ${dirPath}`);
      return true;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
        return false;
      }
      this.contextManager.addError(`Failed to create directory ${dirPath}: ${error}`);
      throw error;
    }
  }

  /**
   * Generates a single file with content
   * @param filePath - Path where the file should be created
   * @param content - Content to write to the file
   * @param options - File generation options
   * @returns Promise resolving to GeneratedFile object
   */
  async generateFile(
    filePath: string,
    content: string,
    options: FileGenerationOptions = {}
  ): Promise<GeneratedFile> {
    const {
      overwrite = false,
      backup = false,
      encoding = 'utf8'
    } = options;

    try {
      // Ensure parent directory exists
      const dirPath = path.dirname(filePath);
      await this.createDirectory(dirPath);

      // Check if file exists
      const fileExists = await this.fileExists(filePath);

      if (fileExists && !overwrite) {
        if (backup) {
          await this.createBackup(filePath);
        }
        this.contextManager.addLog(`File already exists, skipping: ${filePath}`);
        return {
          path: filePath,
          created: false,
          skipped: true,
          backupCreated: backup && fileExists
        };
      }

      // Write the file
      await fs.writeFile(filePath, content, { encoding });
      
      this.contextManager.addLog(`File generated: ${filePath}`);
      
      return {
        path: filePath,
        created: true,
        skipped: false,
        backupCreated: backup && fileExists
      };
    } catch (error) {
      this.contextManager.addError(`Failed to generate file ${filePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Generates multiple files from a template
   * @param template - Object mapping file paths to content
   * @param basePath - Base directory for all files
   * @param options - File generation options
   * @returns Promise resolving to array of GeneratedFile results
   */
  async generateFilesFromTemplate(
    template: Record<string, string>,
    basePath: string = '.',
    options: FileGenerationOptions = {}
  ): Promise<GeneratedFile[]> {
    const results: GeneratedFile[] = [];

    for (const [relativePath, content] of Object.entries(template)) {
      const filePath = path.join(basePath, relativePath);
      try {
        const result = await this.generateFile(filePath, content, options);
        results.push(result);
      } catch (error) {
        this.contextManager.addError(`Failed to generate file from template: ${relativePath}`);
        // Continue with other files even if one fails
        results.push({
          path: filePath,
          created: false,
          skipped: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Generates project structure from configuration
   * @param structure - Project structure configuration
   * @param basePath - Base directory for the project
   * @returns Promise resolving to generation statistics
   */
  async generateProjectStructure(
    structure: ProjectStructure,
    basePath: string = '.'
  ): Promise<{
    directories: number;
    files: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let directoriesCreated = 0;
    let filesCreated = 0;

    // Create directories first
    for (const dir of structure.directories) {
      try {
        const dirPath = path.join(basePath, dir);
        const created = await this.createDirectory(dirPath);
        if (created) directoriesCreated++;
      } catch (error) {
        const errorMsg = `Failed to create directory ${dir}: ${error}`;
        errors.push(errorMsg);
        this.contextManager.addError(errorMsg);
      }
    }

    // Then create files
    for (const file of structure.files) {
      try {
        const filePath = path.join(basePath, file.path);
        const result = await this.generateFile(filePath, file.content, file.options);
        if (result.created) filesCreated++;
        if (result.error) {
          errors.push(`File ${file.path}: ${result.error}`);
        }
      } catch (error) {
        const errorMsg = `Failed to create file ${file.path}: ${error}`;
        errors.push(errorMsg);
        this.contextManager.addError(errorMsg);
      }
    }

    return {
      directories: directoriesCreated,
      files: filesCreated,
      errors
    };
  }

  /**
   * Checks if a file exists
   * @param filePath - Path to check
   * @returns Promise resolving to boolean indicating existence
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Creates a backup of an existing file
   * @param filePath - Path to the file to backup
   * @returns Promise resolving to backup file path
   */
  private async createBackup(filePath: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.backup-${timestamp}`;
      
      await fs.copyFile(filePath, backupPath);
      this.contextManager.addLog(`Backup created: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      this.contextManager.addError(`Failed to create backup for ${filePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Reads a file and returns its content
   * @param filePath - Path to the file
   * @param encoding - File encoding (default: 'utf8')
   * @returns Promise resolving to file content
   */
  async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    try {
      const content = await fs.readFile(filePath, { encoding });
      return content;
    } catch (error) {
      this.contextManager.addError(`Failed to read file ${filePath}: ${error}`);
      throw error;
    }
  }

  /**
   * Deletes a file
   * @param filePath - Path to the file to delete
   * @returns Promise resolving to boolean indicating success
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      this.contextManager.addLog(`File deleted: ${filePath}`);
      return true;
    } catch (error) {
      this.contextManager.addError(`Failed to delete file ${filePath}: ${error}`);
      return false;
    }
  }

  /**
   * Lists files in a directory
   * @param dirPath - Path to the directory
   * @param recursive - Whether to list recursively (default: false)
   * @returns Promise resolving to array of file paths
   */
  async listFiles(dirPath: string, recursive: boolean = false): Promise<string[]> {
    try {
      if (!recursive) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return entries
          .filter(entry => entry.isFile())
          .map(entry => path.join(dirPath, entry.name));
      }

      // Recursive listing
      const files: string[] = [];
      
      async function walk(currentPath: string) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
      }
      
      await walk(dirPath);
      return files;
    } catch (error) {
      this.contextManager.addError(`Failed to list files in ${dirPath}: ${error}`);
      throw error;
    }
  }

  /**
   * Copies a file from source to destination
   * @param source - Source file path
   * @param destination - Destination file path
   * @returns Promise resolving to boolean indicating success
   */
  async copyFile