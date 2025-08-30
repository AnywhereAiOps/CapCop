import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useState, useEffect, useRef } from 'preact/hooks';
import '../types';
export function App() {
    const [state, setState] = useState({
        providers: [],
        sessions: [],
        currentMessages: [],
        isReady: false,
        isStreaming: false
    });
    const [inputValue, setInputValue] = useState('');
    const [attachments, setAttachments] = useState([]);
    const messagesEndRef = useRef(null);
    const vscodeRef = useRef(null);
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
        const handleMessage = (event) => {
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
                        currentMessages: prev.currentMessages.map(msg => msg.id === prev.streamingMessageId
                            ? { ...msg, content: msg.content + message.data.chunk }
                            : msg)
                    }));
                    break;
                case 'streamComplete':
                    setState(prev => {
                        const updatedState = { ...prev };
                        delete updatedState.streamingMessageId;
                        return {
                            ...updatedState,
                            isStreaming: false,
                            currentMessages: prev.currentMessages.map(msg => msg.id === prev.streamingMessageId
                                ? { ...msg, isStreaming: false, ...message.data.message }
                                : msg)
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
                            currentMessages: prev.currentMessages.map(msg => msg.id === prev.streamingMessageId
                                ? {
                                    ...msg,
                                    isStreaming: false,
                                    content: `Error: ${message.data.error}`
                                }
                                : msg)
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
        if (!inputValue.trim() || state.isStreaming)
            return;
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
    const handleKeyPress = (e) => {
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
        return (_jsxs("div", { className: "loading", children: [_jsx("div", { className: "loading-spinner" }), _jsx("p", { children: "Loading CapCop..." })] }));
    }
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "app-header", children: [_jsx("h1", { children: "CapCop" }), _jsxs("div", { className: "header-actions", children: [_jsx("button", { className: "btn btn-primary", title: "Start New Chat", onClick: handleNewChat, children: "\u271A" }), _jsx("button", { className: "btn btn-secondary", title: "Configure Provider", children: "\u2699\uFE0F" })] })] }), _jsx("main", { className: "app-main", children: state.sessions.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-state-icon", children: "\uD83D\uDCAC" }), _jsx("h3", { children: "No chat sessions" }), _jsx("p", { children: "Start a new chat to begin coding with AI assistance" }), _jsx("button", { className: "btn btn-primary", onClick: handleNewChat, children: "Start New Chat" })] })) : (_jsxs("div", { className: "chat-interface", children: [state.sessions.length > 1 && (_jsx("div", { className: "session-info", children: _jsx("select", { className: "session-selector", value: state.activeSessionId, onChange: (e) => {
                                    const sessionId = e.target.value;
                                    vscodeRef.current.postMessage({
                                        type: 'switchSession',
                                        data: { sessionId }
                                    });
                                }, children: state.sessions.map(session => (_jsxs("option", { value: session.id, children: ["Chat (", session.messageCount, " messages)"] }, session.id))) }) })), _jsxs("div", { className: "messages-container", children: [state.currentMessages.length === 0 && (_jsx("div", { className: "message system", children: _jsx("div", { className: "message-content", children: "Welcome to CapCop! I'm your AI coding assistant, designed specifically for web environments. I can help you with code understanding, file operations, and context-aware assistance." }) })), state.currentMessages.map((message, index) => (_jsxs("div", { className: `message ${message.role}`, children: [_jsxs("div", { className: "message-content", children: [message.content, message.isStreaming && _jsx("span", { className: "streaming-cursor", children: "\u258B" })] }), message.timestamp && (_jsx("div", { className: "message-timestamp", children: new Date(message.timestamp).toLocaleTimeString() }))] }, message.id || index))), _jsx("div", { ref: messagesEndRef })] }), _jsxs("div", { className: "input-container", children: [attachments.length > 0 && (_jsx("div", { className: "attachments", children: attachments.map((attachment, index) => (_jsxs("div", { className: "attachment-chip", children: [attachment.type, ": ", attachment.path || attachment.url || 'Problems', _jsx("button", { className: "remove-attachment", onClick: () => setAttachments(prev => prev.filter((_, i) => i !== index)), children: "\u2715" })] }, index))) })), _jsxs("div", { className: "input-toolbar", children: [_jsx("button", { className: "btn btn-sm", title: "Attach File", children: "\uD83D\uDCC4" }), _jsx("button", { className: "btn btn-sm", title: "Attach Folder", children: "\uD83D\uDCC1" }), _jsx("button", { className: "btn btn-sm", title: "Attach URL", children: "\uD83D\uDD17" }), _jsx("button", { className: "btn btn-sm", title: "Attach Problems", children: "\u26A0\uFE0F" })] }), _jsxs("div", { className: "input-wrapper", children: [_jsx("textarea", { className: "message-input", placeholder: "Ask me anything about your code...", rows: 3, value: inputValue, onChange: (e) => setInputValue(e.target.value), onKeyPress: handleKeyPress, disabled: state.isStreaming }), _jsx("button", { className: "send-button", title: "Send Message", onClick: handleSendMessage, disabled: !inputValue.trim() || state.isStreaming, children: state.isStreaming ? '⏸️' : '➤' })] })] })] })) }), _jsxs("footer", { className: "app-footer", children: [state.providers.length > 0 && (_jsxs("div", { className: "provider-status", children: [_jsx("span", { className: "provider-label", children: "Provider:" }), _jsx("select", { className: "provider-select", children: state.providers.map(provider => (_jsx("option", { value: provider.id, children: provider.displayName }, provider.id))) })] })), state.sessions.find(s => s.id === state.activeSessionId) && (_jsx("div", { className: "token-usage", children: (() => {
                            const session = state.sessions.find(s => s.id === state.activeSessionId);
                            return session ? `${session.tokenUsage.totalTokens} tokens` : '';
                        })() }))] })] }));
}
//# sourceMappingURL=App.js.map