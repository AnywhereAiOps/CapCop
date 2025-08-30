export class ProviderRegistry {
    config;
    secrets;
    providers = new Map();
    providerConfigs = new Map();
    modelCache = new Map();
    MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    constructor(config, secrets) {
        this.config = config;
        this.secrets = secrets;
    }
    async initializeBuiltinProviders() {
        // Import and register OpenRouter provider
        const { OpenRouterProvider } = await import('./OpenRouterProvider');
        // Register with a placeholder API key - will be replaced with actual config
        const openRouter = new OpenRouterProvider('placeholder');
        this.registerProvider(openRouter);
        // Load saved configurations
        await this.loadProviderConfigs();
    }
    registerProvider(provider) {
        this.providers.set(provider.id, provider);
    }
    getProvider(providerId) {
        return this.providers.get(providerId);
    }
    getProviders() {
        return Array.from(this.providers.values());
    }
    getDefaultProvider() {
        const defaultProviderId = this.config.getDefaultProvider();
        return this.getProvider(defaultProviderId);
    }
    async setProviderConfig(providerId, config) {
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
    async getProviderConfig(providerId) {
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
        const config = {
            apiKey
        };
        const baseUrl = this.config.getProviderBaseUrl(providerId);
        if (baseUrl) {
            config.baseUrl = baseUrl;
        }
        this.providerConfigs.set(providerId, config);
        return config;
    }
    async getModels(providerId, forceRefresh = false) {
        // Check cache first
        if (!forceRefresh) {
            const cached = this.modelCache.get(providerId);
            if (cached && (Date.now() - cached.timestamp < this.MODEL_CACHE_TTL)) {
                return cached.models;
            }
        }
        const provider = this.getProvider(providerId);
        if (!provider) {
            throw new Error(`Provider ${providerId} not found`);
        }
        try {
            const models = await provider.getModels();
            // Cache the results
            this.modelCache.set(providerId, {
                models,
                timestamp: Date.now()
            });
            return models;
        }
        catch (error) {
            console.error(`Failed to fetch models for provider ${providerId}:`, error);
            // Return cached models if available, even if stale
            const cached = this.modelCache.get(providerId);
            if (cached) {
                return cached.models;
            }
            throw error;
        }
    }
    async isProviderConfigured(providerId) {
        const config = await this.getProviderConfig(providerId);
        return config !== undefined && config.apiKey.length > 0;
    }
    getConfiguredProviders() {
        return Promise.resolve(Array.from(this.providerConfigs.keys()));
    }
    async loadProviderConfigs() {
        // Load configurations for all registered providers
        for (const provider of this.providers.values()) {
            try {
                await this.getProviderConfig(provider.id);
            }
            catch (error) {
                console.warn(`Failed to load config for provider ${provider.id}:`, error);
            }
        }
    }
    clearModelCache(providerId) {
        if (providerId) {
            this.modelCache.delete(providerId);
        }
        else {
            this.modelCache.clear();
        }
    }
    async removeProviderConfig(providerId) {
        this.providerConfigs.delete(providerId);
        // Remove from secure storage
        const secretKey = `capcop.provider.${providerId}.apiKey`;
        await this.secrets.delete(secretKey);
        // Clear model cache
        this.modelCache.delete(providerId);
    }
    // Get provider statistics
    getProviderStats() {
        return {
            totalProviders: this.providers.size,
            configuredProviders: this.providerConfigs.size,
            cachedModels: this.modelCache.size
        };
    }
}
//# sourceMappingURL=ProviderRegistry.js.map