import { ProviderAdapter, StreamChunk, ModelInfo } from './ProviderAdapter';

export class OllamaProvider implements ProviderAdapter {
    id = 'ollama';
    displayName = 'Ollama';

    constructor(private baseUrl = 'http://localhost:11434') {}

    async getModels(): Promise<ModelInfo[]> {
        const url = `${this.baseUrl}/api/tags`;
        try {
            console.log('OllamaProvider: Fetching models from:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('OllamaProvider: Received data:', data);
            
            const models = data.models?.map((model: any) => ({
                id: model.name,
                label: model.name,
                contextWindow: model.details?.context_length || undefined,
                supportsToolCalls: false // Ollama doesn't support function calling yet
            })) || [];
            
            console.log('OllamaProvider: Mapped models:', models);
            return models;
        } catch (error) {
            console.error('OllamaProvider: Failed to fetch models from:', url);
            console.error('OllamaProvider: Failed to fetch models:', error);
            // Return empty array on error - UI can show appropriate message
            return [];
        }
    }

    async *streamChat(opts: {
        model: string;
        system?: string;
        messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string }[];
        temperature?: number;
        tools?: any[];
        signal?: AbortSignal;
    }): AsyncIterable<StreamChunk> {
        try {
            // Build messages array with system message if provided
            const messages = [...opts.messages];
            if (opts.system) {
                messages.unshift({ role: 'system', content: opts.system });
            }

            // Warn about tools if they are provided (Ollama doesn't support them yet)
            if (opts.tools && opts.tools.length > 0) {
                yield { 
                    type: 'warning', 
                    data: 'Tool calls are not supported by Ollama provider. Tools will be ignored.' 
                };
            }

            // Try OpenAI-compatible endpoint first
            try {
                yield* this.streamChatOpenAICompatible(opts.model, messages, opts.temperature, opts.signal);
                return;
            } catch (openaiError) {
                console.warn('OpenAI-compatible endpoint failed, trying native Ollama API:', openaiError);
            }

            // Fallback to native Ollama API
            yield* this.streamChatNative(opts.model, messages, opts.temperature, opts.signal);

        } catch (error) {
            if (error instanceof Error) {
                yield { type: 'warning', data: `Ollama Error: ${error.message}` };
            }
            yield { type: 'done' };
        }
    }

    private async *streamChatOpenAICompatible(
        model: string,
        messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string }[],
        temperature?: number,
        signal?: AbortSignal
    ): AsyncIterable<StreamChunk> {
        const requestBody = {
            model,
            messages,
            stream: true,
            temperature: temperature ?? 0.7
        };

        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        };

        if (signal) {
            fetchOptions.signal = signal;
        }

        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, fetchOptions);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;
                    
                    const dataStr = trimmed.slice(6);
                    if (dataStr === '[DONE]') {
                        yield { type: 'done' };
                        return;
                    }

                    try {
                        const data = JSON.parse(dataStr);
                        const delta = data.choices?.[0]?.delta;
                        
                        if (delta?.content) {
                            yield { type: 'text', data: delta.content };
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse OpenAI-compatible streaming chunk:', parseError);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        yield { type: 'done' };
    }

    private async *streamChatNative(
        model: string,
        messages: { role: 'system' | 'user' | 'assistant' | 'tool'; content: string }[],
        temperature?: number,
        signal?: AbortSignal
    ): AsyncIterable<StreamChunk> {
        const requestBody = {
            model,
            messages,
            stream: true,
            options: {
                temperature: temperature ?? 0.7
            }
        };

        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        };

        if (signal) {
            fetchOptions.signal = signal;
        }

        const response = await fetch(`${this.baseUrl}/api/chat`, fetchOptions);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('No response body reader available');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    try {
                        const data = JSON.parse(trimmed);
                        
                        if (data.message?.content) {
                            yield { type: 'text', data: data.message.content };
                        }
                        
                        if (data.done) {
                            yield { type: 'done' };
                            return;
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse native Ollama streaming chunk:', parseError);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        yield { type: 'done' };
    }

    estimateTokens(text: string): number {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }

    maxInputTokens(model: string): number | undefined {
        // Most Ollama models have varying context lengths
        // Return undefined to let the model determine its own limits
        return undefined;
    }
}
