import * as vscode from 'vscode';
import { ProviderAdapter, ModelInfo } from './ProviderAdapter';
import { GlobalConfig } from '../../state/GlobalConfig';

export interface ProviderConfig {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
    region?: string;
}

export class ProviderRegistry {
    private providers = new Map<string, ProviderAdapter>();
    private providerConfigs = new Map<string, ProviderConfig>();
    private modelCache = new Map<string, { models: ModelInfo[]; timestamp: number }>();
    private readonly MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    constructor(
        private config: GlobalConfig,
        private secrets: vscode.SecretStorage
    ) {}

    async initializeBuiltinProviders(): Promise<void> {
        console.log('ProviderRegistry: Starting builtin provider initialization...');
        
        // Import and register Ollama provider FIRST (so it's the default)
        const { OllamaProvider } = await import('./OllamaProvider');
        
        // Force proxy URL for web environments (code-server)
        // Since we're always running in code-server, use the proxy
        const defaultOllamaBase = 'http://localhost:11434';
        console.log('ProviderRegistry: Using proxy URL for Ollama:', defaultOllamaBase);
        
        const ollamaBaseUrl = this.config.getProviderBaseUrl('ollama') || defaultOllamaBase;
        console.log('ProviderRegistry: Final Ollama base URL:', ollamaBaseUrl);
        const ollama = new OllamaProvider(ollamaBaseUrl);
        this.registerProvider(ollama);
        console.log('ProviderRegistry: Registered Ollama provider');

        // Import and register OpenRouter provider
        const { OpenRouterProvider } = await import('./OpenRouterProvider');
        
        // Register with a placeholder API key - will be replaced with actual config
        const openRouter = new OpenRouterProvider('placeholder');
        this.registerProvider(openRouter);
        console.log('ProviderRegistry: Registered OpenRouter provider');
        
        // Debug: Log all registered providers
        const allProviders = this.getProviders();
        console.log('ProviderRegistry: Total registered providers:', allProviders.length);
        allProviders.forEach((provider, index) => {
            console.log(`  Provider ${index + 1}: ${provider.id} (${provider.displayName})`);
        });
        
        // Load saved configurations
        await this.loadProviderConfigs();
        console.log('ProviderRegistry: Builtin provider initialization complete');
    }

    registerProvider(provider: ProviderAdapter): void {
        this.providers.set(provider.id, provider);
    }

    getProvider(providerId: string): ProviderAdapter | undefined {
        return this.providers.get(providerId);
    }

    getProviders(): ProviderAdapter[] {
        return Array.from(this.providers.values());
    }

    getDefaultProvider(): ProviderAdapter | undefined {
        const defaultProviderId = this.config.getDefaultProvider();
        return this.getProvider(defaultProviderId);
    }

    async setProviderConfig(providerId: string, config: ProviderConfig): Promise<void> {
        this.providerConfigs.set(providerId, config);
        
        // Store API key in secure storage
        const secretKey = `capcop.provider.${providerId}.apiKey`;
        await this.secrets.store(secretKey, config.apiKey);
        
        // Store other config in workspace settings
        if (config.baseUrl) {
            await this.config.setProviderBaseUrl(providerId, config.baseUrl);
        }
        
        // Clear model cache for this provider
        this.modelCache.delete(providerId);
    }

    async getProviderConfig(providerId: string): Promise<ProviderConfig | undefined> {
        const cachedConfig = this.providerConfigs.get(providerId);
        if (cachedConfig) {
            return cachedConfig;
        }

        // Load from storage
        const secretKey = `capcop.provider.${providerId}.apiKey`;
        const apiKey = await this.secrets.get(secretKey);
        
        if (!apiKey) {
            return undefined;
        }

        const config: ProviderConfig = {
            apiKey
        };
        
        const baseUrl = this.config.getProviderBaseUrl(providerId);
        if (baseUrl) {
            config.baseUrl = baseUrl;
        }

        this.providerConfigs.set(providerId, config);
        return config;
    }

    async getModels(providerId: string, forceRefresh = false): Promise<ModelInfo[]> {
        console.log(`🔍 ProviderRegistry: getModels called for ${providerId}, forceRefresh: ${forceRefresh}`);
        
        // Check cache first
        if (!forceRefresh) {
            const cached = this.modelCache.get(providerId);
            if (cached && (Date.now() - cached.timestamp < this.MODEL_CACHE_TTL)) {
                console.log(`📦 ProviderRegistry: Returning cached models for ${providerId} (${cached.models.length} models)`);
                return cached.models;
            }
        }

        const provider = this.getProvider(providerId);
        if (!provider) {
            throw new Error(`Provider ${providerId} not found`);
        }

        try {
            console.log(`🌐 ProviderRegistry: Fetching fresh models from ${providerId}...`);
            if (providerId === 'ollama') {
                console.log('🦙 ProviderRegistry: About to call Ollama /api/tags endpoint...');
            }
            
            const models = await provider.getModels();
            console.log(`✅ ProviderRegistry: Successfully fetched ${models.length} models from ${providerId}`);
            
            // Cache the results
            this.modelCache.set(providerId, {
                models,
                timestamp: Date.now()
            });
            
            return models;
        } catch (error) {
            console.error(`❌ ProviderRegistry: Failed to fetch models for provider ${providerId}:`, error);
            
            // Return cached models if available, even if stale
            const cached = this.modelCache.get(providerId);
            if (cached) {
                console.log(`📦 ProviderRegistry: Falling back to stale cache for ${providerId} (${cached.models.length} models)`);
                return cached.models;
            }
            
            throw error;
        }
    }

    async isProviderConfigured(providerId: string): Promise<boolean> {
        // Ollama doesn't require an API key
        if (providerId === 'ollama') {
            return true;
        }
        
        const config = await this.getProviderConfig(providerId);
        return config !== undefined && config.apiKey.length > 0;
    }

    getConfiguredProviders(): Promise<string[]> {
        return Promise.resolve(Array.from(this.providerConfigs.keys()));
    }

    private async loadProviderConfigs(): Promise<void> {
        // Load configurations for all registered providers
        for (const provider of this.providers.values()) {
            try {
                await this.getProviderConfig(provider.id);
            } catch (error) {
                console.warn(`Failed to load config for provider ${provider.id}:`, error);
            }
        }
    }

    clearModelCache(providerId?: string): void {
        if (providerId) {
            this.modelCache.delete(providerId);
        } else {
            this.modelCache.clear();
        }
    }

    async removeProviderConfig(providerId: string): Promise<void> {
        this.providerConfigs.delete(providerId);
        
        // Remove from secure storage
        const secretKey = `capcop.provider.${providerId}.apiKey`;
        await this.secrets.delete(secretKey);
        
        // Clear model cache
        this.modelCache.delete(providerId);
    }

    // Get provider statistics
    getProviderStats(): { 
        totalProviders: number; 
        configuredProviders: number; 
        cachedModels: number; 
    } {
        return {
            totalProviders: this.providers.size,
            configuredProviders: this.providerConfigs.size,
            cachedModels: this.modelCache.size
        };
    }
}
