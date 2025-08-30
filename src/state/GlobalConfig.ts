import * as vscode from 'vscode';

export class GlobalConfig {
    constructor(private context: vscode.ExtensionContext) {}

    private getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('capcop');
    }

    // Provider settings
    getDefaultProvider(): string {
        return this.getConfiguration().get('provider.default', 'openrouter');
    }

    async setDefaultProvider(providerId: string): Promise<void> {
        await this.getConfiguration().update('provider.default', providerId, vscode.ConfigurationTarget.Global);
    }

    getProviderBaseUrl(providerId: string): string | undefined {
        return this.getConfiguration().get(`provider.${providerId}.baseUrl`);
    }

    async setProviderBaseUrl(providerId: string, baseUrl: string): Promise<void> {
        await this.getConfiguration().update(`provider.${providerId}.baseUrl`, baseUrl, vscode.ConfigurationTarget.Global);
    }

    // Chat settings
    getDefaultTemperature(): number {
        return this.getConfiguration().get('chat.defaultTemperature', 0.7);
    }

    async setDefaultTemperature(temperature: number): Promise<void> {
        await this.getConfiguration().update('chat.defaultTemperature', temperature, vscode.ConfigurationTarget.Global);
    }

    // Context settings
    getMaxFileSize(): number {
        return this.getConfiguration().get('context.maxFileSize', 1048576); // 1MB
    }

    getMaxFolderFiles(): number {
        return this.getConfiguration().get('context.maxFolderFiles', 100);
    }

    // Feature flags
    isMcpEnabled(): boolean {
        return this.getConfiguration().get('mcp.enabled', false);
    }

    isTelemetryEnabled(): boolean {
        return this.getConfiguration().get('telemetry.enabled', false);
    }

    // UI settings
    shouldShowTokenCost(): boolean {
        return this.getConfiguration().get('ui.showTokenCost', true);
    }

    // Security settings
    requireApproval(): boolean {
        return this.getConfiguration().get('security.requireApproval', true);
    }

    // Persistent state
    getGlobalState<T>(key: string, defaultValue: T): T {
        return this.context.globalState.get(key, defaultValue);
    }

    async setGlobalState<T>(key: string, value: T): Promise<void> {
        await this.context.globalState.update(key, value);
    }

    getWorkspaceState<T>(key: string, defaultValue: T): T {
        return this.context.workspaceState.get(key, defaultValue);
    }

    async setWorkspaceState<T>(key: string, value: T): Promise<void> {
        await this.context.workspaceState.update(key, value);
    }
}
