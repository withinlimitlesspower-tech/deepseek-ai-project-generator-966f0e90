import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProjectGenerator } from '../../src/core/project-generator';
import { FileGenerator } from '../../src/utils/file-generator';
import { BlueprintRenderer } from '../../src/utils/blueprint-renderer';
import { Validation } from '../../src/utils/validation';
import { ProjectType, ProjectBlueprint, FileStructure } from '../../src/types/project.types';

// Mock dependencies
jest.mock('../../src/utils/file-generator');
jest.mock('../../src/utils/blueprint-renderer');
jest.mock('../../src/utils/validation');

describe('ProjectGenerator', () => {
    let projectGenerator: ProjectGenerator;
    let mockFileGenerator: jest.Mocked<FileGenerator>;
    let mockBlueprintRenderer: jest.Mocked<BlueprintRenderer>;
    let mockValidation: jest.Mocked<Validation>;

    const mockProjectConfig = {
        name: 'Test Project',
        type: ProjectType.WEB_APP,
        description: 'A test project',
        technologies: ['TypeScript', 'React', 'Node.js'],
        features: ['Authentication', 'Database', 'API']
    };

    const mockBlueprint: ProjectBlueprint = {
        projectName: 'Test Project',
        projectType: ProjectType.WEB_APP,
        architecture: {
            layers: ['Presentation', 'Application', 'Domain', 'Infrastructure'],
            patterns: ['MVC', 'Repository'],
            communication: 'REST API'
        },
        fileStructure: {
            root: {
                'src': {
                    'controllers': ['user-controller.ts', 'auth-controller.ts'],
                    'services': ['user-service.ts', 'auth-service.ts'],
                    'models': ['user-model.ts'],
                    'middleware': ['auth-middleware.ts']
                },
                'tests': {
                    'unit': ['user-controller.test.ts'],
                    'integration': ['auth.test.ts']
                },
                'package.json': '{}',
                'tsconfig.json': '{}'
            }
        },
        dependencies: {
            production: ['express', 'mongoose'],
            development: ['jest', 'typescript']
        },
        setupInstructions: 'npm install && npm run dev'
    };

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create mock instances
        mockFileGenerator = new FileGenerator() as jest.Mocked<FileGenerator>;
        mockBlueprintRenderer = new BlueprintRenderer() as jest.Mocked<BlueprintRenderer>;
        mockValidation = new Validation() as jest.Mocked<Validation>;

        // Initialize ProjectGenerator with mocked dependencies
        projectGenerator = new ProjectGenerator(
            mockFileGenerator,
            mockBlueprintRenderer,
            mockValidation
        );
    });

    describe('generateBlueprint', () => {
        it('should generate a valid blueprint for valid project config', async () => {
            // Arrange
            mockValidation.validateProjectConfig.mockReturnValue({ valid: true, errors: [] });
            mockBlueprintRenderer.generateBlueprint.mockResolvedValue(mockBlueprint);

            // Act
            const result = await projectGenerator.generateBlueprint(mockProjectConfig);

            // Assert
            expect(mockValidation.validateProjectConfig).toHaveBeenCalledWith(mockProjectConfig);
            expect(mockBlueprintRenderer.generateBlueprint).toHaveBeenCalledWith(mockProjectConfig);
            expect(result).toEqual(mockBlueprint);
        });

        it('should throw error for invalid project config', async () => {
            // Arrange
            const validationError = { valid: false, errors: ['Project name is required'] };
            mockValidation.validateProjectConfig.mockReturnValue(validationError);

            // Act & Assert
            await expect(projectGenerator.generateBlueprint(mockProjectConfig))
                .rejects
                .toThrow('Invalid project configuration: Project name is required');
            
            expect(mockValidation.validateProjectConfig).toHaveBeenCalledWith(mockProjectConfig);
            expect(mockBlueprintRenderer.generateBlueprint).not.toHaveBeenCalled();
        });

        it('should handle blueprint generation errors', async () => {
            // Arrange
            mockValidation.validateProjectConfig.mockReturnValue({ valid: true, errors: [] });
            mockBlueprintRenderer.generateBlueprint.mockRejectedValue(new Error('Blueprint generation failed'));

            // Act & Assert
            await expect(projectGenerator.generateBlueprint(mockProjectConfig))
                .rejects
                .toThrow('Blueprint generation failed');
        });

        it('should generate blueprint with different project types', async () => {
            // Arrange
            const apiProjectConfig = {
                ...mockProjectConfig,
                type: ProjectType.API_SERVICE
            };

            const apiBlueprint = {
                ...mockBlueprint,
                projectType: ProjectType.API_SERVICE
            };

            mockValidation.validateProjectConfig.mockReturnValue({ valid: true, errors: [] });
            mockBlueprintRenderer.generateBlueprint.mockResolvedValue(apiBlueprint);

            // Act
            const result = await projectGenerator.generateBlueprint(apiProjectConfig);

            // Assert
            expect(result.projectType).toBe(ProjectType.API_SERVICE);
        });
    });

    describe('generateProject', () => {
        it('should generate project files from blueprint', async () => {
            // Arrange
            const outputPath = './test-output';
            mockFileGenerator.generateFiles.mockResolvedValue({
                success: true,
                generatedFiles: 15,
                totalSize: '2.5MB',
                outputPath
            });

            // Act
            const result = await projectGenerator.generateProject(mockBlueprint, outputPath);

            // Assert
            expect(mockFileGenerator.generateFiles).toHaveBeenCalledWith(
                mockBlueprint.fileStructure,
                outputPath
            );
            expect(result.success).toBe(true);
            expect(result.generatedFiles).toBe(15);
            expect(result.outputPath).toBe(outputPath);
        });

        it('should handle file generation errors', async () => {
            // Arrange
            const outputPath = './test-output';
            mockFileGenerator.generateFiles.mockRejectedValue(new Error('File system error'));

            // Act & Assert
            await expect(projectGenerator.generateProject(mockBlueprint, outputPath))
                .rejects
                .toThrow('File system error');
        });

        it('should validate blueprint before generation', async () => {
            // Arrange
            const invalidBlueprint = { ...mockBlueprint, projectName: '' };
            const outputPath = './test-output';

            // Act & Assert
            await expect(projectGenerator.generateProject(invalidBlueprint, outputPath))
                .rejects
                .toThrow('Invalid blueprint: Project name is required');
            
            expect(mockFileGenerator.generateFiles).not.toHaveBeenCalled();
        });

        it('should generate project with custom file structure', async () => {
            // Arrange
            const customBlueprint: ProjectBlueprint = {
                ...mockBlueprint,
                fileStructure: {
                    root: {
                        'app': {
                            'modules': ['user', 'auth'],
                            'shared': ['utils', 'types']
                        },
                        'config': ['database.ts', 'server.ts'],
                        'package.json': '{}'
                    }
                }
            };

            const outputPath = './custom-output';
            mockFileGenerator.generateFiles.mockResolvedValue({
                success: true,
                generatedFiles: 8,
                totalSize: '1.2MB',
                outputPath
            });

            // Act
            const result = await projectGenerator.generateProject(customBlueprint, outputPath);

            // Assert
            expect(mockFileGenerator.generateFiles).toHaveBeenCalledWith(
                customBlueprint.fileStructure,
                outputPath
            );
            expect(result.generatedFiles).toBe(8);
        });
    });

    describe('validateBlueprint', () => {
        it('should return true for valid blueprint', () => {
            // Act
            const isValid = projectGenerator['validateBlueprint'](mockBlueprint);

            // Assert
            expect(isValid).toBe(true);
        });

        it('should return false for blueprint without project name', () => {
            // Arrange
            const invalidBlueprint = { ...mockBlueprint, projectName: '' };

            // Act
            const isValid = projectGenerator['validateBlueprint'](invalidBlueprint);

            // Assert
            expect(isValid).toBe(false);
        });

        it('should return false for blueprint without file structure', () => {
            // Arrange
            const invalidBlueprint = { ...mockBlueprint, fileStructure: undefined as any };

            // Act
            const isValid = projectGenerator['validateBlueprint'](invalidBlueprint);

            // Assert
            expect(isValid).toBe(false);
        });

        it('should return false for blueprint with empty file structure', () => {
            // Arrange
            const invalidBlueprint = { ...mockBlueprint, fileStructure: { root: {} } };

            // Act
            const isValid = projectGenerator['validateBlueprint'](invalidBlueprint);

            // Assert
            expect(isValid).toBe(false);
        });
    });

    describe('generateCompleteProject', () => {
        it('should generate blueprint and project files', async () => {
            // Arrange
            const outputPath = './complete-output';
            
            mockValidation.validateProjectConfig.mockReturnValue({ valid: true, errors: [] });
            mockBlueprintRenderer.generateBlueprint.mockResolvedValue(mockBlueprint);
            mockFileGenerator.generateFiles.mockResolvedValue({
                success: true,
                generatedFiles: 20,
                totalSize: '3.0MB',
                outputPath
            });

            // Act
            const result = await projectGenerator.generateCompleteProject(mockProjectConfig, output