export interface ChatMessage {
    id: string;
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    timestamp: number;
    tokenCount?: number;
}

export interface SessionSettings {
    providerId: string;
    modelId: string;
    temperature: number;
    systemMessage?: string;
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost?: number;
}

export class ChatSession {
    private messages: ChatMessage[] = [];
    private tokenUsage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
    };

    constructor(
        public readonly id: string,
        public settings: SessionSettings
    ) {}

    addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): string {
        const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const chatMessage: ChatMessage = {
            ...message,
            id,
            timestamp: Date.now()
        };
        
        this.messages.push(chatMessage);
        
        if (chatMessage.tokenCount) {
            if (chatMessage.role === 'user') {
                this.tokenUsage.inputTokens += chatMessage.tokenCount;
            } else if (chatMessage.role === 'assistant') {
                this.tokenUsage.outputTokens += chatMessage.tokenCount;
            }
            this.tokenUsage.totalTokens = this.tokenUsage.inputTokens + this.tokenUsage.outputTokens;
        }
        
        return id;
    }

    getMessages(): readonly ChatMessage[] {
        return this.messages;
    }

    getMessagesForLLM(): Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }> {
        return this.messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    updateSettings(settings: Partial<SessionSettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

    getTokenUsage(): TokenUsage {
        return { ...this.tokenUsage };
    }

    updateTokenUsage(usage: Partial<TokenUsage>): void {
        this.tokenUsage = { ...this.tokenUsage, ...usage };
    }

    clear(): void {
        this.messages = [];
        this.tokenUsage = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0
        };
    }

    serialize(): any {
        return {
            id: this.id,
            settings: this.settings,
            messages: this.messages,
            tokenUsage: this.tokenUsage,
            createdAt: this.messages[0]?.timestamp || Date.now(),
            updatedAt: this.messages[this.messages.length - 1]?.timestamp || Date.now()
        };
    }

    static deserialize(data: any): ChatSession {
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
