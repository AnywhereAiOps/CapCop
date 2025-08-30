import { useState } from 'preact/hooks';
import { ApprovalRequest, ApprovalResponse, ActionKind, Grant, ACTION_KIND_LABELS } from '../../../core/security/ApprovalTypes';
import { RulesConfig } from '../../../core/rules/RulesTypes';

interface ApprovalModalProps {
    requestId: string;
    request: ApprovalRequest;
    rules: Required<RulesConfig>;
    currentApprovalState: {
        autoApprove?: Record<ActionKind, boolean>;
        notificationsEnabled?: boolean;
        maxRequests?: number;
    };
    onResponse: (requestId: string, response: ApprovalResponse) => void;
    onClose: () => void;
}

interface FormState {
    autoApproveToggles: Record<ActionKind, boolean>;
    enableNotifications: boolean;
    maxRequests: number;
    selectedActions: Record<ActionKind, boolean>;
    customScopes: string;
    customCommands: string;
    ttlMinutes: number;
    quotaPerAction: number;
}

const DEFAULT_TTL_MINUTES = 60;
const DEFAULT_QUOTA_PER_ACTION = 10;

export const ApprovalModal = ({
    requestId,
    request,
    rules,
    currentApprovalState,
    onResponse,
    onClose
}: ApprovalModalProps) => {
    // Add safety checks for undefined props
    if (!requestId || !request || !rules) {
        console.error('ApprovalModal received undefined props:', { requestId, request, rules, currentApprovalState });
        return (
            <div className="approval-modal-overlay">
                <div className="approval-modal">
                    <div className="modal-header">
                        <h2>Error</h2>
                        <button className="close-button" onClick={onClose}>×</button>
                    </div>
                    <div className="modal-content">
                        <p>Unable to load approval request. Missing required data.</p>
                        <pre>{JSON.stringify({ requestId, request, rules, currentApprovalState }, null, 2)}</pre>
                    </div>
                    <div className="modal-actions">
                        <button className="deny-button" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }
    const [formState, setFormState] = useState<FormState>({
        autoApproveToggles: {
            read_project: currentApprovalState?.autoApprove?.read_project || rules.behavior?.autoApprove?.read_project || false,
            read_all: currentApprovalState?.autoApprove?.read_all || rules.behavior?.autoApprove?.read_all || false,
            edit_project: currentApprovalState?.autoApprove?.edit_project || rules.behavior?.autoApprove?.edit_project || false,
            edit_all: currentApprovalState?.autoApprove?.edit_all || rules.behavior?.autoApprove?.edit_all || false,
            cmd_safe: currentApprovalState?.autoApprove?.cmd_safe || rules.behavior?.autoApprove?.cmd_safe || false,
            cmd_any: currentApprovalState?.autoApprove?.cmd_any || rules.behavior?.autoApprove?.cmd_any || false,
            browser: currentApprovalState?.autoApprove?.browser || rules.behavior?.autoApprove?.browser || false,
            mcp: currentApprovalState?.autoApprove?.mcp || rules.behavior?.autoApprove?.mcp || false,
        },
        enableNotifications: currentApprovalState?.notificationsEnabled || true,
        maxRequests: currentApprovalState?.maxRequests || 1200,
        selectedActions: {
            [request.kind]: true,
            read_project: false,
            read_all: false,
            edit_project: false,
            edit_all: false,
            cmd_safe: false,
            cmd_any: false,
            browser: false,
            mcp: false,
        },
        customScopes: request.suggestedScopes?.join('\n') || '',
        customCommands: request.suggestedCommands?.join('\n') || '',
        ttlMinutes: request.ttlSuggestion || DEFAULT_TTL_MINUTES,
        quotaPerAction: request.quotaSuggestion || DEFAULT_QUOTA_PER_ACTION
    });

    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleToggleAll = () => {
        const allEnabled = Object.values(formState.autoApproveToggles).every(enabled => enabled);
        const newToggles = {} as Record<ActionKind, boolean>;
        
        Object.keys(formState.autoApproveToggles).forEach(key => {
            newToggles[key as ActionKind] = !allEnabled;
        });

        setFormState((prev: FormState) => ({
            ...prev,
            autoApproveToggles: newToggles
        }));
    };

    const handleAutoApproveToggle = (actionKind: ActionKind, enabled: boolean) => {
        setFormState((prev: FormState) => ({
            ...prev,
            autoApproveToggles: {
                ...prev.autoApproveToggles,
                [actionKind]: enabled
            }
        }));
    };

    const handleActionToggle = (actionKind: ActionKind, enabled: boolean) => {
        setFormState((prev: FormState) => ({
            ...prev,
            selectedActions: {
                ...prev.selectedActions,
                [actionKind]: enabled
            }
        }));
    };

    const handleApprove = () => {
        const selectedActionKinds = Object.entries(formState.selectedActions)
            .filter(([_, selected]) => selected)
            .map(([actionKind, _]) => actionKind as ActionKind);

        const grants: Grant[] = selectedActionKinds.map(actionKind => {
            const now = Date.now();
            const expiresAt = now + (formState.ttlMinutes * 60 * 1000);

            let scopes: string[] | undefined;
            let commands: string[] | undefined;

            if (actionKind === 'read_project' || actionKind === 'read_all' || 
                actionKind === 'edit_project' || actionKind === 'edit_all') {
                scopes = formState.customScopes
                    ? formState.customScopes.split('\n').filter((s: string) => s.trim())
                    : request.suggestedScopes || ['**/*'];
            }

            if (actionKind === 'cmd_safe' || actionKind === 'cmd_any') {
                commands = formState.customCommands
                    ? formState.customCommands.split('\n').filter((s: string) => s.trim())
                    : request.suggestedCommands || ['*'];
            }

            return {
                kind: actionKind,
                scopes: scopes || [],
                commands: commands || [],
                ttlMinutes: formState.ttlMinutes,
                expiresAt,
                remaining: formState.quotaPerAction,
                max: formState.quotaPerAction,
                createdAt: now
            };
        });

        const response: ApprovalResponse = {
            granted: grants.length > 0,
            grants: grants.length > 0 ? grants : [],
            notes: `Approved ${selectedActionKinds.length} action(s) for ${formState.ttlMinutes} minutes`
        };

        onResponse(requestId, response);
    };

    const handleDeny = () => {
        const response: ApprovalResponse = {
            granted: false,
            notes: 'User denied the request'
        };
        onResponse(requestId, response);
    };

    const getActionDescription = (actionKind: ActionKind): string => {
        switch (actionKind) {
            case 'read_project': return 'Read files within the project scope';
            case 'read_all': return 'Read any files on the system';
            case 'edit_project': return 'Edit files within the project scope';
            case 'edit_all': return 'Edit any files on the system';
            case 'cmd_safe': return 'Execute safe, pre-approved commands';
            case 'cmd_any': return 'Execute any system commands';
            case 'browser': return 'Access web pages and APIs';
            case 'mcp': return 'Use Model Context Protocol servers';
            default: return `Execute ${actionKind} operations`;
        }
    };

    const getScopesSummary = (): string => {
        if (request.suggestedScopes) {
            return `Suggested scopes: ${request.suggestedScopes.join(', ')}`;
        }
        return 'No specific scopes requested';
    };

    const getCommandsSummary = (): string => {
        if (request.suggestedCommands) {
            return `Suggested commands: ${request.suggestedCommands.join(', ')}`;
        }
        return 'No specific commands requested';
    };

    const allAutoApproveEnabled = Object.values(formState.autoApproveToggles).every(enabled => enabled);

    return (
        <div className="approval-modal-overlay">
            <div className="approval-modal">
                <div className="modal-header">
                    <h2>Permission Request</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                <div className="modal-content">
                    <div className="request-details">
                        <div className="request-summary">
                            <h3>Agent is requesting: {ACTION_KIND_LABELS[request.kind]}</h3>
                            <p className="request-description">{getActionDescription(request.kind)}</p>
                            
                            {(request.kind.includes('read') || request.kind.includes('edit')) && (
                                <p className="scope-info">{getScopesSummary()}</p>
                            )}
                            
                            {request.kind.includes('cmd') && (
                                <p className="command-info">{getCommandsSummary()}</p>
                            )}

                            {request.reason && (
                                <div className="reasoning">
                                    <strong>Reasoning:</strong> {request.reason}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="approval-settings">
                        <div className="settings-section">
                            <h4>Auto-approve Settings</h4>
                            
                            <div className="toggle-row main-toggles">
                                <label className="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={allAutoApproveEnabled}
                                        onChange={handleToggleAll}
                                        className="toggle-checkbox"
                                    />
                                    <span className="toggle-text">Enable auto-approve</span>
                                </label>
                                
                                <label className="toggle-label">
                                    <input
                                        type="checkbox"
                                        checked={allAutoApproveEnabled}
                                        onChange={handleToggleAll}
                                        className="toggle-checkbox"
                                    />
                                    <span className="toggle-text">Toggle all</span>
                                </label>
                            </div>

                            <div className="action-toggles">
                                {Object.entries(ACTION_KIND_LABELS).map(([actionKind, label]) => (
                                    <label key={actionKind} className="action-toggle">
                                        <input
                                            type="checkbox"
                                            checked={formState.autoApproveToggles[actionKind as ActionKind]}
                                            onChange={(e) => handleAutoApproveToggle(actionKind as ActionKind, (e.target as HTMLInputElement).checked)}
                                            className="action-checkbox"
                                        />
                                        <span className="action-label">{label}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="global-settings">
                                <label className="setting-label">
                                    <input
                                        type="checkbox"
                                        checked={formState.enableNotifications}
                                        onChange={(e) => setFormState((prev: FormState) => ({ ...prev, enableNotifications: (e.target as HTMLInputElement).checked }))}
                                        className="setting-checkbox"
                                    />
                                    <span>Enable notifications</span>
                                </label>

                                <div className="numeric-setting">
                                    <label>Max Requests</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10000"
                                        value={formState.maxRequests}
                                        onChange={(e) => setFormState((prev: FormState) => ({ 
                                            ...prev, 
                                            maxRequests: Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1) 
                                        }))}
                                        className="numeric-input"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grant-settings">
                            <h4>Grant This Request</h4>
                            
                            <div className="current-actions">
                                {Object.entries(ACTION_KIND_LABELS).map(([actionKind, label]) => (
                                    <label key={actionKind} className="grant-action">
                                        <input
                                            type="checkbox"
                                            checked={formState.selectedActions[actionKind as ActionKind]}
                                            onChange={(e) => handleActionToggle(actionKind as ActionKind, (e.target as HTMLInputElement).checked)}
                                            className="grant-checkbox"
                                        />
                                        <span className="grant-label">{label}</span>
                                    </label>
                                ))}
                            </div>

                            <button 
                                className="advanced-toggle"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                            >
                                {showAdvanced ? '▼' : '▶'} Advanced Options
                            </button>

                            {showAdvanced && (
                                <div className="advanced-options">
                                    <div className="time-quota-controls">
                                        <div className="control-group">
                                            <label>Duration (minutes)</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="10080"
                                                value={formState.ttlMinutes}
                                                onChange={(e) => setFormState((prev: FormState) => ({ 
                                                    ...prev, 
                                                    ttlMinutes: Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1) 
                                                }))}
                                                className="numeric-input"
                                            />
                                        </div>

                                        <div className="control-group">
                                            <label>Quota per action</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="1000"
                                                value={formState.quotaPerAction}
                                                onChange={(e) => setFormState((prev: FormState) => ({ 
                                                    ...prev, 
                                                    quotaPerAction: Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1) 
                                                }))}
                                                className="numeric-input"
                                            />
                                        </div>
                                    </div>

                                    {(formState.selectedActions.read_project || formState.selectedActions.read_all ||
                                      formState.selectedActions.edit_project || formState.selectedActions.edit_all) && (
                                        <div className="scope-control">
                                            <label>File Scopes (one per line)</label>
                                            <textarea
                                                value={formState.customScopes}
                                                onChange={(e) => setFormState((prev: FormState) => ({ ...prev, customScopes: (e.target as HTMLTextAreaElement).value }))}
                                                placeholder="**/*.ts&#10;src/**/*&#10;!node_modules/**"
                                                className="scope-textarea"
                                                rows={4}
                                            />
                                        </div>
                                    )}

                                    {(formState.selectedActions.cmd_safe || formState.selectedActions.cmd_any) && (
                                        <div className="command-control">
                                            <label>Command Patterns (one per line)</label>
                                            <textarea
                                                value={formState.customCommands}
                                                onChange={(e) => setFormState((prev: FormState) => ({ ...prev, customCommands: (e.target as HTMLTextAreaElement).value }))}
                                                placeholder="npm*&#10;git status&#10;ls*"
                                                className="command-textarea"
                                                rows={4}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="approve-button" onClick={handleApprove}>
                        Approve
                    </button>
                    <button className="deny-button" onClick={handleDeny}>
                        Deny
                    </button>
                </div>
            </div>
        </div>
    );
};
