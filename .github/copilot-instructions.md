# CapCop Repository Instructions

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

CapCop is a VS Code Web extension repository under the AnywhereAiOps organization providing AI coding assistance with secure, permission-based actions for web-based development environments.

## Working Effectively

### Current Repository State
CapCop is a TypeScript-based VS Code extension with the following structure:
- **Primary development branch**: `features/approval-system` (contains full codebase)
- **Main branch**: Contains only basic licensing (legacy state)
- **Technology stack**: TypeScript, Preact, esbuild, Vitest
- **Target environment**: VS Code Web, GitHub Codespaces, browser-based IDEs

### Available Development Environment
The following tools are available in the development environment:
- **Git**: `git version 2.51.0` - Use `git --no-pager <command>` to avoid pagination timeouts
- **Node.js**: `v20.19.4` - Required for TypeScript development and build process
- **npm**: For package management and script execution
- **TypeScript**: Full TypeScript compilation support
- **esbuild**: High-performance bundling for web deployment

### Repository Setup Commands
Always work from the features/approval-system branch for actual development:
```bash
cd /path/to/CapCop
git status
git checkout features/approval-system
npm install
```

### Project Structure
```
CapCop/
├── src/                        # TypeScript source code
│   ├── extension.ts           # Main extension entry point
│   ├── core/                  # Core functionality
│   │   ├── providers/         # LLM provider implementations
│   │   ├── tools/            # Built-in tools (file ops, diagnostics)
│   │   ├── sessions/         # Chat session management
│   │   ├── security/         # Approval and security systems
│   │   └── logging/          # Structured logging
│   ├── ui/                   # User interface components
│   │   └── webview/          # Preact-based chat UI
│   ├── state/                # Configuration and persistence
│   └── commands/             # VS Code command implementations
├── dist/                     # Built extension files
├── docs/                     # Documentation
├── profiles/                 # Provider configuration templates
├── resources/                # Extension assets (icons, etc.)
├── package.json              # Extension manifest and dependencies
├── tsconfig.json             # TypeScript configuration
├── build.js                  # esbuild configuration
├── run_local.sh              # VS Code Web development server
├── run_codeserver.sh         # Code-server development setup
└── DEVELOPMENT.md            # Detailed development guide
```

### Core Development Commands

#### Essential Build Commands
- `npm install` - Install dependencies (timeout: 10+ minutes)
  - **Note**: May require `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` to avoid browser download issues
  - Use `rm -rf node_modules package-lock.json && npm install` if encountering platform-specific binary issues
- `npm run build` - Bundle extension for distribution (timeout: 5+ minutes) ✅ **Verified working**
- `npm run compile` - TypeScript compilation only (timeout: 3+ minutes) ⚠️ **Currently has 20 errors**
- `npm run build:watch` - Watch mode for development (timeout: 60+ minutes, keep running)

#### Testing Commands  
- `npm test` - Run Vitest test suite (timeout: 10+ minutes) ✅ **Verified working**
- `npm run test:watch` - Watch mode testing (timeout: 60+ minutes, keep running)
- `npm run test:coverage` - Generate test coverage reports (timeout: 15+ minutes)

#### Code Quality Commands
- `npm run lint` - Run ESLint on TypeScript source (timeout: 5+ minutes) ⚠️ **Missing ESLint config**
- `npm run lint:fix` - Auto-fix ESLint issues (timeout: 5+ minutes) ⚠️ **Missing ESLint config**

#### Current Development State
The `features/approval-system` branch contains a working VS Code extension but has several issues that need resolution:
- **TypeScript compilation errors**: 20 errors across 5 files related to type safety and unused imports
- **Missing ESLint configuration**: Linting commands fail due to missing `.eslintrc.*` configuration
- **Build system works**: esbuild successfully bundles the extension despite TypeScript errors
- **Tests pass**: Vitest test suite runs successfully with 6 passing tests

#### Development Servers
- `npm run dev` or `./run_local.sh` - VS Code Web server (timeout: 10+ minutes, keep running)
- `./run_codeserver.sh` - Alternative code-server setup (timeout: 15+ minutes, keep running)

#### Extension Packaging
- `npm run package` - Create .vsix package (timeout: 10+ minutes)
- `npm run deploy` - Publish to marketplace (timeout: 15+ minutes)

**CRITICAL: NEVER CANCEL long-running commands. Extension builds can take 15+ minutes. Always set appropriate timeouts and wait for completion.**

## Development Workflow

### Primary Development Branch
**Always use `features/approval-system` branch** - this contains the complete VS Code extension codebase:
```bash
git checkout features/approval-system
git pull origin features/approval-system
```

### Local Development Setup
1. **Install dependencies**: `npm install` (timeout: 10+ minutes)
2. **Initial build**: `npm run build` (timeout: 5+ minutes)
3. **Start development server**: `./run_local.sh` (timeout: 10+ minutes, keep running)
4. **Access VS Code Web**: Navigate to displayed URL (typically http://localhost:8080)

### Extension Features to Test
- **Sidebar Integration**: CapCop robot icon in Activity Bar
- **Chat Interface**: Preact-based webview with AI conversation
- **File Operations**: Read/write tools with approval workflows
- **Context Attachments**: @file, @folder, @url, @problems syntax
- **Provider Configuration**: Multi-LLM support (OpenRouter, OpenAI, Anthropic, etc.)
- **Security System**: User approval required for all file modifications

### Code-Server Alternative
For more stable development experience:
```bash
./run_codeserver.sh  # (timeout: 15+ minutes, keep running)
```
This provides better debugging and extension stability than VS Code Web.

## Validation Requirements

### Before Making Changes
- Run `git status` to check current state
- Check `git --no-pager diff` for any uncommitted changes  
- Ensure you're on `features/approval-system` branch
- Run `npm run lint` to check code quality
- Run `npm run compile` to verify TypeScript compilation

### After Making Changes
- **ALWAYS** run `git --no-pager diff` to review changes
- **ALWAYS** run `npm run lint` and fix any new issues
- **ALWAYS** run `npm run compile` to verify TypeScript builds
- **ALWAYS** run `npm run build` to ensure extension bundles correctly
- **ALWAYS** test the extension in VS Code Web using `./run_local.sh`
- Validate all new functionality through complete user workflows

### Manual Testing Requirements
**ALWAYS** exercise complete extension workflows after making changes:
- Load extension in VS Code Web environment
- Test chat interface and AI interactions
- Verify file operation approval workflows
- Test context attachment features (@file, @folder, @url, @problems)
- Validate provider configuration and model selection
- Ensure security approval dialogs function correctly
- Take screenshots of any UI changes if applicable

## VS Code Extension Specifics

### Technology Stack
- **TypeScript 5.4+**: Strict mode with exact optional properties
- **Preact**: Lightweight React alternative for webview UI
- **esbuild**: High-performance bundling for web deployment
- **Vitest**: Modern testing framework with coverage
- **ESLint**: TypeScript code quality and style enforcement

### Web Constraints
The extension must operate within VS Code Web's sandboxed environment:
- **No Node.js native modules** - Uses web APIs only
- **CSP compliant** - Nonce-based script loading in webviews
- **Browser platform target** - esbuild configured for browser environment
- **vscode.workspace.fs** - File system operations through VS Code API
- **ExtensionContext.secrets** - Secure storage for API keys

### Extension Configuration
Key settings in package.json:
- `"extensionKind": ["ui"]` - UI extension for web compatibility
- `"browser": "./dist/extension-web.js"` - Web bundle entry point
- Multiple activation events for sidebar, commands, and chat

## Common Development Tasks

### Adding New Providers
1. Create provider class in `src/core/providers/`
2. Implement `ProviderAdapter` interface
3. Register in `ProviderRegistry.ts`
4. Add configuration properties to package.json
5. Test streaming and token estimation

### Adding New Tools
1. Create tool class in `src/core/tools/`
2. Implement `ToolAdapter` interface  
3. Register in `ToolRegistry.ts`
4. Add approval logic if tool modifies files
5. Write unit tests in Vitest

### UI Development
1. Edit Preact components in `src/ui/webview/`
2. Update CSS in `src/ui/webview/styles/`
3. Build webview bundle: `npm run build`
4. Test in VS Code Web: `./run_local.sh`
5. Verify CSP compliance and nonce usage

### Debugging
- **Extension Host**: VS Code Output Panel → "CapCop" channel
- **Webview**: Right-click sidebar → "Open Webview Developer Tools"
- **TypeScript**: `npm run compile` for type checking
- **Build Issues**: Check esbuild output in `npm run build`

## Security and Approval System

### File Operation Security
- All file writes require explicit user approval
- Diff preview shown before changes applied  
- Approval state managed through `src/core/security/`
- Commands available: `capcop.showApprovalModal`, `capcop.resetApprovals`

### API Key Management
- Stored securely via `vscode.ExtensionContext.secrets`
- Never exposed in logs or webview messages
- Provider-specific configuration through settings

## Important Notes

- **TIMEOUT WARNINGS**: Extension builds can take 15+ minutes, never cancel prematurely
- **BRANCH AWARENESS**: Always work on `features/approval-system` for active development
- **WEB COMPATIBILITY**: All code must work in browser environments without Node.js natives
- **APPROVAL WORKFLOWS**: Test security dialogs and user approval flows thoroughly
- **MINIMAL CHANGES**: Make surgical modifications to maintain extension stability

## Key Principles for Extension Development

1. **Web-first compatibility** - No native dependencies, browser platform target
2. **Security by design** - User approval required for all file modifications
3. **Provider flexibility** - Support multiple LLM providers with unified interface
4. **Comprehensive testing** - Unit tests, integration tests, manual workflow validation
5. **Performance optimization** - Efficient bundling and minimal runtime overhead

## Troubleshooting

### Extension Not Loading
1. Check `features/approval-system` branch is current
2. Verify `npm install` completed successfully
3. Run `npm run build` and check for errors
4. Test in fresh VS Code Web instance: `./run_local.sh`
5. Check browser console for CSP or bundling errors

### Build Failures
1. Run `npm run compile` to isolate TypeScript issues
2. Check `build.js` esbuild configuration
3. Verify all imports are web-compatible
4. Review `tsconfig.json` for strict type checking

### Provider Issues
1. Verify API key configuration in extension settings
2. Check provider implementation in `src/core/providers/`
3. Test with debug provider using `debug-providers.js`
4. Review streaming implementation and error handling