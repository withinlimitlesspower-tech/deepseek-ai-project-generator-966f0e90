// AI Project Generator - Main Application
// Vanilla JavaScript ES6+ Implementation

class AIProjectGenerator {
    constructor() {
        this.state = {
            currentProject: null,
            conversationHistory: [],
            isLoading: false,
            error: null,
            blueprints: [],
            generatedFiles: []
        };
        
        this.init();
    }

    async init() {
        try {
            this.setupEventListeners();
            this.renderUI();
            await this.loadInitialData();
        } catch (error) {
            this.handleError(error);
        }
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Project generation
            document.getElementById('generate-btn')?.addEventListener('click', () => this.generateProject());
            document.getElementById('blueprint-btn')?.addEventListener('click', () => this.showBlueprint());
            
            // Conversation
            document.getElementById('send-message')?.addEventListener('click', () => this.sendMessage());
            document.getElementById('user-input')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
            
            // File management
            document.getElementById('download-all')?.addEventListener('click', () => this.downloadAllFiles());
            
            // Error handling
            document.getElementById('dismiss-error')?.addEventListener('click', () => this.clearError());
        });
    }

    renderUI() {
        const appContainer = document.getElementById('app');
        if (!appContainer) return;

        appContainer.innerHTML = `
            <div class="app-container">
                <header class="app-header">
                    <h1>🧠 AI Project Generator V5.5</h1>
                    <p class="subtitle">DeepSeek V3.2 - Complete Project Generation System</p>
                </header>

                <div class="main-content">
                    <!-- Left Panel: Project Controls -->
                    <div class="panel project-panel">
                        <div class="panel-header">
                            <h2>🎯 Project Generation</h2>
                            <div class="controls">
                                <button id="generate-btn" class="btn btn-primary" ${this.state.isLoading ? 'disabled' : ''}>
                                    ${this.state.isLoading ? 'Generating...' : 'Generate Project'}
                                </button>
                                <button id="blueprint-btn" class="btn btn-secondary" ${!this.state.currentProject ? 'disabled' : ''}>
                                    Show Blueprint
                                </button>
                            </div>
                        </div>

                        <div class="project-info">
                            ${this.renderProjectInfo()}
                        </div>

                        <div class="files-section">
                            <h3>📁 Generated Files</h3>
                            <div class="files-list">
                                ${this.renderFilesList()}
                            </div>
                            <button id="download-all" class="btn btn-secondary" ${this.state.generatedFiles.length === 0 ? 'disabled' : ''}>
                                Download All Files
                            </button>
                        </div>
                    </div>

                    <!-- Right Panel: AI Conversation -->
                    <div class="panel conversation-panel">
                        <div class="panel-header">
                            <h2>💬 AI Assistant</h2>
                        </div>

                        <div class="conversation-history">
                            ${this.renderConversation()}
                        </div>

                        <div class="message-input">
                            <input 
                                type="text" 
                                id="user-input" 
                                placeholder="Ask about the project or request changes..." 
                                ${this.state.isLoading ? 'disabled' : ''}
                            />
                            <button id="send-message" class="btn btn-primary" ${this.state.isLoading ? 'disabled' : ''}>
                                Send
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Blueprint Modal -->
                <div id="blueprint-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>📋 Project Blueprint</h2>
                            <span class="close-modal">&times;</span>
                        </div>
                        <div class="modal-body">
                            ${this.renderBlueprint()}
                        </div>
                    </div>
                </div>

                <!-- Error Toast -->
                ${this.state.error ? this.renderErrorToast() : ''}
            </div>
        `;

        // Add modal close handler
        const modal = document.getElementById('blueprint-modal');
        const closeBtn = modal?.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
    }

    renderProjectInfo() {
        if (!this.state.currentProject) {
            return '<p class="empty-state">No project generated yet. Click "Generate Project" to start.</p>';
        }

        return `
            <div class="project-details">
                <h3>${this.state.currentProject.name}</h3>
                <p><strong>Type:</strong> ${this.state.currentProject.type}</p>
                <p><strong>Status:</strong> <span class="status-badge ${this.state.currentProject.status}">${this.state.currentProject.status}</span></p>
                <p><strong>Generated:</strong> ${new Date(this.state.currentProject.createdAt).toLocaleString()}</p>
                <p><strong>Description:</strong> ${this.state.currentProject.description}</p>
            </div>
        `;
    }

    renderFilesList() {
        if (this.state.generatedFiles.length === 0) {
            return '<p class="empty-state">No files generated yet.</p>';
        }

        return this.state.generatedFiles.map(file => `
            <div class="file-item">
                <span class="file-icon">📄</span>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${this.formatFileSize(file.size)}</span>
                <button class="btn btn-small" onclick="app.downloadFile('${file.id}')">Download</button>
            </div>
        `).join('');
    }

    renderConversation() {
        if (this.state.conversationHistory.length === 0) {
            return '<p class="empty-state">Start a conversation with the AI assistant...</p>';
        }

        return this.state.conversationHistory.map(msg => `
            <div class="message ${msg.role}">
                <div class="message-header">
                    <span class="message-role">${msg.role === 'user' ? '👤 You' : '🤖 AI'}</span>
                    <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="message-content">${msg.content}</div>
            </div>
        `).join('');
    }

    renderBlueprint() {
        if (this.state.blueprints.length === 0) {
            return '<p>No blueprint available.</p>';
        }

        return this.state.blueprints.map(blueprint => `
            <div class="blueprint-section">
                <h3>${blueprint.title}</h3>
                <pre><code>${blueprint.content}</code></pre>
            </div>
        `).join('');
    }

    renderErrorToast() {
        return `
            <div class="error-toast">
                <div class="error-content">
                    <span class="error-icon">⚠️</span>
                    <span class="error-message">${this.state.error}</span>
                    <button id="dismiss-error" class="btn btn-small">Dismiss</button>
                </div>
            </div>
        `;
    }

    async generateProject() {
        try {
            this.setState({ isLoading: true, error: null });
            
            // Simulate API call
            const projectData = await this.simulateProjectGeneration();
            
            this.setState({
                currentProject: projectData.project,
                blueprints: projectData.blueprints,
                generatedFiles: projectData.files,
                conversationHistory: [
                    ...this.state.conversationHistory,
                    {
                        role: 'assistant',
                        content: `✅ Project "${projectData.project.name}" generated successfully!`,
                        timestamp: new Date().toISOString()
                    }
                ]
            });
            
            this.renderUI();
        } catch (error) {
            this.handleError(error);
        } finally {
            this.setState({ isLoading: false });
            this.renderUI();
        }
    }

    async simulateProjectGeneration() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return {
            project: {
                id: 'proj_' + Date.now(),
                name: 'Web Application Project',
                type: 'Full-stack JavaScript',
                status: 'completed',
                description: 'A complete web application with frontend and backend components',
                createdAt: new Date().toISOString()
            },
            blueprints: [
                {
                    title: 'Project Structure',
                    content: `project-root/
├── src/
│   ├── core/
│   │   ├── ai-assistant.js
│   │   ├── project-generator.js
│   │   └── context-manager.js
│   ├── api/
│   │   ├── routes/
│   │   └── middleware/
│   ├── utils/
│   └── web/
├── package.json
└── README.md`
                }
            ],
            files: [
                { id: 'file1', name: 'package.json', size: 1024, content: '{}' },
                { id: 'file2', name: 'src/index.js', size: 2048, content: '// Main entry point' },
                { id: 'file3', name: 'README.md', size: 512, content: '# Project Documentation' }
            ]
        };
    }

    async sendMessage() {
        const input = document.getElementById('user-input');
        if (!input || !input.value.trim()) return;

        const message = input.value.trim();
        input.value = '';
        
        // Add user message
        this.setState({
            conversationHistory: [
                ...this.state.conversationHistory,
                {
                    role: 'user',
                    content: message,
                    timestamp: new Date().toISOString()
                }
            ]
        });
        
        this.renderUI();
        
        try {
            this.setState({ isLoading: true });
            
            // Simulate AI response
            const response = await this.simulateAIResponse(message);
            
            this.setState({
                conversationHistory: [
                    ...this.state.conversationHistory,
                    {
                        role: 'assistant',
                        content: response,
                        timestamp: new Date().toISOString()
                    }
                ]
            });
        } catch (error) {
            this.handleError(error);
        } finally {
            this.setState({ isLoading: false });
            this.renderUI();
            
            // Scroll to bottom of conversation
            const conversationDiv = document.querySelector('.conversation-history');
            if (conversationDiv) {
                conversationDiv.scrollTop = conversationDiv.scrollHeight;
            }
        }
    }

    async simulateAIResponse(message) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const responses = {
            'hello': 'Hello! I\'m your AI assistant. How can I help with your project today?',
            'help': 'I can help you generate projects, explain code, suggest improvements, and answer questions about the generated files.',
            'blueprint': 'The blueprint shows the complete project structure. You can view it by clicking "Show Blueprint".',