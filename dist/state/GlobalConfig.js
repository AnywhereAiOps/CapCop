import * as vscode from 'vscode';
export class GlobalConfig {
    context;
    constructor(context) {
        this.context = context;
    }
    getConfiguration() {
        return vscode.workspace.getConfiguration('capcop');
    }
    // Provider settings
    getDefaultProvider() {
        return this.getConfiguration().get('provider.default', 'openrouter');
    }
    async setDefaultProvider(providerId) {
        await this.getConfiguration().update('provider.default', providerId, vscode.ConfigurationTarget.Global);
    }
    getProviderBaseUrl(providerId) {
        return this.getConfiguration().get(`provider.${providerId}.baseUrl`);
    }
    async setProviderBaseUrl(providerId, baseUrl) {
        await this.getConfiguration().update(`provider.${providerId}.baseUrl`, baseUrl, vscode.ConfigurationTarget.Global);
    }
    // Chat settings
    getDefaultTemperature() {
        return this.getConfiguration().get('chat.defaultTemperature', 0.7);
    }
    async setDefaultTemperature(temperature) {
        await this.getConfiguration().update('chat.defaultTemperature', temperature, vscode.ConfigurationTarget.Global);
    }
    // Context settings
    getMaxFileSize() {
        return this.getConfiguration().get('context.maxFileSize', 1048576); // 1MB
    }
    getMaxFolderFiles() {
        return this.getConfiguration().get('context.maxFolderFiles', 100);
    }
    // Feature flags
    isMcpEnabled() {
        return this.getConfiguration().get('mcp.enabled', false);
    }
    isTelemetryEnabled() {
        return this.getConfiguration().get('telemetry.enabled', false);
    }
    // UI settings
    shouldShowTokenCost() {
        return this.getConfiguration().get('ui.showTokenCost', true);
    }
    // Security settings
    requireApproval() {
        return this.getConfiguration().get('security.requireApproval', true);
    }
    // Persistent state
    getGlobalState(key, defaultValue) {
        return this.context.globalState.get(key, defaultValue);
    }
    async setGlobalState(key, value) {
        await this.context.globalState.update(key, value);
    }
    getWorkspaceState(key, defaultValue) {
        return this.context.workspaceState.get(key, defaultValue);
    }
    async setWorkspaceState(key, value) {
        await this.context.workspaceState.update(key, value);
    }
}
//# sourceMappingURL=GlobalConfig.js.map