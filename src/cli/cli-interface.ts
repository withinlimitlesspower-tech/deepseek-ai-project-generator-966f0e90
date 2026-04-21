import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectGenerator } from '../core/project-generator';
import { ContextManager } from '../core/context-manager';
import { AIAssistant } from '../core/ai-assistant';
import { ProjectType, ProjectConfig } from '../types/project.types';
import { Conversation } from '../types/ai.types';
import { validateProjectConfig } from '../utils/validation';
import { renderBlueprint } from '../utils/blueprint-renderer';
import { generateProjectFiles } from '../utils/file-generator';

/**
 * CLI Interface for AI Project Generator
 * Provides command-line interaction for project generation and management
 */
export class CLIInterface {
    private rl: readline.Interface;
    private projectGenerator: ProjectGenerator;
    private contextManager: ContextManager;
    private aiAssistant: AIAssistant;
    private currentConversation: Conversation | null = null;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        });

        this.projectGenerator = new ProjectGenerator();
        this.contextManager = new ContextManager();
        this.aiAssistant = new AIAssistant();
    }

    /**
     * Initialize and start the CLI interface
     */
    public async start(): Promise<void> {
        this.displayWelcomeMessage();
        await this.mainMenu();
    }

    /**
     * Display welcome message and application information
     */
    private displayWelcomeMessage(): void {
        console.clear();
        console.log('════════════════════════════════════════════════════════════');
        console.log('🚀 AI PROJECT GENERATOR V5.5 - DEEPSEEK V3.2');
        console.log('════════════════════════════════════════════════════════════');
        console.log('Expertise: Full-stack development, project architect');
        console.log('Purpose: Command-line interface for the application');
        console.log('════════════════════════════════════════════════════════════\n');
    }

    /**
     * Main menu with available options
     */
    private async mainMenu(): Promise<void> {
        console.log('\n📋 MAIN MENU:');
        console.log('1. Create New Project');
        console.log('2. Continue Existing Conversation');
        console.log('3. View Project Blueprints');
        console.log('4. Generate Project Files');
        console.log('5. Configure Settings');
        console.log('6. Exit');

        const choice = await this.prompt('Select an option (1-6): ');

        switch (choice) {
            case '1':
                await this.createNewProject();
                break;
            case '2':
                await this.continueConversation();
                break;
            case '3':
                await this.viewBlueprints();
                break;
            case '4':
                await this.generateFiles();
                break;
            case '5':
                await this.configureSettings();
                break;
            case '6':
                this.exit();
                break;
            default:
                console.log('❌ Invalid option. Please try again.');
                await this.mainMenu();
        }
    }

    /**
     * Create a new project with AI assistance
     */
    private async createNewProject(): Promise<void> {
        console.log('\n🎯 CREATE NEW PROJECT');
        console.log('─────────────────────');

        try {
            // Get project details from user
            const projectName = await this.prompt('Project name: ');
            const projectDescription = await this.prompt('Project description: ');

            // Select project type
            console.log('\n📁 Project Types:');
            console.log('1. Web Application');
            console.log('2. API Service');
            console.log('3. Mobile App');
            console.log('4. Desktop Application');
            console.log('5. Library/Package');
            console.log('6. Custom');

            const typeChoice = await this.prompt('Select project type (1-6): ');
            const projectType = this.mapProjectType(typeChoice);

            // Get additional requirements
            console.log('\n💡 Additional Requirements (press Enter when done):');
            const requirements: string[] = [];
            let requirement = '';

            do {
                requirement = await this.prompt('Requirement: ');
                if (requirement.trim()) {
                    requirements.push(requirement);
                }
            } while (requirement.trim());

            // Create project configuration
            const projectConfig: ProjectConfig = {
                name: projectName,
                description: projectDescription,
                type: projectType,
                requirements,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'draft'
            };

            // Validate configuration
            const validationResult = validateProjectConfig(projectConfig);
            if (!validationResult.isValid) {
                console.log(`❌ Validation failed: ${validationResult.errors.join(', ')}`);
                await this.mainMenu();
                return;
            }

            // Start AI conversation for project generation
            console.log('\n🤖 Starting AI conversation for project generation...');
            this.currentConversation = await this.aiAssistant.startConversation(
                `Generate project: ${projectName}`,
                projectDescription
            );

            // Generate project blueprint
            console.log('📐 Generating project blueprint...');
            const blueprint = await this.projectGenerator.generateBlueprint(
                projectConfig,
                this.currentConversation
            );

            // Display blueprint
            console.log('\n📋 PROJECT BLUEPRINT:');
            console.log('─────────────────────');
            renderBlueprint(blueprint);

            // Save project context
            await this.contextManager.saveProjectContext(projectConfig, blueprint);

            console.log('\n✅ Project blueprint generated successfully!');
            await this.postGenerationMenu(projectConfig, blueprint);

        } catch (error) {
            console.error(`❌ Error creating project: ${error.message}`);
            await this.mainMenu();
        }
    }

    /**
     * Continue an existing conversation
     */
    private async continueConversation(): Promise<void> {
        console.log('\n💬 CONTINUE CONVERSATION');
        console.log('───────────────────────');

        try {
            // Get conversation ID or list available conversations
            const conversationId = await this.prompt('Enter conversation ID (or press Enter to list): ');

            if (!conversationId.trim()) {
                await this.listConversations();
                return;
            }

            // Load conversation
            this.currentConversation = await this.aiAssistant.loadConversation(conversationId);
            if (!this.currentConversation) {
                console.log('❌ Conversation not found.');
                await this.mainMenu();
                return;
            }

            console.log(`\n📝 Conversation: ${this.currentConversation.title}`);
            console.log('─────────────────────────────────────');

            // Display conversation history
            this.currentConversation.messages.forEach((msg, index) => {
                console.log(`${index + 1}. [${msg.role}] ${msg.content.substring(0, 100)}...`);
            });

            // Interactive conversation loop
            await this.conversationLoop();

        } catch (error) {
            console.error(`❌ Error continuing conversation: ${error.message}`);
            await this.mainMenu();
        }
    }

    /**
     * Interactive conversation loop with AI
     */
    private async conversationLoop(): Promise<void> {
        while (true) {
            const userInput = await this.prompt('\n💭 Your message (or type "exit" to quit): ');

            if (userInput.toLowerCase() === 'exit') {
                break;
            }

            try {
                if (!this.currentConversation) {
                    console.log('❌ No active conversation.');
                    break;
                }

                // Get AI response
                console.log('🤖 Thinking...');
                const response = await this.aiAssistant.sendMessage(
                    this.currentConversation.id,
                    userInput
                );

                console.log(`\n🤖 AI: ${response.content}`);

                // Update current conversation
                this.currentConversation = await this.aiAssistant.loadConversation(this.currentConversation.id);

            } catch (error) {
                console.error(`❌ Error in conversation: ${error.message}`);
                break;
            }
        }

        await this.mainMenu();
    }

    /**
     * View generated project blueprints
     */
    private async viewBlueprints(): Promise<void> {
        console.log('\n📊 VIEW PROJECT BLUEPRINTS');
        console.log('─────────────────────────');

        try {
            const blueprints = await this.contextManager.getAllBlueprints();

            if (blueprints.length === 0) {
                console.log('No blueprints found. Generate a project first.');
                await this.mainMenu();
                return;
            }

            blueprints.forEach((bp, index) => {
                console.log(`${index + 1}. ${bp.projectConfig.name} - ${bp.projectConfig.type}`);
                console.log(`   Description: ${bp.projectConfig.description}`);
                console.log(`   Generated: ${bp.generatedAt.toLocaleDateString()}`);
                console.log('   ─────────────────────────');
            });

            const choice = await this.prompt('\nSelect blueprint number to view details (or press Enter to go back): ');

            if (choice.trim()) {
                const index = parseInt(choice) - 1;
                if (index >= 0 && index < blueprints.length) {
                    const selectedBlueprint = blueprints[index];
                    console.log('\n📋 BLUEPR