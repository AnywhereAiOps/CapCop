import { ProviderAdapter, StreamChunk, ModelInfo } from './ProviderAdapter';
export declare class OpenRouterProvider implements ProviderAdapter {
    private apiKey;
    private baseUrl;
    id: string;
    displayName: string;
    constructor(apiKey: string, baseUrl?: string);
    getModels(): Promise<ModelInfo[]>;
    streamChat(opts: {
        model: string;
        system?: string;
        messages: {
            role: 'system' | 'user' | 'assistant' | 'tool';
            content: string;
        }[];
        temperature?: number;
        tools?: any[];
        signal?: AbortSignal;
    }): AsyncIterable<StreamChunk>;
    estimateTokens(text: string): number;
    maxInputTokens(model: string): number | undefined;
}
