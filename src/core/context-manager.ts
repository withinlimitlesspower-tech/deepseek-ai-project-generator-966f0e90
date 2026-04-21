// src/core/context-manager.ts
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ContextEntry {
  id: string;
  timestamp: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface ContextConfig {
  maxEntries: number;
  maxTokens: number;
  retentionPeriod: number; // in milliseconds
  enableCompression: boolean;
}

export interface ContextSummary {
  totalEntries: number;
  oldestEntry: number;
  newestEntry: number;
  estimatedTokens: number;
  compressed: boolean;
}

export class ContextManager extends EventEmitter {
  private contextHistory: ContextEntry[] = [];
  private config: ContextConfig;
  private currentTokens: number = 0;

  constructor(config?: Partial<ContextConfig>) {
    super();
    this.config = {
      maxEntries: 100,
      maxTokens: 4000,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      enableCompression: true,
      ...config
    };
  }

  /**
   * Add a new entry to the context history
   */
  public addEntry(role: ContextEntry['role'], content: string, metadata?: Record<string, any>): string {
    const entry: ContextEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      role,
      content,
      metadata
    };

    this.contextHistory.push(entry);
    this.currentTokens += this.estimateTokens(content);

    // Clean up old entries if needed
    this.cleanup();

    // Emit event for listeners
    this.emit('entryAdded', entry);
    
    return entry.id;
  }

  /**
   * Get all context entries
   */
  public getHistory(): ContextEntry[] {
    return [...this.contextHistory];
  }

  /**
   * Get filtered context entries
   */
  public getFilteredHistory(filter?: {
    role?: ContextEntry['role'];
    startTime?: number;
    endTime?: number;
    searchTerm?: string;
  }): ContextEntry[] {
    return this.contextHistory.filter(entry => {
      if (filter?.role && entry.role !== filter.role) return false;
      if (filter?.startTime && entry.timestamp < filter.startTime) return false;
      if (filter?.endTime && entry.timestamp > filter.endTime) return false;
      if (filter?.searchTerm && !entry.content.toLowerCase().includes(filter.searchTerm.toLowerCase())) return false;
      return true;
    });
  }

  /**
   * Get a specific entry by ID
   */
  public getEntry(id: string): ContextEntry | null {
    return this.contextHistory.find(entry => entry.id === id) || null;
  }

  /**
   * Update an existing entry
   */
  public updateEntry(id: string, updates: Partial<Omit<ContextEntry, 'id' | 'timestamp'>>): boolean {
    const index = this.contextHistory.findIndex(entry => entry.id === id);
    if (index === -1) return false;

    const oldEntry = this.contextHistory[index];
    const newEntry = { ...oldEntry, ...updates, id: oldEntry.id, timestamp: oldEntry.timestamp };

    // Update token count if content changed
    if (updates.content !== undefined) {
      this.currentTokens -= this.estimateTokens(oldEntry.content);
      this.currentTokens += this.estimateTokens(newEntry.content);
    }

    this.contextHistory[index] = newEntry;
    this.emit('entryUpdated', { old: oldEntry, new: newEntry });
    
    return true;
  }

  /**
   * Remove an entry by ID
   */
  public removeEntry(id: string): boolean {
    const index = this.contextHistory.findIndex(entry => entry.id === id);
    if (index === -1) return false;

    const removedEntry = this.contextHistory[index];
    this.contextHistory.splice(index, 1);
    this.currentTokens -= this.estimateTokens(removedEntry.content);
    
    this.emit('entryRemoved', removedEntry);
    return true;
  }

  /**
   * Clear all context history
   */
  public clearHistory(): void {
    const oldHistory = [...this.contextHistory];
    this.contextHistory = [];
    this.currentTokens = 0;
    
    this.emit('historyCleared', oldHistory);
  }

  /**
   * Get context summary
   */
  public getSummary(): ContextSummary {
    const timestamps = this.contextHistory.map(entry => entry.timestamp);
    
    return {
      totalEntries: this.contextHistory.length,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      estimatedTokens: this.currentTokens,
      compressed: this.config.enableCompression && this.contextHistory.length > this.config.maxEntries / 2
    };
  }

  /**
   * Compress context history by summarizing old entries
   */
  public compressHistory(): ContextEntry[] {
    if (!this.config.enableCompression || this.contextHistory.length <= this.config.maxEntries) {
      return this.contextHistory;
    }

    const entriesToCompress = Math.floor(this.contextHistory.length * 0.3); // Compress 30% oldest entries
    const oldEntries = this.contextHistory.slice(0, entriesToCompress);
    const newEntries = this.contextHistory.slice(entriesToCompress);

    // Create a summary entry
    const summaryEntry: ContextEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      role: 'system',
      content: `[Compressed ${entriesToCompress} previous messages] ${oldEntries
        .map(e => `${e.role}: ${e.content.substring(0, 50)}...`)
        .join(' | ')}`,
      metadata: {
        compressed: true,
        originalCount: entriesToCompress,
        originalEntries: oldEntries.map(e => ({ id: e.id, role: e.role, timestamp: e.timestamp }))
      }
    };

    // Replace old entries with summary
    this.contextHistory = [summaryEntry, ...newEntries];
    
    // Recalculate tokens
    this.currentTokens = this.contextHistory.reduce((sum, entry) => sum + this.estimateTokens(entry.content), 0);

    this.emit('historyCompressed', { compressedEntries: entriesToCompress, summaryEntry });
    
    return this.contextHistory;
  }

  /**
   * Export context history to JSON
   */
  public exportHistory(): string {
    return JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      config: this.config,
      history: this.contextHistory
    }, null, 2);
  }

  /**
   * Import context history from JSON
   */
  public importHistory(json: string): boolean {
    try {
      const data = JSON.parse(json);
      
      if (!data.history || !Array.isArray(data.history)) {
        throw new Error('Invalid history format');
      }

      // Validate each entry
      const validHistory: ContextEntry[] = [];
      for (const entry of data.history) {
        if (this.isValidContextEntry(entry)) {
          validHistory.push(entry);
        }
      }

      this.contextHistory = validHistory;
      this.currentTokens = validHistory.reduce((sum, entry) => sum + this.estimateTokens(entry.content), 0);
      
      this.emit('historyImported', { count: validHistory.length });
      return true;
    } catch (error) {
      this.emit('importError', error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ContextConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // Clean up if new limits are stricter
    if (newConfig.maxEntries !== undefined && newConfig.maxEntries < oldConfig.maxEntries) {
      this.cleanup();
    }
    
    this.emit('configUpdated', { old: oldConfig, new: this.config });
  }

  /**
   * Get current configuration
   */
  public getConfig(): ContextConfig {
    return { ...this.config };
  }

  /**
   * Clean up old entries based on configuration
   */
  private cleanup(): void {
    const now = Date.now();
    let needsCleanup = false;

    // Remove expired entries
    if (this.config.retentionPeriod > 0) {
      const expiredCutoff = now - this.config.retentionPeriod;
      const beforeCount = this.contextHistory.length;
      
      this.contextHistory = this.contextHistory.filter(entry => 
        entry.timestamp >= expiredCutoff
      );
      
      if (this.contextHistory.length < beforeCount) {
        needsCleanup = true;
      }
    }

    // Remove entries if over max entries
    if (this.contextHistory.length > this.config.maxEntries) {
      const removeCount = this.contextHistory.length - this.config.maxEntries;
      this.contextHistory.splice(0, removeCount);
      needsCleanup = true;
    }

    // Recalculate tokens if