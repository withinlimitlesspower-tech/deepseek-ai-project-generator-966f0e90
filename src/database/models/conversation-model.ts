import mongoose, { Schema, Document, Model } from 'mongoose';
import { IProject } from './project-model';

// Message interface
export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    tokens?: number;
    model?: string;
    thinkingProcess?: string;
  };
}

// Conversation interface
export interface IConversation extends Document {
  projectId: mongoose.Types.ObjectId | IProject;
  title: string;
  messages: IMessage[];
  metadata: {
    totalTokens: number;
    modelUsed: string;
    thinkingEnabled: boolean;
    contextWindow: number;
  };
  status: 'active' | 'archived' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  
  // Virtuals
  messageCount: number;
  lastUserMessage: IMessage | null;
  lastAssistantMessage: IMessage | null;
  
  // Methods
  addMessage(message: IMessage): Promise<IConversation>;
  getRecentMessages(limit?: number): IMessage[];
  calculateTokenUsage(): number;
  archive(): Promise<IConversation>;
  restore(): Promise<IConversation>;
}

// Message schema
const MessageSchema = new Schema<IMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    tokens: {
      type: Number,
      min: 0
    },
    model: {
      type: String,
      trim: true
    },
    thinkingProcess: {
      type: String,
      trim: true
    }
  }
}, { _id: false });

// Conversation schema
const ConversationSchema = new Schema<IConversation>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    default: 'New Conversation'
  },
  messages: {
    type: [MessageSchema],
    default: []
  },
  metadata: {
    totalTokens: {
      type: Number,
      default: 0,
      min: 0
    },
    modelUsed: {
      type: String,
      default: 'deepseek-v3.2',
      trim: true
    },
    thinkingEnabled: {
      type: Boolean,
      default: false
    },
    contextWindow: {
      type: Number,
      default: 4096,
      min: 512,
      max: 32768
    }
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
ConversationSchema.index({ projectId: 1, status: 1 });
ConversationSchema.index({ projectId: 1, lastMessageAt: -1 });
ConversationSchema.index({ 'messages.timestamp': -1 });

// Virtuals
ConversationSchema.virtual('messageCount').get(function(this: IConversation) {
  return this.messages.length;
});

ConversationSchema.virtual('lastUserMessage').get(function(this: IConversation) {
  const userMessages = this.messages.filter(msg => msg.role === 'user');
  return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
});

ConversationSchema.virtual('lastAssistantMessage').get(function(this: IConversation) {
  const assistantMessages = this.messages.filter(msg => msg.role === 'assistant');
  return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1] : null;
});

// Pre-save middleware to update lastMessageAt
ConversationSchema.pre('save', function(next) {
  if (this.messages.length > 0) {
    const lastMessage = this.messages[this.messages.length - 1];
    this.lastMessageAt = lastMessage.timestamp;
  }
  next();
});

// Methods
ConversationSchema.methods.addMessage = async function(message: IMessage): Promise<IConversation> {
  try {
    // Validate message
    if (!message.role || !message.content) {
      throw new Error('Message must have role and content');
    }
    
    // Set timestamp if not provided
    if (!message.timestamp) {
      message.timestamp = new Date();
    }
    
    // Add message to array
    this.messages.push(message);
    
    // Update token count if provided
    if (message.metadata?.tokens) {
      this.metadata.totalTokens += message.metadata.tokens;
    }
    
    // Save and return updated conversation
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

ConversationSchema.methods.getRecentMessages = function(limit: number = 10): IMessage[] {
  if (limit <= 0) {
    return [];
  }
  
  // Return last N messages (most recent first in array)
  const startIndex = Math.max(0, this.messages.length - limit);
  return this.messages.slice(startIndex);
};

ConversationSchema.methods.calculateTokenUsage = function(): number {
  // Simple token estimation (4 chars ≈ 1 token for English text)
  // In production, you might want to use a proper tokenizer
  let totalTokens = 0;
  
  for (const message of this.messages) {
    if (message.metadata?.tokens) {
      totalTokens += message.metadata.tokens;
    } else {
      // Fallback estimation
      totalTokens += Math.ceil(message.content.length / 4);
    }
  }
  
  return totalTokens;
};

ConversationSchema.methods.archive = async function(): Promise<IConversation> {
  try {
    this.status = 'archived';
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to archive conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

ConversationSchema.methods.restore = async function(): Promise<IConversation> {
  try {
    this.status = 'active';
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to restore conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Static methods
ConversationSchema.statics.findByProjectId = function(projectId: string, status?: string) {
  const query: any = { projectId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ lastMessageAt: -1 });
};

ConversationSchema.statics.findActiveByProjectId = function(projectId: string) {
  return this.find({ projectId, status: 'active' }).sort({ lastMessageAt: -1 });
};

ConversationSchema.statics.findArchivedByProjectId = function(projectId: string) {
  return this.find({ projectId, status: 'archived' }).sort({ lastMessageAt: -1 });
};

ConversationSchema.statics.deleteOldConversations = async function(days: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const result = await this.deleteMany({
    status: 'deleted',
    updatedAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount || 0;
};

// Create and export model
export const Conversation: Model<IConversation> = mongoose.model<IConversation>('Conversation', ConversationSchema);

// Export helper functions
export const conversationHelpers = {
  /**
   * Estimate tokens for a message
   */
  estimateTokens(content: string): number {
    // Simple estimation: 4 chars ≈ 1 token for English
    // In production, use proper tokenizer like tiktoken
    return Math.ceil(content.length / 4);
  },
  
  /**
   * Create a new message object
   */
  createMessage(role: IMessage['role'], content: string, metadata?: Partial<IMessage['metadata']>): IMessage {
    return {
      role,
      content: content.trim(),
      timestamp: new Date(),
      metadata: metadata ? {
        tokens: metadata.tokens || this.estimateTokens(content),
        model: metadata.model,
        thinkingProcess: metadata.thinkingProcess
      } : undefined
    };
  },
  
  /**
   * Validate conversation data
   */
  validateConversationData(data: Partial<IConversation>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data