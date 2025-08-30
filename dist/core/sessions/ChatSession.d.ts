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
export declare class ChatSession {
    readonly id: string;
    settings: SessionSettings;
    private messages;
    private tokenUsage;
    constructor(id: string, settings: SessionSettings);
    addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): string;
    getMessages(): readonly ChatMessage[];
    getMessagesForLLM(): Array<{
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string;
    }>;
    updateSettings(settings: Partial<SessionSettings>): void;
    getTokenUsage(): TokenUsage;
    updateTokenUsage(usage: Partial<TokenUsage>): void;
    clear(): void;
    serialize(): any;
    static deserialize(data: any): ChatSession;
}
