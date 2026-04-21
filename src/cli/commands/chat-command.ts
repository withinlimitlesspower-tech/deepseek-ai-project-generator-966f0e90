import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ConversationService } from '../../services/conversation-service';
import { AIIntegrationService } from '../../services/ai-integration-service';
import { ProjectService } from '../../services/project-service';
import { logger } from '../../middleware/logger';
import { ConversationType, ConversationStatus } from '../../types/ai.types';
import { ProjectType } from '../../types/project.types';

interface ChatOptions {
  project?: string;
  new?: boolean;
  list?: boolean;
  continue?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class ChatCommand {
  private conversationService: ConversationService;
  private aiIntegrationService: AIIntegrationService;
  private projectService: ProjectService;

  constructor() {
    this.conversationService = new ConversationService();
    this.aiIntegrationService = new AIIntegrationService();
    this.projectService = new ProjectService();
  }

  public register(program: Command): void {
    program
      .command('chat')
      .description('Start an interactive chat session with the AI assistant')
      .option('-p, --project <projectId>', 'Associate chat with a specific project')
      .option('-n, --new', 'Start a new conversation')
      .option('-l, --list', 'List previous conversations')
      .option('-c, --continue <conversationId>', 'Continue a specific conversation')
      .option('-m, --model <model>', 'AI model to use (default: gpt-4)')
      .option('-t, --temperature <temperature>', 'Temperature for AI responses (0.0-2.0)', parseFloat)
      .option('--max-tokens <maxTokens>', 'Maximum tokens in response', parseInt)
      .action(async (options: ChatOptions) => {
        try {
          await this.execute(options);
        } catch (error) {
          logger.error('Chat command failed:', error);
          console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
          process.exit(1);
        }
      });
  }

  private async execute(options: ChatOptions): Promise<void> {
    if (options.list) {
      await this.listConversations();
      return;
    }

    if (options.continue) {
      await this.continueConversation(options.continue, options);
      return;
    }

    await this.startNewConversation(options);
  }

  private async listConversations(): Promise<void> {
    const spinner = ora('Loading conversations...').start();
    
    try {
      const conversations = await this.conversationService.getAllConversations({
        limit: 20,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });

      spinner.stop();

      if (conversations.length === 0) {
        console.log(chalk.yellow('No previous conversations found.'));
        return;
      }

      console.log(chalk.cyan.bold('\nPrevious Conversations:\n'));
      
      conversations.forEach((conv, index) => {
        const date = new Date(conv.updatedAt).toLocaleString();
        const projectInfo = conv.projectId ? ` | Project: ${conv.projectId}` : '';
        console.log(
          `${chalk.green(`${index + 1}.`)} ${chalk.bold(conv.title || 'Untitled Conversation')}`
        );
        console.log(`   ID: ${chalk.dim(conv.id)}`);
        console.log(`   Last updated: ${chalk.dim(date)}${projectInfo}`);
        console.log(`   Messages: ${chalk.dim(conv.messages?.length || 0)}`);
        console.log();
      });

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Continue a conversation', value: 'continue' },
            { name: 'Start new conversation', value: 'new' },
            { name: 'Exit', value: 'exit' }
          ]
        }
      ]);

      if (action === 'continue') {
        const { conversationId } = await inquirer.prompt([
          {
            type: 'input',
            name: 'conversationId',
            message: 'Enter conversation ID to continue:',
            validate: (input: string) => input.trim().length > 0 || 'Please enter a conversation ID'
          }
        ]);
        await this.continueConversation(conversationId, {});
      } else if (action === 'new') {
        await this.startNewConversation({});
      }
    } catch (error) {
      spinner.fail('Failed to load conversations');
      throw error;
    }
  }

  private async startNewConversation(options: ChatOptions): Promise<void> {
    console.log(chalk.cyan.bold('\n🤖 AI Assistant Chat\n'));
    console.log(chalk.dim('Type "exit" to end the conversation, "clear" to clear context, or "help" for commands.\n'));

    let projectId = options.project;
    
    if (!projectId) {
      const { useProject } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useProject',
          message: 'Would you like to associate this conversation with a project?',
          default: false
        }
      ]);

      if (useProject) {
        projectId = await this.selectProject();
      }
    }

    const { conversationTitle } = await inquirer.prompt([
      {
        type: 'input',
        name: 'conversationTitle',
        message: 'Enter a title for this conversation (optional):',
        default: 'New Conversation'
      }
    ]);

    const conversation = await this.conversationService.createConversation({
      title: conversationTitle,
      projectId: projectId || undefined,
      type: ConversationType.CHAT,
      status: ConversationStatus.ACTIVE,
      metadata: {
        model: options.model || 'gpt-4',
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2000
      }
    });

    console.log(chalk.green(`\nConversation started: ${conversation.title}`));
    if (projectId) {
      console.log(chalk.dim(`Associated with project: ${projectId}`));
    }
    console.log();

    await this.chatLoop(conversation.id, options);
  }

  private async continueConversation(conversationId: string, options: ChatOptions): Promise<void> {
    const spinner = ora('Loading conversation...').start();
    
    try {
      const conversation = await this.conversationService.getConversationById(conversationId);
      
      if (!conversation) {
        spinner.fail('Conversation not found');
        return;
      }

      spinner.stop();

      console.log(chalk.cyan.bold(`\n🤖 Continuing: ${conversation.title}\n`));
      console.log(chalk.dim(`Last updated: ${new Date(conversation.updatedAt).toLocaleString()}`));
      
      if (conversation.messages && conversation.messages.length > 0) {
        console.log(chalk.dim('\nPrevious messages:'));
        const recentMessages = conversation.messages.slice(-3);
        recentMessages.forEach(msg => {
          const prefix = msg.role === 'user' ? 'You:' : 'AI:';
          const color = msg.role === 'user' ? chalk.blue : chalk.green;
          console.log(color(`${prefix} ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`));
        });
        console.log();
      }

      console.log(chalk.dim('Type "exit" to end, "clear" to clear context, or "help" for commands.\n'));

      await this.chatLoop(conversationId, options);
    } catch (error) {
      spinner.fail('Failed to load conversation');
      throw error;
    }
  }

  private async chatLoop(conversationId: string, options: ChatOptions): Promise<void> {
    let isActive = true;

    while (isActive) {
      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: chalk.blue('You:'),
          validate: (input: string) => input.trim().length > 0 || 'Message cannot be empty'
        }
      ]);

      const trimmedMessage = message.trim();

      if (trimmedMessage.toLowerCase() === 'exit') {
        console.log(chalk.yellow('\nEnding conversation...'));
        await this.conversationService.updateConversationStatus(conversationId, ConversationStatus.COMPLETED);
        isActive = false;
        continue;
      }

      if (trimmedMessage.toLowerCase() === 'clear') {
        console.log(chalk.yellow('Clearing conversation context...'));
        await this.conversationService.clearConversationContext(conversationId);
        continue;
      }

      if (trimmedMessage.toLowerCase() === 'help') {
        this.showHelp();
        continue;
      }

      if (trimmedMessage.toLowerCase() ===