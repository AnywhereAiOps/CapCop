import * as vscode from 'vscode';
import { ApprovalRequest, ApprovalResponse } from '../core/security/ApprovalTypes';
import { RulesConfig } from '../core/rules/RulesTypes';

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export class ApprovalPanel {
    private static currentPanel: ApprovalPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private isReady = false;
    private outbox: any[] = [];
    private pendingRequests = new Map<string, {
        request: ApprovalRequest;
        rules: Required<RulesConfig>;
        currentApprovalState: any;
        resolve: (response: ApprovalResponse) => void;
        reject: (error: Error) => void;
    }>();

    private constructor(panel: vscode.WebviewPanel, private readonly extensionUri: vscode.Uri) {
        this.panel = panel;
        console.log('[Extension] ApprovalPanel constructor - setting up webview');
        this.setupWebview();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(
            message => {
                console.log('[Extension] Received webview message:', message);
                this.handleWebviewMessage(message);
            },
            null,
            this.disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri): ApprovalPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (ApprovalPanel.currentPanel) {
            ApprovalPanel.currentPanel.panel.reveal(column);
            return ApprovalPanel.currentPanel;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            'capcopApproval',
            'CapCop Approval',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')]
            }
        );

        ApprovalPanel.currentPanel = new ApprovalPanel(panel, extensionUri);
        return ApprovalPanel.currentPanel;
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        ApprovalPanel.currentPanel = new ApprovalPanel(panel, extensionUri);
    }

    public async showApprovalRequest(
        requestId: string,
        request: ApprovalRequest,
        rules: Required<RulesConfig>,
        currentApprovalState: any
    ): Promise<ApprovalResponse> {
        return new Promise<ApprovalResponse>((resolve, reject) => {
            // Debug logging to see what parameters we received
            console.log(`[Extension] showApprovalRequest called with:`, {
                requestId,
                request,
                rules,
                currentApprovalState
            });

            this.pendingRequests.set(requestId, {
                request,
                rules,
                currentApprovalState,
                resolve,
                reject
            });

            // Show the panel
            this.panel.reveal();

            // Build the message payload
            const payload = {
                type: 'showApprovalRequest',
                requestId: requestId,
                request: request,
                rules: rules,
                currentApprovalState: currentApprovalState
            };

            console.log(`[Extension] Built payload:`, payload);

            // Queue the message if webview isn't ready, otherwise send immediately
            if (this.isReady) {
                console.log(`[Extension] Sending approval request immediately`);
                this.panel.webview.postMessage(payload);
            } else {
                console.log(`[Extension] Queueing approval request (webview not ready)`);
                this.outbox.push(payload);
            }

            // Set timeout to reject if no response
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error('Approval request timeout'));
                }
            }, 300000); // 5 minutes timeout
        });
    }

    private setupWebview() {
        this.panel.webview.html = this.getWebviewContent();
    }

    private handleWebviewMessage(message: any) {
        switch (message.type) {
            case 'approvalResponse':
                const { requestId, response } = message;
                const pendingRequest = this.pendingRequests.get(requestId);
                if (pendingRequest) {
                    this.pendingRequests.delete(requestId);
                    pendingRequest.resolve(response);
                }
                break;

            case 'approvalCancelled':
                const cancelledRequestId = message.requestId;
                const cancelledRequest = this.pendingRequests.get(cancelledRequestId);
                if (cancelledRequest) {
                    this.pendingRequests.delete(cancelledRequestId);
                    cancelledRequest.resolve({
                        granted: false,
                        notes: 'User cancelled the request'
                    });
                }
                break;

            case 'ready':
                console.log(`[Extension] Webview ready, draining ${this.outbox.length} queued messages`);
                this.isReady = true;
                while (this.outbox.length) {
                    const payload = this.outbox.shift();
                    console.log(`[Extension] Draining message:`, payload);
                    this.panel.webview.postMessage(payload);
                }
                break;
        }
    }

    private getWebviewContent(): string {
        // Add cache-busting to avoid stale assets in VS Code Web
        const bust = Date.now().toString();
        
        const stylesUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'approval.css')
        ) + `?v=${bust}`;

        const scriptUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'approval.js')
        ) + `?v=${bust}`;

        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>CapCop Approval</title>
    <link href="${stylesUri}" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-foreground);
        }
        
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-size: 16px;
            color: var(--vscode-descriptionForeground);
        }
        
        .container {
            display: none;
        }
        
        .container.active {
            display: block;
        }
    </style>
</head>
<body>
    <div id="loading" class="loading">
        Waiting for approval request...
    </div>
    <div id="container" class="container">
        <div id="root">
            <!-- Preact approval modal will be rendered here -->
        </div>
    </div>
    
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        
        // Global state for the approval modal
        window.approvalState = {
            currentRequest: null,
            onResponse: function(requestId, response) {
                vscode.postMessage({
                    type: 'approvalResponse',
                    requestId: requestId,
                    response: response
                });
            },
            onClose: function() {
                if (window.approvalState.currentRequest) {
                    vscode.postMessage({
                        type: 'approvalCancelled',
                        requestId: window.approvalState.currentRequest.requestId
                    });
                }
            }
        };
        
        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'showApprovalRequest':
                    console.log('[Webview HTML] Received approval request:', message);
                    
                    // Validate message structure
                    if (!message.requestId || !message.request || !message.rules) {
                        console.error('[Webview HTML] Invalid message structure:', message);
                        break;
                    }
                    
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('container').classList.add('active');
                    
                    window.approvalState.currentRequest = {
                        requestId: message.requestId,
                        request: message.request,
                        rules: message.rules,
                        currentApprovalState: message.currentApprovalState
                    };
                    
                    // Try to render immediately if script is loaded
                    if (window.renderApprovalModal) {
                        window.renderApprovalModal({
                            requestId: message.requestId,
                            request: message.request,
                            rules: message.rules,
                            currentApprovalState: message.currentApprovalState
                        });
                    } else {
                        console.log('[Webview HTML] renderApprovalModal not yet available, data stored for later');
                    }
                    break;
            }
        });
        
        // Notify extension that webview is ready
        vscode.postMessage({ type: 'ready' });
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }

    public dispose() {
        ApprovalPanel.currentPanel = undefined;

        // Clean up resources
        this.panel.dispose();

        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }

        // Reject any pending requests
        for (const [requestId, pendingRequest] of this.pendingRequests) {
            pendingRequest.reject(new Error('Approval panel was closed'));
        }
        this.pendingRequests.clear();
    }
}
