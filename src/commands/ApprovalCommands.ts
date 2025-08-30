import * as vscode from 'vscode';
import { ApprovalPanel } from '../ui/ApprovalPanel';

export function registerApprovalCommands(context: vscode.ExtensionContext) {
    // Command to show approval modal manually (for testing)
    const showApprovalModal = vscode.commands.registerCommand(
        'capcop.showApprovalModal',
        async (options?: any) => {
            const panel = ApprovalPanel.createOrShow(context.extensionUri);
            
            if (options) {
                await panel.showApprovalRequest(
                    options.requestId,
                    options.request,
                    options.rules,
                    options.currentApprovalState
                );
            } else {
                // Show default approval modal for settings configuration
                const defaultRequest = {
                    kind: 'edit_project' as const,
                    reason: 'Configure default approval settings for CapCop',
                    suggestedScopes: ['src/**/*', 'docs/**/*'],
                    ttlSuggestion: 60,
                    quotaSuggestion: 50
                };

                const defaultRules = {
                    behavior: {
                        autoApprove: {
                            read_project: false,
                            read_all: false,
                            edit_project: false,
                            edit_all: false,
                            cmd_safe: false,
                            cmd_any: false,
                            browser: false,
                            mcp: false
                        }
                    },
                    permissions: {
                        safeCommands: ['npm test', 'npm run build', 'git status'],
                        editScopes: ['src/**/*', 'docs/**/*'],
                        readScopes: ['**/*']
                    },
                    protect: {
                        denyPaths: ['node_modules/**', '.git/**'],
                        denyCommands: ['rm -rf', 'sudo', 'format']
                    },
                    quotas: {
                        maxRequestsPerAction: 100,
                        defaultTtlMinutes: 60,
                        maxTtlMinutes: 1440
                    }
                };

                const currentApprovalState = context.workspaceState.get('capcop.approvalState') || {
                    autoApprove: {
                        read_project: false,
                        read_all: false,
                        edit_project: false,
                        edit_all: false,
                        cmd_safe: false,
                        cmd_any: false,
                        browser: false,
                        mcp: false
                    },
                    notificationsEnabled: true,
                    maxRequests: 1200,
                    grants: []
                };

                try {
                    const response = await panel.showApprovalRequest(
                        'default-settings',
                        defaultRequest,
                        defaultRules,
                        currentApprovalState
                    );

                    if (response.granted) {
                        // Save the approval settings back to workspace state
                        if (response.grants) {
                            const updatedState = {
                                ...currentApprovalState,
                                grants: response.grants
                            };
                            await context.workspaceState.update('capcop.approvalState', updatedState);
                            vscode.window.showInformationMessage('Approval settings saved successfully.');
                        }
                    } else {
                        vscode.window.showInformationMessage('Approval settings not saved.');
                    }
                } catch (error) {
                    console.error('Error showing approval modal:', error);
                    vscode.window.showErrorMessage('Failed to show approval modal');
                }
            }
        }
    );

    // Command to reset all approvals
    const resetApprovals = vscode.commands.registerCommand(
        'capcop.resetApprovals',
        async () => {
            const result = await vscode.window.showWarningMessage(
                'Reset all approval settings and active grants?',
                { modal: true },
                'Reset',
                'Cancel'
            );

            if (result === 'Reset') {
                // Clear workspace state
                await context.workspaceState.update('capcop.approvalState', undefined);
                vscode.window.showInformationMessage('Approval settings reset successfully.');
            }
        }
    );

    // Command to show current approval status
    const showApprovalStatus = vscode.commands.registerCommand(
        'capcop.showApprovalStatus',
        async () => {
            const approvalState = context.workspaceState.get('capcop.approvalState');
            
            if (!approvalState) {
                vscode.window.showInformationMessage('No approval settings configured.');
                return;
            }

            // Format approval status for display
            const statusLines = [
                'Current Approval Status:',
                '',
                'Auto-approve Settings:',
                ...(Object.entries((approvalState as any).autoApprove || {}).map(
                    ([action, enabled]) => `  ${action}: ${enabled ? 'Enabled' : 'Disabled'}`
                )),
                '',
                `Notifications: ${(approvalState as any).notificationsEnabled ? 'Enabled' : 'Disabled'}`,
                `Max Requests: ${(approvalState as any).maxRequests || 'Not set'}`,
                '',
                `Active Grants: ${((approvalState as any).grants || []).length}`
            ];

            const statusText = statusLines.join('\n');
            
            const action = await vscode.window.showInformationMessage(
                statusText,
                { modal: true },
                'Reset Settings',
                'Close'
            );

            if (action === 'Reset Settings') {
                vscode.commands.executeCommand('capcop.resetApprovals');
            }
        }
    );

    context.subscriptions.push(showApprovalModal, resetApprovals, showApprovalStatus);

    return {
        showApprovalModal,
        resetApprovals,
        showApprovalStatus
    };
}
