import { useState, useEffect, useRef } from 'preact/hooks';
import '../types';

interface Provider {
    id: string;
    displayName: string;
}

interface Message {
    id?: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    isStreaming?: boolean;
}

interface Session {
    id: string;
    settings: {
        providerId: string;
        modelId: string;
        temperature: number;
        systemMessage?: string;
    };
    messages?: Message[];
    messageCount: number;
    tokenUsage: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
        estimatedCost?: number;
    };
}

interface AppState {
    providers: Provider[];
    sessions: Session[];
    activeSessionId?: string;
    currentMessages: Message[];
    isReady: boolean;
    isStreaming: boolean;
    streamingMessageId?: string;
}

export function App() {
    const [state, setState] = useState<AppState>({
        providers: [],
        sessions: [],
        currentMessages: [],
        isReady: false,
        isStreaming: false
    });
    
    const [inputValue, setInputValue] = useState('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const vscodeRef = useRef<any>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [state.currentMessages]);

    useEffect(() => {
        // Get VS Code API
        vscodeRef.current = acquireVsCodeApi();

        // Handle messages from extension
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            
            switch (message.type) {
                case 'initialize':
                    setState(prev => ({
                        ...prev,
                        providers: message.data.providers,
                        sessions: message.data.sessions,
                        activeSessionId: message.data.activeSessionId,
                        isReady: true,
                        currentMessages: []
                    }));
                    break;

                case 'sessionSwitched':
                    if (message.data.session) {
                        setState(prev => ({
                            ...prev,
                            activeSessionId: message.data.sessionId,
                            currentMessages: message.data.session.messages || []
                        }));
                    }
                    break;

                case 'messageAdded':
                    setState(prev => ({
                        ...prev,
                        currentMessages: [...prev.currentMessages, message.data.message]
                    }));
                    break;

                case 'streamStart':
                    const streamingId = `streaming-${Date.now()}`;
                    setState(prev => ({
                        ...prev,
                        isStreaming: true,
                        streamingMessageId: streamingId,
                        currentMessages: [...prev.currentMessages, {
                            id: streamingId,
                            role: 'assistant',
                            content: '',
                            timestamp: Date.now(),
                            isStreaming: true
                        }]
                    }));
                    break;

                case 'streamChunk':
                    setState(prev => ({
                        ...prev,
                        currentMessages: prev.currentMessages.map(msg => 
                            msg.id === prev.streamingMessageId 
                                ? { ...msg, content: msg.content + message.data.chunk }
                                : msg
                        )
                    }));
                    break;

                case 'streamComplete':
                    setState(prev => {
                        const updatedState = { ...prev };
                        delete updatedState.streamingMessageId;
                        return {
                            ...updatedState,
                            isStreaming: false,
                            currentMessages: prev.currentMessages.map(msg =>
                                msg.id === prev.streamingMessageId
                                    ? { ...msg, isStreaming: false, ...message.data.message }
                                    : msg
                            )
                        };
                    });
                    break;

                case 'streamError':
                    setState(prev => {
                        const updatedState = { ...prev };
                        delete updatedState.streamingMessageId;
                        return {
                            ...updatedState,
                            isStreaming: false,
                            currentMessages: prev.currentMessages.map(msg =>
                                msg.id === prev.streamingMessageId
                                    ? { 
                                        ...msg, 
                                        isStreaming: false,
                                        content: `Error: ${message.data.error}`
                                    }
                                    : msg
                            )
                        };
                    });
                    break;

                case 'error':
                    console.error('Extension error:', message.data.message);
                    // You could show a toast notification here
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        };

        window.addEventListener('message', handleMessage);

        // Send ready message
        vscodeRef.current.postMessage({ type: 'ready' });

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    const handleSendMessage = () => {
        if (!inputValue.trim() || state.isStreaming) return;

        vscodeRef.current.postMessage({
            type: 'sendMessage',
            data: {
                message: inputValue,
                sessionId: state.activeSessionId,
                attachments: attachments
            }
        });

        setInputValue('');
        setAttachments([]);
    };

    const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleNewChat = () => {
        vscodeRef.current.postMessage({
            type: 'createSession',
            data: {
                settings: {
                    providerId: 'openrouter',
                    modelId: 'openai/gpt-3.5-turbo',
                    temperature: 0.7,
                    systemMessage: 'You are a helpful coding assistant.'
                }
            }
        });
    };

    if (!state.isReady) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
                <p>Loading CapCop...</p>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="app-header">
                <h1>CapCop</h1>
                <div className="header-actions">
                    <button className="btn btn-primary" title="Start New Chat" onClick={handleNewChat}>
                        ✚
                    </button>
                    <button className="btn btn-secondary" title="Configure Provider">
                        ⚙️
                    </button>
                </div>
            </header>

            <main className="app-main">
                {state.sessions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">💬</div>
                        <h3>No chat sessions</h3>
                        <p>Start a new chat to begin coding with AI assistance</p>
                        <button className="btn btn-primary" onClick={handleNewChat}>Start New Chat</button>
                    </div>
                ) : (
                    <div className="chat-interface">
                        {state.sessions.length > 1 && (
                            <div className="session-info">
                                <select 
                                    className="session-selector" 
                                    value={state.activeSessionId}
                                    onChange={(e) => {
                                        const sessionId = (e.target as HTMLSelectElement).value;
                                        vscodeRef.current.postMessage({
                                            type: 'switchSession',
                                            data: { sessionId }
                                        });
                                    }}
                                >
                                    {state.sessions.map(session => (
                                        <option key={session.id} value={session.id}>
                                            Chat ({session.messageCount} messages)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="messages-container">
                            {state.currentMessages.length === 0 && (
                                <div className="message system">
                                    <div className="message-content">
                                        Welcome to CapCop! I'm your AI coding assistant, designed specifically for web environments.
                                        I can help you with code understanding, file operations, and context-aware assistance.
                                    </div>
                                </div>
                            )}
                            
                            {state.currentMessages.map((message, index) => (
                                <div key={message.id || index} className={`message ${message.role}`}>
                                    <div className="message-content">
                                        {message.content}
                                        {message.isStreaming && <span className="streaming-cursor">▋</span>}
                                    </div>
                                    {message.timestamp && (
                                        <div className="message-timestamp">
                                            {new Date(message.timestamp).toLocaleTimeString()}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="input-container">
                            {attachments.length > 0 && (
                                <div className="attachments">
                                    {attachments.map((attachment, index) => (
                                        <div key={index} className="attachment-chip">
                                            {attachment.type}: {attachment.path || attachment.url || 'Problems'}
                                            <button 
                                                className="remove-attachment"
                                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="input-toolbar">
                                <button className="btn btn-sm" title="Attach File">📄</button>
                                <button className="btn btn-sm" title="Attach Folder">📁</button>
                                <button className="btn btn-sm" title="Attach URL">🔗</button>
                                <button className="btn btn-sm" title="Attach Problems">⚠️</button>
                            </div>
                            
                            <div className="input-wrapper">
                                <textarea 
                                    className="message-input"
                                    placeholder="Ask me anything about your code..."
                                    rows={3}
                                    value={inputValue}
                                    onChange={(e) => setInputValue((e.target as HTMLTextAreaElement).value)}
                                    onKeyPress={handleKeyPress}
                                    disabled={state.isStreaming}
                                />
                                <button 
                                    className="send-button" 
                                    title="Send Message"
                                    onClick={handleSendMessage}
                                    disabled={!inputValue.trim() || state.isStreaming}
                                >
                                    {state.isStreaming ? '⏸️' : '➤'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <footer className="app-footer">
                {state.providers.length > 0 && (
                    <div className="provider-status">
                        <span className="provider-label">Provider:</span>
                        <select className="provider-select">
                            {state.providers.map(provider => (
                                <option key={provider.id} value={provider.id}>
                                    {provider.displayName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {state.sessions.find(s => s.id === state.activeSessionId) && (
                    <div className="token-usage">
                        {(() => {
                            const session = state.sessions.find(s => s.id === state.activeSessionId);
                            return session ? `${session.tokenUsage.totalTokens} tokens` : '';
                        })()}
                    </div>
                )}
            </footer>
        </div>
    );
}
