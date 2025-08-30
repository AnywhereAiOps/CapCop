import * as vscode from 'vscode';
export declare class GlobalConfig {
    private context;
    constructor(context: vscode.ExtensionContext);
    private getConfiguration;
    getDefaultProvider(): string;
    setDefaultProvider(providerId: string): Promise<void>;
    getProviderBaseUrl(providerId: string): string | undefined;
    setProviderBaseUrl(providerId: string, baseUrl: string): Promise<void>;
    getDefaultTemperature(): number;
    setDefaultTemperature(temperature: number): Promise<void>;
    getMaxFileSize(): number;
    getMaxFolderFiles(): number;
    isMcpEnabled(): boolean;
    isTelemetryEnabled(): boolean;
    shouldShowTokenCost(): boolean;
    requireApproval(): boolean;
    getGlobalState<T>(key: string, defaultValue: T): T;
    setGlobalState<T>(key: string, value: T): Promise<void>;
    getWorkspaceState<T>(key: string, defaultValue: T): T;
    setWorkspaceState<T>(key: string, value: T): Promise<void>;
}
