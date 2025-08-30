export type StreamChunk = { 
    type: 'text' | 'tool_call' | 'warning' | 'done'; 
    data?: string; 
};

export interface ModelInfo {
    id: string;
    label: string;
    contextWindow?: number;
    supportsToolCalls?: boolean;
}

export interface ProviderInit {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
    region?: string;
}

export interface ToolSchema {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: {
            type: 'object';
            properties: Record<string, any>;
            required?: string[];
        };
    };
}

export interface ProviderAdapter {
    id: string;
    displayName: string;
    getModels(): Promise<ModelInfo[]>;
    streamChat(opts: {
        model: string;
        system?: string;
        messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string }[];
        temperature?: number;
        tools?: ToolSchema[];
        signal?: AbortSignal;
    }): AsyncIterable<StreamChunk>;
    estimateTokens?(text: string): number;
    maxInputTokens?(model: string): number | undefined;
}
