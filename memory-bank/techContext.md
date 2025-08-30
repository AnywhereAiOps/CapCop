# Tech Context

## Core Technologies

### VSCode Extension Platform
- **Target**: VSCode Web (browser environments)
- **APIs**: VSCode Extension API with web constraints
- **Language**: TypeScript for type safety and tooling
- **Packaging**: VSIX format for Marketplace distribution

### Web Platform Integration
- **Browser APIs**: Web-standard APIs only (no Node.js dependencies)
- **Security Model**: Content Security Policy compliant
- **Storage**: VSCode workspace state and configuration APIs
- **UI**: VSCode Webview API for custom panels

### LLM Provider Integration
- **Primary**: OpenAI-compatible API standard
- **Supported Providers**:
  - OpenRouter (multi-model aggregator)
  - Anthropic (Claude models)
  - OpenAI (GPT models)
  - Google Gemini
  - Any OpenAI-compatible endpoint
- **Authentication**: API key based with secure storage

## Development Environment

### Build System
- TypeScript compilation for extension code
- Web-compatible bundling (no Node.js runtime dependencies)
- VSCode extension development tools

### Configuration Management
- **Settings**: VSCode extension configuration system
- **API Keys**: Secure storage via VSCode secrets API
- **User Preferences**: Model selection, cost limits, approval settings

## Runtime Execution Model

### Command Execution Strategies
1. **Integrated Terminal** (when available)
   - Direct command execution in VSCode terminal
   - Real-time output streaming
   - Interactive command support

2. **Simulated Execution** (fallback)
   - Safe command interpretation without execution
   - Result prediction based on command analysis
   - Clear indication of simulation vs real execution

3. **Cloud Runners** (future enhancement)
   - Remote execution in Codespaces environments
   - Secure command proxy with approval workflow
   - Enhanced capabilities for cloud-hosted workspaces

### Checkpoint Implementation
- **Storage**: VSCode workspace state for snapshots
- **Diffing**: Text-based diff generation and storage
- **Restoration**: File-by-file rollback with user confirmation
- **UI**: Diff visualization in VSCode webviews

## Constraints and Limitations

### Web Environment Restrictions
- No direct local filesystem access outside workspace
- Limited terminal capabilities in some web IDEs
- No native binary execution
- Browser security model enforcement

### VSCode Web Specific
- Extension host limitations in web environments
- Restricted Node.js API surface
- Webview security constraints
- Limited file system operations

### Security Boundaries
- All operations require explicit user approval
- No automatic code execution without permission
- Sandboxed operation within VSCode workspace
- API key security via VSCode secrets management

## Performance Considerations
- **Token Usage**: Real-time tracking and cost estimation
- **Context Management**: Efficient large file handling for @folder operations
- **Network**: Optimized API calls with request batching where possible
- **Storage**: Efficient diff storage for checkpoints

## Distribution and Deployment
- **Marketplace**: Official VSCode Marketplace publication
- **Installation**: Standard VSCode extension installation
- **Updates**: Automatic via VSCode extension system
- **Configuration**: Settings UI integrated with VSCode preferences
