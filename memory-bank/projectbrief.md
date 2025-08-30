# CapCop – Project Brief

## Purpose
AI coding assistant purpose-built for VSCode Web environments (Codespaces, VSCode for the Web, self-hosted browser IDEs) operating in sandboxed contexts with permission-based actions.

## Goals
- Web-first assistant with zero native deps or local binaries.
- Secure, human-in-the-loop workflows with explicit approvals.
- AI-powered code understanding, file creation/editing, and context ingestion.
- Web-safe command execution via integrated terminals, simulation, or cloud runners.
- Multi-model support with token/cost tracking.
- Checkpoints and restore capabilities.

## Non-Goals
- Direct local filesystem access.
- Native/binary dependencies.
- Unrestricted terminal or browser automation.

## Deliverables
- VSCode Web-compatible extension exposing CapCop panel, context ingestion, safe actions, and checkpoints.
- Future: MCP tools integration, cloud exec for Codespaces, enhanced browser automation.

## Key Success Metrics
- 100% compatibility with VSCode Web environments
- Secure, permission-based action system
- User adoption in Codespaces and web IDE environments
