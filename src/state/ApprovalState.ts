import * as vscode from 'vscode';
import { ApprovalState, Grant, ActionKind, DEFAULT_APPROVAL_STATE } from '../core/security/ApprovalTypes';
import { minimatch } from 'minimatch';

export class ApprovalStateManager {
    private state: ApprovalState = { ...DEFAULT_APPROVAL_STATE };
    private readonly workspaceStateKey = 'capcop.approvalState';

    constructor(private workspaceState: vscode.Memento) {
        this.loadState();
    }

    getState(): ApprovalState {
        this.pruneExpired();
        return { ...this.state };
    }

    setState(newState: Partial<ApprovalState>): void {
        this.state = { ...this.state, ...newState };
        this.saveState();
    }

    addGrant(grant: Grant): void {
        // Remove existing grants of the same kind to replace them
        this.state.grants = this.state.grants.filter(g => g.kind !== grant.kind);
        this.state.grants.push(grant);
        this.saveState();
    }

    addGrants(grants: Grant[]): void {
        for (const grant of grants) {
            this.addGrant(grant);
        }
    }

    decrementQuota(kind: ActionKind, amount: number = 1): boolean {
        this.pruneExpired();
        
        const grant = this.state.grants.find(g => g.kind === kind && !this.isExpired(g));
        if (grant && grant.remaining >= amount) {
            grant.remaining -= amount;
            this.saveState();
            return true;
        }
        return false;
    }

    can(kind: ActionKind, target?: string): boolean {
        this.pruneExpired();
        
        // Check if auto-approve is enabled for this kind
        if (this.state.autoApprove[kind]) {
            return true;
        }

        // Check for active grants
        const activeGrant = this.state.grants.find(g => 
            g.kind === kind && 
            !this.isExpired(g) && 
            g.remaining > 0
        );

        if (!activeGrant) {
            return false;
        }

        // For file operations, check scopes
        if ((kind === 'read_project' || kind === 'read_all' || kind === 'edit_project' || kind === 'edit_all') && target) {
            return this.matchesScopes(target, activeGrant.scopes || []);
        }

        // For command operations, check commands
        if ((kind === 'cmd_safe' || kind === 'cmd_any') && target) {
            return this.matchesCommands(target, activeGrant.commands || []);
        }

        return true;
    }

    private matchesScopes(filePath: string, scopes: string[]): boolean {
        if (scopes.length === 0) {
            return false;
        }

        return scopes.some(scope => minimatch(filePath, scope));
    }

    private matchesCommands(command: string, allowedCommands: string[]): boolean {
        if (allowedCommands.length === 0) {
            return false;
        }

        // Extract the base command (first word)
        const baseCommand = command.trim().split(' ')[0];
        if (!baseCommand) {
            return false;
        }
        
        return allowedCommands.some(allowed => {
            // Support exact matches and wildcard patterns
            if (allowed.includes('*')) {
                return minimatch(baseCommand, allowed);
            }
            return baseCommand === allowed || command.startsWith(allowed + ' ');
        });
    }

    isExpired(grant: Grant): boolean {
        return Date.now() > grant.expiresAt;
    }

    pruneExpired(): void {
        const beforeCount = this.state.grants.length;
        this.state.grants = this.state.grants.filter(g => !this.isExpired(g));
        
        if (this.state.grants.length !== beforeCount) {
            this.saveState();
        }
    }

    getRemainingQuota(kind: ActionKind): number {
        this.pruneExpired();
        const grant = this.state.grants.find(g => g.kind === kind && !this.isExpired(g));
        return grant ? grant.remaining : 0;
    }

    getTotalUsage(): number {
        this.pruneExpired();
        return this.state.grants.reduce((total, grant) => {
            return total + (grant.max - grant.remaining);
        }, 0);
    }

    reset(): void {
        this.state = { ...DEFAULT_APPROVAL_STATE };
        this.saveState();
    }

    setAutoApprove(kind: ActionKind, enabled: boolean): void {
        this.state.autoApprove[kind] = enabled;
        this.saveState();
    }

    setNotificationsEnabled(enabled: boolean): void {
        this.state.notificationsEnabled = enabled;
        this.saveState();
    }

    setMaxRequests(maxRequests: number): void {
        this.state.maxRequests = maxRequests;
        this.saveState();
    }

    private loadState(): void {
        try {
            const saved = this.workspaceState.get<ApprovalState>(this.workspaceStateKey);
            if (saved) {
                this.state = { ...DEFAULT_APPROVAL_STATE, ...saved };
                this.pruneExpired(); // Clean up on load
            }
        } catch (error) {
            console.warn('Failed to load approval state:', error);
            this.state = { ...DEFAULT_APPROVAL_STATE };
        }
    }

    private saveState(): void {
        try {
            this.workspaceState.update(this.workspaceStateKey, this.state);
        } catch (error) {
            console.warn('Failed to save approval state:', error);
        }
    }

    // Get summary for system prompt
    getSummary(): string {
        this.pruneExpired();
        const activeGrants = this.state.grants.filter(g => !this.isExpired(g) && g.remaining > 0);
        const autoApproveEnabled = Object.entries(this.state.autoApprove)
            .filter(([_, enabled]) => enabled)
            .map(([kind]) => kind);

        return JSON.stringify({
            autoApprove: autoApproveEnabled,
            notifications: this.state.notificationsEnabled,
            maxRequests: this.state.maxRequests,
            totalUsage: this.getTotalUsage(),
            activeGrants: activeGrants.map(g => ({
                kind: g.kind,
                remaining: g.remaining,
                expiresIn: Math.ceil((g.expiresAt - Date.now()) / (1000 * 60)) // minutes
            }))
        }, null, 2);
    }
}
