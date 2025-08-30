import * as vscode from 'vscode';
import { ProviderAdapter, ModelInfo } from './ProviderAdapter';
import { GlobalConfig } from '../../state/GlobalConfig';
export interface ProviderConfig {
    apiKey: string;
    baseUrl?: string;
    organization?: string;
    region?: string;
}
export declare class ProviderRegistry {
    private config;
    private secrets;
    private providers;
    private providerConfigs;
    private modelCache;
    private readonly MODEL_CACHE_TTL;
    constructor(config: GlobalConfig, secrets: vscode.SecretStorage);
    initializeBuiltinProviders(): Promise<void>;
    registerProvider(provider: ProviderAdapter): void;
    getProvider(providerId: string): ProviderAdapter | undefined;
    getProviders(): ProviderAdapter[];
    getDefaultProvider(): ProviderAdapter | undefined;
    setProviderConfig(providerId: string, config: ProviderConfig): Promise<void>;
    getProviderConfig(providerId: string): Promise<ProviderConfig | undefined>;
    getModels(providerId: string, forceRefresh?: boolean): Promise<ModelInfo[]>;
    isProviderConfigured(providerId: string): Promise<boolean>;
    getConfiguredProviders(): Promise<string[]>;
    private loadProviderConfigs;
    clearModelCache(providerId?: string): void;
    removeProviderConfig(providerId: string): Promise<void>;
    getProviderStats(): {
        totalProviders: number;
        configuredProviders: number;
        cachedModels: number;
    };
}
