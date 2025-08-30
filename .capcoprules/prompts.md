# CapCop Project Context

## Project Overview
This is a Visual Studio Code extension called **CapCop** that provides AI coding assistance with secure, permission-based actions for web environments.

## Key Features
- **Approval System**: Granular permission system with auto-approve toggles
- **Agentic Execution**: Workflow-aware AI that detects user intent and executes accordingly
- **Rules System**: Multi-profile configuration system supporting different AI models

## Development Guidelines

### Architecture Principles
- Use TypeScript with strict typing
- Implement security-first design patterns
- Support VS Code Web (browser-based environment)
- Follow VS Code extension best practices

### Code Patterns
- Use Preact instead of React for webview components
- Implement proper error handling and validation
- Use minimatch for file pattern matching
- Persist state using VS Code workspace storage

### Security Considerations
- Always validate permissions before executing actions
- Implement deny-by-default security model
- Use TTL and quotas for time-limited grants
- Never execute destructive commands without explicit approval

### Testing Priorities
1. Rules merging logic (most restrictive wins)
2. Approval state management and TTL expiry
3. Pattern matching for file scopes and commands
4. Permission validation and enforcement

## Common Patterns

### File Operations
- Read operations require `read_project` or `read_all` permissions
- Edit operations require `edit_project` or `edit_all` permissions
- Always check deny paths before allowing access

### Command Execution
- Safe commands use predefined whitelist
- All commands require explicit permission grants
- Check for destructive patterns before execution

### Approval Flow
1. Check auto-approve settings
2. Look for existing valid grants
3. Show approval UI if needed
4. Validate grants against rules
5. Store and track usage

## Project Structure Notes
- Core logic in `src/core/`
- UI components in `src/ui/`
- Rules and profiles in `profiles/` and `.capcoprules/`
- State management in `src/state/`
