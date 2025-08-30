export class ChatSession {
    id;
    settings;
    messages = [];
    tokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
    };
    constructor(id, settings) {
        this.id = id;
        this.settings = settings;
    }
    addMessage(message) {
        const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const chatMessage = {
            ...message,
            id,
            timestamp: Date.now()
        };
        this.messages.push(chatMessage);
        if (chatMessage.tokenCount) {
            if (chatMessage.role === 'user') {
                this.tokenUsage.inputTokens += chatMessage.tokenCount;
            }
            else if (chatMessage.role === 'assistant') {
                this.tokenUsage.outputTokens += chatMessage.tokenCount;
            }
            this.tokenUsage.totalTokens = this.tokenUsage.inputTokens + this.tokenUsage.outputTokens;
        }
        return id;
    }
    getMessages() {
        return this.messages;
    }
    getMessagesForLLM() {
        return this.messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }
    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
    }
    getTokenUsage() {
        return { ...this.tokenUsage };
    }
    updateTokenUsage(usage) {
        this.tokenUsage = { ...this.tokenUsage, ...usage };
    }
    clear() {
        this.messages = [];
        this.tokenUsage = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0
        };
    }
    serialize() {
        return {
            id: this.id,
            settings: this.settings,
            messages: this.messages,
            tokenUsage: this.tokenUsage,
            createdAt: this.messages[0]?.timestamp || Date.now(),
            updatedAt: this.messages[this.messages.length - 1]?.timestamp || Date.now()
        };
    }
    static deserialize(data) {
        const session = new ChatSession(data.id, data.settings);
        session.messages = data.messages || [];
        session.tokenUsage = data.tokenUsage || {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0
        };
        return session;
    }
}
//# sourceMappingURL=ChatSession.js.map