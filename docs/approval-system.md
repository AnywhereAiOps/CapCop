# CapCop Approval System

The CapCop Approval System provides granular, time-limited permissions for AI agents to perform actions within VS Code with user oversight and control.

## Overview

The approval system implements three core capabilities:

1. **Approval UI** - Modal interface matching the provided screenshot design
2. **Permission Model** - Granular scoped permissions with TTL and quotas
3. **Rules Integration** - Multi-profile rules system with "most restrictive wins" merging

## Architecture

### Core Components

- **ApprovalTypes.ts** - Type definitions and data structures
- **ApprovalState.ts** - Persistent state management with workspace storage
- **ApprovalManager.ts** - Central orchestration and validation logic
- **ApprovalPanel.ts** - VS Code webview integration
- **ApprovalModal.tsx** - Preact-based UI component

### Permission Model

#### Action Types
- `read_project` - Read files within project scope
- `read_all` - Read any files on system
- `edit_project` - Edit files within project scope  
- `edit_all` - Edit any files on system
- `cmd_safe` - Execute pre-approved safe commands
- `cmd_any` - Execute any system commands
- `browser` - Access web pages and APIs
- `mcp` - Use Model Context Protocol servers

#### Grant Structure
```typescript
interface Grant {
    kind: ActionKind;
    scopes?: string[];      // File patterns for read/edit actions
    commands?: string[];    // Command patterns for exec actions
    ttlMinutes: number;     // Time-to-live in minutes
    expiresAt: number;      // Absolute expiry timestamp
    remaining: number;      // Remaining quota count
    max: number;           // Original quota limit
    createdAt: number;     // Creation timestamp
}
```

### Approval Flow

1. **Auto-Approve Check**: If auto-approve enabled for action type and allowed by rules
2. **Existing Grant Check**: Look for valid unexpired grants that cover the request
3. **UI Approval**: Show modal if no automatic approval available
4. **Rule Validation**: Validate user grants against loaded rules
5. **State Persistence**: Store approved grants with TTL tracking

## User Interface

### Approval Modal Features

- **Auto-approve toggles** for each action type
- **Global settings**: Enable notifications, Max requests limit  
- **Grant controls**: Select specific actions to approve
- **Advanced options**: 
  - Custom TTL duration (minutes)
  - Per-action quotas
  - File scope patterns (glob patterns)
  - Command patterns

### Screenshots

The modal interface replicates the provided design with:
- Checkbox grid for action types
- Toggle controls for auto-approve
- Numeric input for max requests
- Expandable advanced options section

## Rules System Integration

### Profile Support
- `capcop-default` - Balanced security profile
- `cline` - Broader permissions for Cline compatibility  
- `gemini` - Conservative profile for Gemini models

### Rule Merging
Rules are merged with "most restrictive wins" semantics:
- **Booleans**: `false` overrides `true`
- **Allow lists**: Use intersection
- **Deny lists**: Use union
- **Quotas/limits**: Take minimum value

### Configuration Files
```
.capcoprules/
├── profile.yaml       # Profile selection and overrides
├── allowlists.yaml     # Permitted scopes and commands  
├── denylists.yaml      # Prohibited patterns
└── prompts.md          # Project context hints
```

## Security Features

### Deny-by-Default
- All actions require explicit grants
- Destructive operations are blocked by default
- System paths and credentials are protected

### Pattern Validation
- File scopes use `minimatch` for glob pattern matching
- Command patterns support prefix and glob matching
- Deny patterns take precedence over allow patterns

### Destructive Operation Detection
Automatic detection of dangerous patterns:
- `rm -rf`, `sudo`, `chmod 777`
- Git force operations
- System path access
- Credential file access

## API Usage

### Basic Integration
```typescript
// Initialize approval manager
const approvalManager = new ApprovalManager(context, mergedRules);

// Request permission
const response = await approvalManager.requestApproval({
    kind: 'edit_project',
    suggestedScopes: ['src/**/*.ts'],
    reason: 'Refactor component structure'
});

if (response.granted) {
    // Execute approved actions
    // Quota will be decremented automatically
}
```

### Permission Checking
```typescript
// Check if action is allowed
if (approvalManager.canExecute('cmd_safe', 'npm test')) {
    // Execute and consume quota
    approvalManager.consumeQuota('cmd_safe');
    // Run the command
}
```

## State Management

### Workspace Persistence
State is persisted using VS Code's `workspaceState` API:
- Survives VS Code restarts
- Workspace-specific settings
- Automatic cleanup of expired grants

### State Structure
```typescript
interface ApprovalState {
    autoApprove: Record<ActionKind, boolean>;
    notificationsEnabled: boolean;
    maxRequests: number;
    grants: Grant[];
}
```

## Commands

The system registers several VS Code commands:

- `capcop.showApprovalModal` - Show approval interface
- `capcop.resetApprovals` - Clear all approval state
- `capcop.showApprovalStatus` - Display current permissions

## Development Notes

### Testing Priorities
1. Rules merging logic validation
2. TTL expiry and quota management  
3. Pattern matching accuracy
4. UI state synchronization

### Browser Compatibility
- Uses Preact instead of React for smaller bundle size
- Compatible with VS Code Web environment
- No Node.js dependencies in webview code

### Performance Considerations
- Grants are filtered on each request for expired entries
- Minimatch patterns are cached where possible
- UI updates are debounced to prevent excessive re-renders
