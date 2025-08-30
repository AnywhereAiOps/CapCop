import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OllamaProvider } from './OllamaProvider';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OllamaProvider', () => {
    let provider: OllamaProvider;

    beforeEach(() => {
        provider = new OllamaProvider('http://test-ollama:11434');
        mockFetch.mockClear();
    });

    describe('getModels', () => {
        it('should fetch models from Ollama API', async () => {
            const mockModels = {
                models: [
                    {
                        name: 'llama3:latest',
                        details: { context_length: 8192 }
                    },
                    {
                        name: 'mistral:7b',
                        details: { context_length: 4096 }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockModels
            });

            const models = await provider.getModels();

            expect(mockFetch).toHaveBeenCalledWith('http://test-ollama:11434/api/tags', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            expect(models).toEqual([
                {
                    id: 'llama3:latest',
                    label: 'llama3:latest',
                    contextWindow: 8192,
                    supportsToolCalls: false
                },
                {
                    id: 'mistral:7b',
                    label: 'mistral:7b',
                    contextWindow: 4096,
                    supportsToolCalls: false
                }
            ]);
        });

        it('should return empty array on fetch error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const models = await provider.getModels();

            expect(models).toEqual([]);
        });

        it('should handle missing models in response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });

            const models = await provider.getModels();

            expect(models).toEqual([]);
        });
    });

    describe('basic properties', () => {
        it('should have correct id and displayName', () => {
            expect(provider.id).toBe('ollama');
            expect(provider.displayName).toBe('Ollama');
        });
    });

    describe('estimateTokens', () => {
        it('should estimate tokens correctly', () => {
            const text = 'Hello world';
            const tokens = provider.estimateTokens(text);
            expect(tokens).toBe(Math.ceil(text.length / 4));
        });
    });

    describe('maxInputTokens', () => {
        it('should return undefined for any model', () => {
            expect(provider.maxInputTokens('any-model')).toBeUndefined();
        });
    });
});
