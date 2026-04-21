# Contributing to AI Project Generator V5.5

Thank you for your interest in contributing to the AI Project Generator V5.5! This document provides guidelines and instructions for contributing to this project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Commit Guidelines](#commit-guidelines)
- [Documentation](#documentation)
- [Issue Reporting](#issue-reporting)
- [Security](#security)

## Code of Conduct

We are committed to providing a friendly, safe, and welcoming environment for all contributors. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- TypeScript 5.x
- Docker and Docker Compose (optional, for containerized development)
- Git

### Fork and Clone
1. Fork the repository on GitHub
2. Clone your fork locally:
      git clone https://github.com/YOUR-USERNAME/ai-project-generator.git
   cd ai-project-generator
   3. Add the original repository as upstream:
      git remote add upstream https://github.com/original/ai-project-generator.git
   
### Installation
1. Install dependencies:
      npm install
   
2. Copy environment variables:
      cp .env.example .env
   
3. Update the `.env` file with your configuration.

## Development Environment

### Local Development
# Start development server
npm run dev

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

### Docker Development
# Build and start containers
docker-compose up --build

# Run tests in container
docker-compose exec app npm test

# Access logs
docker-compose logs -f app

### Database Setup
The project uses MongoDB. You can either:
1. Use the Docker Compose setup (includes MongoDB)
2. Install MongoDB locally and update connection string in `.env`

## Project Structure

ai-project-generator/
├── src/
│   ├── api/              # API routes and middleware
│   ├── cli/              # Command-line interface
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── core/            # Core business logic
│   ├── database/        # Database models and connections
│   ├── middleware/      # Express middleware
│   ├── services/        # Business services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── web/             # Web interface components
├── tests/               # Test files
├── docker/              # Docker configuration
└── docs/               # Documentation

## Coding Standards

### TypeScript
- Use strict TypeScript configuration
- Always define return types
- Use interfaces for object shapes
- Avoid `any` type; use `unknown` when necessary
- Use enums for fixed sets of values

### Code Style
- Follow the existing code style
- Use 2-space indentation
- Use single quotes for strings
- Add trailing commas in objects and arrays
- Maximum line length: 100 characters

### Naming Conventions
- `camelCase` for variables and functions
- `PascalCase` for classes and interfaces
- `UPPER_SNAKE_CASE` for constants
- `kebab-case` for files and directories

### Error Handling
- Use try-catch blocks for async operations
- Create custom error classes in `src/types/errors.ts`
- Always handle promise rejections
- Log errors appropriately

### Example Code Structure
// Good example
import { ProjectType } from '../types/project.types';
import { ValidationError } from '../types/errors';

export class ProjectService {
  private readonly projectRepository: ProjectRepository;

  constructor(projectRepository: ProjectRepository) {
    this.projectRepository = projectRepository;
  }

  async createProject(data: CreateProjectDto): Promise<ProjectType> {
    try {
      // Validate input
      if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError('Project name is required');
      }

      // Business logic
      const project = await this.projectRepository.create(data);
      
      return project;
    } catch (error) {
      // Log and rethrow
      console.error('Failed to create project:', error);
      throw error;
    }
  }
}

## Testing

### Test Structure
- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`

### Writing Tests
describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockRepository: jest.Mocked<ProjectRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
    } as any;
    
    projectService = new ProjectService(mockRepository);
  });

  describe('createProject', () => {
    it('should create a project with valid data', async () => {
      const projectData = { name: 'Test Project', type: 'web' };
      const expectedProject = { id: '123', ...projectData };
      
      mockRepository.create.mockResolvedValue(expectedProject);

      const result = await projectService.createProject(projectData);

      expect(result).toEqual(expectedProject);
      expect(mockRepository.create).toHaveBeenCalledWith(projectData);
    });

    it('should throw ValidationError for empty project name', async () => {
      const projectData = { name: '', type: 'web' };

      await expect(projectService.createProject(projectData))
        .rejects.toThrow(ValidationError);
    });
  });
});

### Running Tests
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/project-service.test.ts

# Run tests with watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

## Pull Request Process

1. **Create a Feature Branch**
      git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   
2. **Make Your Changes**
   - Write clean, tested code
   - Update documentation as needed
   - Add tests for new functionality

3. **Keep Your Branch Updated**
      git fetch upstream
   git rebase upstream/main
   
4. **Run Tests and Linting**
      npm test
   npm run lint
   npm run build
   
5. **Commit Your Changes**
   Follow the commit guidelines below.

6. **Push to Your Fork**
      git push origin feature/your-feature-name
   
7. **Create Pull Request**
   - Use the PR template
   - Describe changes clearly
   - Link related issues
   - Request reviews from maintainers

### PR Review Checklist
- [ ] Code follows project standards
- [ ] Tests are added/updated
- [ ] Documentation is updated
- [ ] No linting errors
- [ ] All tests pass
- [ ] Code is properly formatted

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Commit Message Format
<type>(<scope>): <description>

[optional body]

[optional footer(s)]

### Examples
feat(api): add project generation endpoint

- Add POST /api/projects endpoint
- Implement project validation
- Add rate limiting middleware

Closes #123

fix(core): handle empty AI responses

- Add null check for AI response
- Return appropriate error message
- Update tests for edge cases

Fixes #456

## Documentation

### Updating Documentation
1. Update inline code comments when changing functionality
2. Update README.md for user-facing changes
3. Update API documentation in `/docs/api`
4. Add JSDoc comments for public APIs

### Generating Documentation
# Generate API documentation
npm run docs:generate

# Serve documentation locally
npm run docs:serve

## Issue Reporting

### Before Submitting an Issue
1. Check existing issues
2. Search closed issues
3. Reproduce the issue locally

### Issue Template
## Description
Clear and concise description of the issue.

## Steps to Reproduce
1. Go to '...