# CapCop Development Guide

## Overview
CapCop is a VS Code Web extension providing AI coding assistance with secure file operations and multi-provider LLM support.

## Architecture

### Core Structure
```
src/
├── extension.ts           # Extension entry point
├── core/
│   ├── providers/        # LLM provider implementations
│   ├── tools/           # Built-in tools (file ops, diagnostics)
│   ├── sessions/        # Chat session management
│   └── logging/         # Structured logging
├── ui/
│   ├── CapCopSidebarProvider.ts  # Webview integration
│   └── webview/         # React-based chat UI
└── state/               # Configuration and persistence
```

### Built-in Tools
- **ReadFileTool**: File reading with encoding support
- **WriteFileTool**: File editing with diff preview and approval
- **ListFilesTool**: Directory listing with filtering
- **ProblemsFeedTool**: VS Code diagnostics integration
- **FetchUrlTool**: URL content fetching with HTML→Markdown conversion

## Development Setup

### Prerequisites
- Node.js 18+ (for development only, runtime is web-only)
- TypeScript 5.0+
- VS Code Web or desktop for testing

### Installation
```bash
npm install
npm run compile  # TypeScript compilation
npm run build    # Bundle generation
```

### Build System
Uses esbuild for web-compatible bundling:
- `dist/extension-web.js` - Main extension bundle
- `dist/webview/` - UI assets (React components, CSS)

### TypeScript Configuration
Strict mode enabled with:
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`
- Web-only target (ES2022, DOM libs)

## Web Constraints

### Allowed APIs
- `vscode.workspace.fs` - File system operations
- `vscode.ExtensionContext.secrets` - Secure storage
- `fetch()` - HTTP requests
- `WebSocket` / `EventSource` - Real-time communication

### Forbidden APIs
- Node.js native modules (`fs`, `child_process`, `path`)
- Local file system access
- Direct shell execution

### CSP Compliance
Webview uses:
- Nonce-based script loading
- External stylesheets only
- No inline JavaScript/CSS

## Provider Implementation

### Interface
```typescript
export interface ProviderAdapter {
  id: string;
  displayName: string;
  getModels(): Promise<ModelInfo[]>;
  streamChat(opts: ChatOptions): AsyncIterable<StreamChunk>;
  estimateTokens?(text: string): number;
}
```

### Streaming Pattern
```typescript
for await (const chunk of provider.streamChat(options)) {
  if (chunk.type === 'text') {
    // Handle text delta
  } else if (chunk.type === 'tool_call') {
    // Execute tool and continue
  }
}
```

## Tool Development

### Interface
```typescript
export interface ToolAdapter {
  id: string;
  displayName: string;
  description: string;
  getSchema(): ToolSchema;
  validateArgs(args: unknown): ToolArgs;
  isAvailable(context: ToolExecutionContext): boolean;
  execute(args: ToolArgs, context: ToolExecutionContext): Promise<ToolResult>;
}
```

### Registration
Tools are registered in `ToolRegistry.ts`:
```typescript
this.tools.set('read_file', new ReadFileTool());
this.tools.set('write_file', new WriteFileTool());
// ... other tools
```

## Testing

### Unit Tests
```bash
npm test  # Run Jest test suite
```

### Integration Testing
1. Load extension in VS Code Web
2. Open CapCop sidebar
3. Test tool execution with approval workflows
4. Verify provider streaming and token counting

### Manual Testing Checklist
- [ ] Extension loads in VS Code Web
- [ ] Chat sidebar opens and renders
- [ ] File operations trigger approval dialogs
- [ ] Context attachments (@file, @folder, @url, @problems) work
- [ ] Provider switching and model selection
- [ ] Token usage tracking

## Security Considerations

### File Operations
- All file writes require explicit user approval
- Diff preview shown before changes
- Backup/rollback capabilities maintained

### API Keys
- Stored in `ExtensionContext.secrets` (web-backed secure storage)
- Never logged or exposed in webview messages
- Validated before provider initialization

### Webview Security
- Content Security Policy enforced
- Message validation via Zod schemas
- No privileged API access from webview context

## Debugging

### VS Code Developer Tools
1. Open Command Palette → "Developer: Reload Window"
2. View → Output → Select "CapCop" channel
3. For webview: Right-click sidebar → "Open Webview Developer Tools"

### Logging
```typescript
import { Logger } from './core/logging/Logger';

Logger.info('Operation completed', { fileCount: 5 });
Logger.error('Provider failed', { error: err.message });
```

## Performance

### Bundle Size
- Target: <500KB compressed extension bundle
- Webview: <200KB initial load
- Tree-shaking enabled for unused code elimination

### Memory Usage
- Session data persisted to workspace state
- Provider instances reused across sessions
- Webview UI uses virtual scrolling for large chat histories

## Release Process

### Version Bump
```bash
npm version patch|minor|major
git push --tags
```

### Packaging
```bash
npm run package  # Generates .vsix file
```

### Publishing
```bash
vsce publish  # To VS Code Marketplace
```

## Contributing

### Code Style
- Prettier for formatting
- ESLint for code quality
- Conventional commits for changelog generation

### Pull Request Process
1. Fork and create feature branch
2. Add tests for new functionality
3. Ensure all checks pass
4. Update documentation as needed
5. Submit PR with clear description

## Troubleshooting

### Common Issues
- **"Module not found" errors**: Check web-compatible imports
- **CSP violations**: Verify nonce usage in webview
- **Provider timeouts**: Implement proper AbortController handling
- **Tool approval fails**: Check message validation schemas

### Extension Not Loading
1. Check browser console for errors
2. Verify package.json `extensionKind: ["web"]`
3. Ensure no Node.js native dependencies
4. Test in VS Code desktop first, then web
