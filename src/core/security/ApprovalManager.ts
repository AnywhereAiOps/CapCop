import * as vscode from 'vscode';
import { ApprovalRequest, ApprovalResponse, ActionKind, Grant, DEFAULT_APPROVAL_STATE } from './ApprovalTypes';
import { ApprovalStateManager } from '../../state/ApprovalState';
import { RulesConfig } from '../rules/RulesTypes';
import { ApprovalPanel } from '../../ui/ApprovalPanel';
import { minimatch } from 'minimatch';

export class ApprovalManager {
    private approvalStateManager: ApprovalStateManager;

    constructor(
        private context: vscode.ExtensionContext,
        private rules: Required<RulesConfig>
    ) {
        this.approvalStateManager = new ApprovalStateManager(context.workspaceState);
    }

    updateRules(rules: Required<RulesConfig>): void {
        this.rules = rules;
    }

    getApprovalState() {
        return this.approvalStateManager.getState();
    }

    async requestApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
        // Check if auto-approve is enabled for this action kind
        const state = this.approvalStateManager.getState();
        if (state.autoApprove[request.kind] && this.isAllowedByRules(request)) {
            // Create an automatic grant
            const grant = this.createGrantFromRequest(request);
            this.approvalStateManager.addGrant(grant);
            
            return {
                granted: true,
                grants: [grant],
                notes: 'Auto-approved'
            };
        }

        // Check if we already have sufficient grants
        const existingGrant = this.findSufficientGrant(request);
        if (existingGrant) {
            return {
                granted: true,
                grants: [existingGrant],
                notes: 'Using existing grant'
            };
        }

        // Show approval UI and wait for user response
        return this.showApprovalUI(request);
    }

    private isAllowedByRules(request: ApprovalRequest): boolean {
        // Check against rules deny lists
        if (request.kind === 'read_project' || request.kind === 'read_all' || 
            request.kind === 'edit_project' || request.kind === 'edit_all') {
            
            const denyPaths = this.rules.protect?.denyPaths || [];
            if (request.suggestedScopes?.some(scope => 
                denyPaths.some(denyPattern => minimatch(scope, denyPattern))
            )) {
                return false;
            }
        }

        if (request.kind === 'cmd_safe' || request.kind === 'cmd_any') {
            const denyCommands = this.rules.protect?.denyCommands || [];
            if (request.suggestedCommands?.some(cmd => 
                denyCommands.some(denyCmd => cmd.includes(denyCmd))
            )) {
                return false;
            }
        }

        return true;
    }

    private findSufficientGrant(request: ApprovalRequest): Grant | null {
        const state = this.approvalStateManager.getState();
        const activeGrants = state.grants.filter(g => 
            g.kind === request.kind && 
            !this.approvalStateManager.isExpired(g) && 
            g.remaining > 0
        );

        for (const grant of activeGrants) {
            if (this.grantCoversRequest(grant, request)) {
                return grant;
            }
        }

        return null;
    }

    private grantCoversRequest(grant: Grant, request: ApprovalRequest): boolean {
        if (request.kind === 'read_project' || request.kind === 'read_all' || 
            request.kind === 'edit_project' || request.kind === 'edit_all') {
            
            if (!grant.scopes || !request.suggestedScopes) return true;
            
            return request.suggestedScopes.every(requestScope =>
                grant.scopes!.some(grantScope => minimatch(requestScope, grantScope))
            );
        }

        if (request.kind === 'cmd_safe' || request.kind === 'cmd_any') {
            if (!grant.commands || !request.suggestedCommands) return true;
            
            return request.suggestedCommands.every(requestCmd =>
                grant.commands!.some(grantCmd => 
                    requestCmd.startsWith(grantCmd) || minimatch(requestCmd, grantCmd)
                )
            );
        }

        return true;
    }

    private createGrantFromRequest(request: ApprovalRequest): Grant {
        const now = Date.now();
        const ttlMinutes = request.ttlSuggestion ?? this.rules.quotas.defaultTtlMinutes;
        const quota = request.quotaSuggestion ?? this.rules.quotas.maxRequestsPerAction;

        return {
            kind: request.kind,
            scopes: request.suggestedScopes,
            commands: request.suggestedCommands,
            ttlMinutes,
            expiresAt: now + (ttlMinutes * 60 * 1000),
            remaining: quota,
            max: quota,
            createdAt: now
        };
    }

    private async showApprovalUI(request: ApprovalRequest): Promise<ApprovalResponse> {
        const requestId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const approvalPanel = ApprovalPanel.createOrShow(this.context.extensionUri);
        const currentApprovalState = this.approvalStateManager.getState();
        
        return approvalPanel.showApprovalRequest(
            requestId,
            request,
            this.rules,
            currentApprovalState
        );
    }

    // This method is no longer needed as ApprovalPanel handles the response directly

    canExecute(kind: ActionKind, target?: string): boolean {
        return this.approvalStateManager.can(kind, target);
    }

    consumeQuota(kind: ActionKind, amount: number = 1): boolean {
        return this.approvalStateManager.decrementQuota(kind, amount);
    }

    getRemainingQuota(kind: ActionKind): number {
        return this.approvalStateManager.getRemainingQuota(kind);
    }

    setAutoApprove(kind: ActionKind, enabled: boolean): void {
        this.approvalStateManager.setAutoApprove(kind, enabled);
    }

    setNotificationsEnabled(enabled: boolean): void {
        this.approvalStateManager.setNotificationsEnabled(enabled);
    }

    setMaxRequests(maxRequests: number): void {
        this.approvalStateManager.setMaxRequests(maxRequests);
    }

    resetApprovals(): void {
        this.approvalStateManager.reset();
    }

    getApprovalSummary(): string {
        return this.approvalStateManager.getSummary();
    }

    // Check if a specific operation should be denied based on rules
    isDenied(kind: ActionKind, target: string): boolean {
        if (kind === 'read_project' || kind === 'read_all' || 
            kind === 'edit_project' || kind === 'edit_all') {
            return (this.rules.protect?.denyPaths || []).some(denyPath => 
                minimatch(target, denyPath)
            );
        }

        if (kind === 'cmd_safe' || kind === 'cmd_any') {
            return (this.rules.protect?.denyCommands || []).some(denyCmd => 
                target.includes(denyCmd)
            );
        }

        return false;
    }

    // Check if destructive operations are being attempted
    isDestructive(kind: ActionKind, target: string): boolean {
        const destructivePatterns = [
            'rm -rf', 'rm -r', 'del /s', 'rmdir /s',
            'git push --force', 'git push -f',
            'sudo', 'su', 'chmod 777', 'chown',
            'mkfs', 'fdisk', 'dd if=', 'format',
            '> /dev/', 'curl -s * | sh', 'wget * | sh'
        ];

        if (kind === 'cmd_safe' || kind === 'cmd_any') {
            return destructivePatterns.some(pattern => 
                target.toLowerCase().includes(pattern.toLowerCase())
            );
        }

        if (kind === 'edit_project' || kind === 'edit_all') {
            // Check for destructive file operations
            return target.includes('../') || 
                   target.includes('..\\') ||
                   target.startsWith('/') ||
                   Boolean(target.match(/^[A-Z]:\\/)); // Windows absolute path
        }

        return false;
    }
}
