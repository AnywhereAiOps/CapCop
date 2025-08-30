# Product Context

## Problem
Most AI coding assistants assume local system access or native capabilities; they break in browser IDE sandboxes where filesystem, terminal, and system APIs are restricted or unavailable.

## Solution
Web-first AI assistant using web APIs and cloud integrations, enforcing permissioned actions that are fully compatible with VSCode Web's sandboxed environment.

## Target Users
- Developers working in GitHub Codespaces
- Users of VSCode for the Web
- Teams using self-hosted browser-based IDEs
- Developers who need AI assistance in restricted/sandboxed environments

## Key User Workflows
- **Context ingestion**: @file, @folder, @url, @problems for comprehensive project understanding
- **Safe file operations**: Create and edit files with explicit user approval
- **Web-safe command execution**: Run commands via integrated terminal with fallbacks
- **Workspace snapshots**: Create checkpoints and restore previous states
- **Model flexibility**: Choose from multiple LLM providers with cost visibility

## User Experience Goals
- **Frictionless setup**: Simple API key configuration and immediate usability
- **Visible approvals**: Clear permission requests for all impactful actions
- **Step-by-step reasoning**: Transparent AI decision-making process
- **Recoverability**: Easy rollback via checkpoint system
- **Cost transparency**: Real-time token usage and cost estimates

## Business Value
- Enables AI-assisted development in cloud-first environments
- Reduces friction for teams using browser-based IDEs
- Provides secure AI assistance without compromising sandbox security
- Scales with cloud development trends (Codespaces, Gitpod, etc.)

## Constraints
- Sandboxed filesystem and terminal access
- Browser security restrictions
- No native binary execution
- Permission-based action model required
