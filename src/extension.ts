import * as vscode from 'vscode';
import { CapCopSidebarProvider } from './ui/CapCopSidebarProvider';
import { GlobalConfig } from './state/GlobalConfig';
import { ProviderRegistry } from './core/providers/ProviderRegistry';
import { ToolRegistry } from './core/tools/ToolRegistry';
import { ChatSessionManager } from './core/sessions/ChatSessionManager';
import { Logger } from './core/logging/Logger';
import { registerApprovalCommands } from './commands/ApprovalCommands';
import * as nls from 'vscode-nls';

// Initialize localization
const localize = nls.loadMessageBundle();

let sidebarProvider: CapCopSidebarProvider;
let globalConfig: GlobalConfig;
let providerRegistry: ProviderRegistry;
let toolRegistry: ToolRegistry;
let sessionManager: ChatSessionManager;
let logger: Logger;

export async function activate(context: vscode.ExtensionContext) {
    logger = new Logger();
    logger.info('CapCop extension activating...');
    console.log('🚀 CapCop: Extension activation started');
    console.log('🚀 CapCop: Extension activation started');
    console.log('🚀 CapCop: Extension activation started');

    try {
        // Initialize core services
        globalConfig = new GlobalConfig(context);
        providerRegistry = new ProviderRegistry(globalConfig, context.secrets);
        toolRegistry = new ToolRegistry();
        sessionManager = new ChatSessionManager(globalConfig);

        // Initialize providers and tools first
        await initializeServices();

        // Initialize sidebar provider
        sidebarProvider = new CapCopSidebarProvider(
            context.extensionUri,
            providerRegistry,
            toolRegistry,
            sessionManager,
            logger
        );

        // Register webview provider
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                'capcop.sidebar',
                sidebarProvider,
                { webviewOptions: { retainContextWhenHidden: true } }
            )
        );

        // Register commands
        registerCommands(context);
        
        // Register approval commands
        registerApprovalCommands(context);

        logger.info('CapCop extension activated successfully');
    } catch (error) {
        const message = localize('activation.failed', 'Failed to activate CapCop extension');
        logger.error(message, error);
        vscode.window.showErrorMessage(`${message}: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function deactivate() {
    logger?.info('CapCop extension deactivating...');
    sidebarProvider?.dispose();
}

function registerCommands(context: vscode.ExtensionContext) {
    const commands = [
        vscode.commands.registerCommand('capcop.open', () => {
            vscode.commands.executeCommand('capcop.sidebar.focus');
        }),

        vscode.commands.registerCommand('capcop.startChat', async () => {
            const sessionId = await sessionManager.createSession();
            sidebarProvider.focusSession(sessionId);
            vscode.commands.executeCommand('capcop.sidebar.focus');
        }),

        vscode.commands.registerCommand('capcop.configureProvider', async () => {
            await showProviderConfiguration();
        }),

        vscode.commands.registerCommand('capcop.insertChange', async (_change: any) => {
            // TODO: Implement change insertion
            console.log('Insert change command triggered');
        }),

        vscode.commands.registerCommand('capcop.previewEdit', async (_edit: any) => {
            // TODO: Implement edit preview
            console.log('Preview edit command triggered');
        }),

        vscode.commands.registerCommand('capcop.approveEdit', async (_edit: any) => {
            // TODO: Implement edit approval
            console.log('Approve edit command triggered');
        }),

        vscode.commands.registerCommand('capcop.attachFile', async () => {
            const files = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: true,
                title: localize('attach.file.title', 'Select files to attach to context')
            });
            
            if (files && files.length > 0) {
                sidebarProvider.attachFiles(files);
            }
        }),

        vscode.commands.registerCommand('capcop.attachFolder', async () => {
            const folders = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: localize('attach.folder.title', 'Select folder to attach to context')
            });
            
            if (folders && folders.length > 0) {
                sidebarProvider.attachFolder(folders[0]!);
            }
        }),

        vscode.commands.registerCommand('capcop.attachUrl', async () => {
            const url = await vscode.window.showInputBox({
                prompt: localize('attach.url.prompt', 'Enter URL to fetch and attach to context'),
                placeHolder: 'https://example.com/docs'
            });
            
            if (url) {
                sidebarProvider.attachUrl(url);
            }
        }),

        vscode.commands.registerCommand('capcop.attachProblems', async () => {
            sidebarProvider.attachProblems();
        })
    ];

    context.subscriptions.push(...commands);
}

async function initializeServices() {
    // Initialize built-in providers
    await providerRegistry.initializeBuiltinProviders();
    
    // Initialize built-in tools
    await toolRegistry.initializeBuiltinTools();
    
    logger.info(`Initialized ${providerRegistry.getProviders().length} providers`);
    logger.info(`Initialized ${toolRegistry.getTools().length} tools`);
}

async function showProviderConfiguration() {
    const providers = providerRegistry.getProviders();
    const providerItems = providers.map(p => ({
        label: p.displayName,
        detail: p.id,
        provider: p
    }));

    const selected = await vscode.window.showQuickPick(providerItems, {
        title: localize('configure.provider.title', 'Configure LLM Provider'),
        placeHolder: localize('configure.provider.placeholder', 'Select a provider to configure')
    });

    if (!selected) return;

    const apiKey = await vscode.window.showInputBox({
        prompt: localize('configure.provider.apikey', 'Enter API key for {0}', selected.provider.displayName),
        password: true,
        ignoreFocusOut: true
    });

    if (apiKey) {
        await providerRegistry.setProviderConfig(selected.provider.id, { apiKey });
        vscode.window.showInformationMessage(
            localize('configure.provider.success', 'API key configured for {0}', selected.provider.displayName)
        );
    }
}
