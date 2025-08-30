export class OpenRouterProvider {
    apiKey;
    baseUrl;
    id = 'openrouter';
    displayName = 'OpenRouter';
    constructor(apiKey, baseUrl = 'https://openrouter.ai/api/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    async getModels() {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data.data?.map((model) => ({
                id: model.id,
                label: model.name || model.id,
                contextWindow: model.context_length,
                supportsToolCalls: model.supports_function_calling || false
            })) || [];
        }
        catch (error) {
            console.error('Failed to fetch OpenRouter models:', error);
            // Return some default models as fallback
            return [
                {
                    id: 'anthropic/claude-3-haiku',
                    label: 'Claude 3 Haiku',
                    contextWindow: 200000,
                    supportsToolCalls: true
                },
                {
                    id: 'openai/gpt-3.5-turbo',
                    label: 'GPT-3.5 Turbo',
                    contextWindow: 4096,
                    supportsToolCalls: true
                },
                {
                    id: 'openai/gpt-4o-mini',
                    label: 'GPT-4o Mini',
                    contextWindow: 128000,
                    supportsToolCalls: true
                }
            ];
        }
    }
    async *streamChat(opts) {
        try {
            const messages = [...opts.messages];
            if (opts.system) {
                messages.unshift({ role: 'system', content: opts.system });
            }
            const requestBody = {
                model: opts.model,
                messages,
                stream: true,
                temperature: opts.temperature ?? 0.7,
                ...(opts.tools && { tools: opts.tools })
            };
            const fetchOptions = {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://capcop.dev',
                    'X-Title': 'CapCop VS Code Extension'
                },
                body: JSON.stringify(requestBody)
            };
            if (opts.signal) {
                fetchOptions.signal = opts.signal;
            }
            const response = await fetch(`${this.baseUrl}/chat/completions`, fetchOptions);
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
                    if (done)
                        break;
                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith('data: '))
                            continue;
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
                            if (delta?.tool_calls) {
                                for (const toolCall of delta.tool_calls) {
                                    yield {
                                        type: 'tool_call',
                                        data: JSON.stringify(toolCall)
                                    };
                                }
                            }
                        }
                        catch (parseError) {
                            console.warn('Failed to parse streaming chunk:', parseError);
                        }
                    }
                }
            }
            finally {
                reader.releaseLock();
            }
            yield { type: 'done' };
        }
        catch (error) {
            if (error instanceof Error) {
                yield { type: 'warning', data: `Error: ${error.message}` };
            }
            yield { type: 'done' };
        }
    }
    estimateTokens(text) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
    maxInputTokens(model) {
        const modelContextLimits = {
            'anthropic/claude-3-haiku': 200000,
            'anthropic/claude-3-sonnet': 200000,
            'anthropic/claude-3-opus': 200000,
            'openai/gpt-3.5-turbo': 4096,
            'openai/gpt-4': 8192,
            'openai/gpt-4-turbo': 128000,
            'openai/gpt-4o': 128000,
            'openai/gpt-4o-mini': 128000
        };
        return modelContextLimits[model];
    }
}
//# sourceMappingURL=OpenRouterProvider.js.map