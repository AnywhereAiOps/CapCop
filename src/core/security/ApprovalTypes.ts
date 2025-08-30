export type ActionKind = 
    | 'read_project' 
    | 'read_all' 
    | 'edit_project' 
    | 'edit_all' 
    | 'cmd_safe' 
    | 'cmd_any' 
    | 'browser' 
    | 'mcp';

export interface Grant {
    kind: ActionKind;
    scopes?: string[]; // glob patterns for file operations
    commands?: string[]; // allowed commands for cmd operations
    ttlMinutes: number;
    expiresAt: number; // timestamp
    remaining: number; // quota remaining
    max: number; // initial quota
    createdAt: number;
}

export interface ApprovalState {
    autoApprove: Record<ActionKind, boolean>;
    notificationsEnabled: boolean;
    maxRequests: number;
    grants: Grant[];
}

export interface ApprovalRequest {
    kind: ActionKind;
    reason: string;
    suggestedScopes?: string[];
    suggestedCommands?: string[];
    ttlSuggestion?: number; // minutes
    quotaSuggestion?: number;
    context?: any;
}

export interface ApprovalResponse {
    granted: boolean;
    grants?: Grant[];
    notes?: string;
}

export const DEFAULT_APPROVAL_STATE: ApprovalState = {
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

export const ACTION_KIND_LABELS: Record<ActionKind, string> = {
    read_project: 'Read project files',
    read_all: 'Read all files',
    edit_project: 'Edit project files',
    edit_all: 'Edit all files',
    cmd_safe: 'Execute safe commands',
    cmd_any: 'Execute all commands',
    browser: 'Use the browser',
    mcp: 'Use MCP servers'
};
