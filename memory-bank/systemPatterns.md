# System Patterns

## Architecture Overview
- **VSCode Extension** (Web target) with dedicated UI panel (CapCop)
- **Capability Layer** abstraction for web-safe operations
- **Provider Layer** for multiple LLM integration
- **Security Layer** for permission-based actions

## Core Capability Abstractions

### Context Ingestion System
- **@file**: Attach individual file contents to AI context
- **@folder**: Recursively attach entire folder structures
- **@url**: Fetch and convert web documentation to markdown
- **@problems**: Include workspace errors and diagnostics for quick fixes

### File Operations Layer
- Workspace-scoped file I/O within VSCode Web sandbox
- Diff-based change tracking for all modifications
- User approval workflow for file creation/editing
- Atomic operations with rollback capability

### Command Execution Abstraction
- **Integrated Terminal**: Direct execution when available
- **Simulated Execution**: Safe simulation for restricted commands
- **Cloud Runners**: Remote execution adapters (future: Codespaces-first)
- Graceful degradation based on environment capabilities

### Checkpoint System
- **Snapshot Engine**: Workspace state capture with diff storage
- **Restore Mechanism**: Selective or complete state rollback
- **Visualization Layer**: Clear diff presentation for user review

## Design Principles

### Web-First Architecture
- Zero native dependencies or local binaries
- Browser API utilization over system calls
- Progressive enhancement based on environment capabilities

### Least-Privilege Security
- Explicit user approval for all impactful actions
- Sandboxed operation within VSCode Web constraints
- Permission boundary enforcement at capability layer

### Deterministic Operations
- All changes tracked as reversible diff sets
- Clear audit trail for all AI-initiated actions
- Predictable rollback and recovery mechanisms

### Human-in-the-Loop Design
- Transparent reasoning for complex operations
- Clear approval workflows with action summaries
- Error surfaces that guide user decision-making

## Extensibility Patterns

### Provider Abstraction
- **LLM Providers**: OpenRouter, Anthropic, OpenAI, Gemini support
- **Usage Tracking**: Token consumption and cost estimation
- **Model Selection**: Runtime provider switching

### Future Extension Points
- **MCP Integration**: Custom tools and resources (planned)
- **Cloud Execution**: Enhanced Codespaces integration
- **Browser Automation**: Simulated web testing capabilities

## Error Handling
- Graceful degradation in restricted environments
- Clear error messages for unsupported operations
- Alternative workflow suggestions when capabilities are limited
