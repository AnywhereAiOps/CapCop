import * as vscode from 'vscode';
import { ProviderRegistry } from '../core/providers/ProviderRegistry';
import { ToolRegistry } from '../core/tools/ToolRegistry';
import { ChatSessionManager } from '../core/sessions/ChatSessionManager';
import { Logger } from '../core/logging/Logger';

export class CapCopSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'capcop.sidebar';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly providerRegistry: ProviderRegistry,
        private readonly toolRegistry: ToolRegistry,
        private readonly sessionManager: ChatSessionManager,
        private readonly logger: Logger
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.extensionUri, 'src', 'ui', 'webview')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            this._handleWebviewMessage.bind(this),
            undefined
        );

        this.logger.info('CapCop sidebar webview resolved');
    }

    public focusSession(sessionId: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'focusSession',
                data: { sessionId }
            });
        }
    }

    public attachFiles(files: vscode.Uri[]) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'attachFiles',
                data: { files: files.map(f => f.fsPath) }
            });
        }
    }

    public attachFolder(folder: vscode.Uri) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'attachFolder',
                data: { folder: folder.fsPath }
            });
        }
    }

    public attachUrl(url: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'attachUrl',
                data: { url }
            });
        }
    }

    public attachProblems() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'attachProblems',
                data: {}
            });
        }
    }

    public dispose() {
        // WebviewView doesn't have a dispose method, but we can clear our reference
        (this._view as any) = undefined;
    }

    private async _handleWebviewMessage(message: any) {
        try {
            switch (message.type) {
                case 'ready':
                    await this._handleReady();
                    break;

                case 'sendMessage':
                    await this._handleSendMessage(message.data);
                    break;

                case 'getProviders':
                    await this._handleGetProviders();
                    break;

                case 'getModels':
                    await this._handleGetModels(message.data);
                    break;

                case 'createSession':
                    await this._handleCreateSession(message.data);
                    break;

                case 'switchSession':
                    await this._handleSwitchSession(message.data);
                    break;

                default:
                    this.logger.warn(`Unknown message type: ${message.type}`);
            }
        } catch (error) {
            this.logger.error('Error handling webview message', error);
            this._postMessage({
                type: 'error',
                data: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    details: error
                }
            });
        }
    }

    private async _handleReady() {
        // Send initial data to webview
        const providers = this.providerRegistry.getProviders();
        const sessions = this.sessionManager.getSessionsSortedByActivity();
        const activeSession = this.sessionManager.getActiveSession();

        this._postMessage({
            type: 'initialize',
            data: {
                providers: providers.map(p => ({ id: p.id, displayName: p.displayName })),
                sessions: sessions.map(s => ({
                    id: s.id,
                    settings: s.settings,
                    messageCount: s.getMessages().length,
                    tokenUsage: s.getTokenUsage()
                })),
                activeSessionId: activeSession?.id
            }
        });
    }

    private async _handleSendMessage(data: any) {
        try {
            const { message, sessionId, attachments } = data;
            
            // Get or create active session
            let session = this.sessionManager.getActiveSession();
            if (!session || (sessionId && session.id !== sessionId)) {
                if (sessionId) {
                    session = this.sessionManager.getSession(sessionId);
                    if (session) {
                        this.sessionManager.setActiveSession(sessionId);
                    }
                }
                
                if (!session) {
                    // Create a new session with default settings
                    const newSessionId = await this.sessionManager.createSession({
                        providerId: 'openrouter',
                        modelId: 'openai/gpt-3.5-turbo',
                        temperature: 0.7,
                        systemMessage: 'You are a helpful coding assistant.'
                    });
                    session = this.sessionManager.getSession(newSessionId);
                }
            }

            if (!session) {
                throw new Error('Could not create or get session');
            }

            // Process attachments and build context
            let fullMessage = message;
            if (attachments && attachments.length > 0) {
                fullMessage = await this._processAttachments(message, attachments);
            }

            // Add user message to session
            session.addMessage({
                role: 'user',
                content: fullMessage
            });
            
            // Get provider for streaming
            const provider = this.providerRegistry.getProvider(session.settings.providerId);
            if (!provider) {
                throw new Error(`Provider ${session.settings.providerId} not found`);
            }

            // Send user message to webview immediately
            this._postMessage({
                type: 'messageAdded',
                data: {
                    sessionId: session.id,
                    message: {
                        role: 'user',
                        content: fullMessage,
                        timestamp: Date.now()
                    }
                }
            });

            // Start streaming response
            this._postMessage({
                type: 'streamStart',
                data: { sessionId: session.id }
            });

            let assistantMessage = '';
            const messages = session.getMessages();
            
            try {
                // Create streaming request
                const streamOptions: any = {
                    model: session.settings.modelId,
                    messages: messages.map(m => ({
                        role: m.role as any,
                        content: m.content
                    })),
                    temperature: session.settings.temperature,
                    tools: this.toolRegistry.getToolSchemas()
                };

                // Only add system message if it exists
                if (session.settings.systemMessage) {
                    streamOptions.system = session.settings.systemMessage;
                }

                // Stream the response
                for await (const chunk of provider.streamChat(streamOptions)) {
                    if (chunk.type === 'text' && chunk.data) {
                        assistantMessage += chunk.data;
                        
                        // Send streaming chunk to webview
                        this._postMessage({
                            type: 'streamChunk',
                            data: {
                                sessionId: session.id,
                                chunk: chunk.data
                            }
                        });
                    } else if (chunk.type === 'tool_call' && chunk.data) {
                        // Handle tool calls
                        await this._handleToolCall(chunk.data, session);
                    } else if (chunk.type === 'warning') {
                        // Send warning to webview
                        this._postMessage({
                            type: 'streamWarning',
                            data: {
                                sessionId: session.id,
                                message: chunk.data
                            }
                        });
                    }
                }

                // Add complete assistant message to session
                if (assistantMessage.trim()) {
                    session.addMessage({
                        role: 'assistant',
                        content: assistantMessage
                    });
                }

                // Send stream complete
                this._postMessage({
                    type: 'streamComplete',
                    data: {
                        sessionId: session.id,
                        message: {
                            role: 'assistant',
                            content: assistantMessage,
                            timestamp: Date.now()
                        },
                        tokenUsage: session.getTokenUsage()
                    }
                });

            } catch (streamError) {
                this.logger.error('Streaming error:', streamError);
                
                // Send stream error
                this._postMessage({
                    type: 'streamError',
                    data: {
                        sessionId: session.id,
                        error: streamError instanceof Error ? streamError.message : 'Unknown streaming error'
                    }
                });
            }

        } catch (error) {
            this.logger.error('Error handling send message:', error);
            
            this._postMessage({
                type: 'error',
                data: {
                    message: error instanceof Error ? error.message : 'Failed to send message',
                    details: error
                }
            });
        }
    }

    private async _processAttachments(message: string, attachments: any[]): Promise<string> {
        let processedMessage = message;
        
        for (const attachment of attachments) {
            try {
                switch (attachment.type) {
                    case 'file':
                        processedMessage += await this._attachFile(attachment.path);
                        break;
                    case 'folder':
                        processedMessage += await this._attachFolder(attachment.path);
                        break;
                    case 'url':
                        processedMessage += await this._attachUrl(attachment.url);
                        break;
                    case 'problems':
                        processedMessage += await this._attachProblems();
                        break;
                }
            } catch (error) {
                this.logger.warn(`Failed to process attachment ${attachment.type}:`, error);
                processedMessage += `\n\n[Error: Could not attach ${attachment.type}]`;
            }
        }
        
        return processedMessage;
    }

    private async _attachFile(filePath: string): Promise<string> {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            return `\n\n**File: ${filePath}**\n\`\`\`\n${document.getText()}\n\`\`\``;
        } catch (error) {
            throw new Error(`Could not read file: ${filePath}`);
        }
    }

    private async _attachFolder(folderPath: string): Promise<string> {
        try {
            const uri = vscode.Uri.file(folderPath);
            const entries = await vscode.workspace.fs.readDirectory(uri);
            
            const fileList = entries
                .map(([name, type]) => `${type === vscode.FileType.Directory ? '📁' : '📄'} ${name}`)
                .join('\n');
                
            return `\n\n**Folder: ${folderPath}**\n\`\`\`\n${fileList}\n\`\`\``;
        } catch (error) {
            throw new Error(`Could not read folder: ${folderPath}`);
        }
    }

    private async _attachUrl(url: string): Promise<string> {
        // For now, just include the URL - future implementation could fetch and convert to markdown
        return `\n\n**URL Reference: ${url}**`;
    }

    private async _attachProblems(): Promise<string> {
        const diagnostics = vscode.languages.getDiagnostics();
        let problemsText = '\n\n**Current Problems:**\n';
        
        let problemCount = 0;
        for (const [uri, diagnostics_] of diagnostics) {
            for (const diagnostic of diagnostics_) {
                if (problemCount >= 20) break; // Limit to prevent overwhelming context
                
                const severity = diagnostic.severity === vscode.DiagnosticSeverity.Error ? 'ERROR' : 
                                diagnostic.severity === vscode.DiagnosticSeverity.Warning ? 'WARNING' : 'INFO';
                
                problemsText += `- ${severity}: ${diagnostic.message} (${uri.fsPath}:${diagnostic.range.start.line + 1})\n`;
                problemCount++;
            }
            if (problemCount >= 20) break;
        }
        
        if (problemCount === 0) {
            problemsText += 'No problems found.\n';
        }
        
        return problemsText;
    }

    private async _handleToolCall(toolCallData: any, session: any) {
        try {
            const { id: toolId, name: toolName, arguments: toolArgs } = toolCallData;
            
            this.logger.info(`Executing tool: ${toolName}`, { toolId, args: toolArgs });
            
            // Send tool execution start message to webview
            this._postMessage({
                type: 'toolExecutionStart',
                data: {
                    sessionId: session.id,
                    toolId,
                    toolName,
                    arguments: toolArgs
                }
            });

            // Execute the tool
            const context: any = {
                sessionId: session.id,
                userId: 'user'
            };

            const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri.toString();
            if (workspaceUri) {
                context.workspaceUri = workspaceUri;
            }

            const result = await this.toolRegistry.executeTool(toolName, toolArgs, context);

            // Send tool execution result to webview
            this._postMessage({
                type: 'toolExecutionComplete',
                data: {
                    sessionId: session.id,
                    toolId,
                    toolName,
                    result,
                    success: result.success
                }
            });

            // Add tool result to session messages
            if (result.success) {
                session.addMessage({
                    role: 'tool',
                    content: `Tool ${toolName} executed successfully: ${JSON.stringify(result.data, null, 2)}`
                });
            } else {
                session.addMessage({
                    role: 'tool',
                    content: `Tool ${toolName} failed: ${result.error}`
                });
            }

            this.logger.info(`Tool execution ${result.success ? 'completed' : 'failed'}:`, result);

        } catch (error) {
            this.logger.error('Error executing tool:', error);
            
            this._postMessage({
                type: 'toolExecutionError',
                data: {
                    sessionId: session.id,
                    error: error instanceof Error ? error.message : 'Unknown tool execution error'
                }
            });
        }
    }

    private async _handleGetProviders() {
        const providers = this.providerRegistry.getProviders();
        this._postMessage({
            type: 'providers',
            data: {
                providers: providers.map(p => ({ id: p.id, displayName: p.displayName }))
            }
        });
    }

    private async _handleGetModels(data: { providerId: string }) {
        try {
            const models = await this.providerRegistry.getModels(data.providerId);
            this._postMessage({
                type: 'models',
                data: {
                    providerId: data.providerId,
                    models
                }
            });
        } catch (error) {
            this._postMessage({
                type: 'error',
                data: {
                    message: `Failed to get models for ${data.providerId}`,
                    details: error
                }
            });
        }
    }

    private async _handleCreateSession(data: any) {
        const sessionId = await this.sessionManager.createSession(data.settings);
        this._postMessage({
            type: 'sessionCreated',
            data: { sessionId }
        });
    }

    private async _handleSwitchSession(data: { sessionId: string }) {
        const success = this.sessionManager.setActiveSession(data.sessionId);
        if (success) {
            const session = this.sessionManager.getSession(data.sessionId);
            this._postMessage({
                type: 'sessionSwitched',
                data: {
                    sessionId: data.sessionId,
                    session: session ? {
                        id: session.id,
                        settings: session.settings,
                        messages: session.getMessages(),
                        tokenUsage: session.getTokenUsage()
                    } : null
                }
            });
        }
    }

    private _postMessage(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'main.js')
        );
        const stylesUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'styles.css')
        );

        const nonce = this._getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: blob:; style-src 'nonce-${nonce}' ${webview.cspSource}; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
    <link nonce="${nonce}" rel="stylesheet" href="${stylesUri}">
    <title>CapCop</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
