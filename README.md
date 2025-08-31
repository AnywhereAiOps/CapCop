# CapCop

A VS Code extension project with automated GitHub release pipeline.

## 🚀 Release Pipeline

This project includes a comprehensive GitHub Actions release pipeline that automatically:

- ✅ Builds and tests the project
- 📦 Packages VS Code extensions as `.vsix` files
- 🏷️ Creates GitHub releases with artifacts
- 🚀 Publishes to VS Code Marketplace and Open VSX Registry
- 📝 Generates release notes automatically

### How to Create a Release

#### Option 1: Automatic Release (Recommended)

1. Update the version in `package.json`
2. Create and push a git tag with semantic versioning:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. The release pipeline will automatically trigger and:
   - Build the project
   - Run tests
   - Package the extension
   - Create a GitHub release
   - Publish to marketplaces (if configured)

#### Option 2: Manual Release

1. Go to the **Actions** tab in GitHub
2. Select the **Release** workflow
3. Click **Run workflow**
4. Enter the tag name (e.g., `v1.0.0`)
5. Click **Run workflow**

### Release Pipeline Features

#### 🔄 Automatic Triggers
- **Tag-based releases**: Automatically triggers on semantic version tags (`v*.*.*`)
- **Manual dispatch**: Can be triggered manually through GitHub Actions UI

#### 🏗️ Build Process
- **Node.js setup**: Configures Node.js 18 with npm caching
- **Dependency installation**: Installs npm dependencies if `package.json` exists
- **Testing**: Runs tests if test scripts are available
- **Building**: Executes build scripts if available
- **VS Code packaging**: Creates `.vsix` files for VS Code extensions

#### 📋 Artifact Creation
- **VS Code Extension**: Packages as `.vsix` file for marketplace distribution
- **Source archive**: Creates compressed source code archive
- **Built artifacts**: Includes compiled/built files if available

#### 📝 Release Management
- **Automatic release notes**: Generates changelog from git commits
- **Asset uploads**: Attaches all build artifacts to the GitHub release
- **Pre-release detection**: Marks releases as pre-release if tag contains hyphens

#### 🚀 Marketplace Publishing
- **VS Code Marketplace**: Publishes to Microsoft's official marketplace
- **Open VSX Registry**: Publishes to Eclipse Foundation's open marketplace
- **Environment protection**: Uses GitHub environments for secure publishing

### Configuration

#### Required Secrets for Marketplace Publishing

To enable automatic publishing to marketplaces, configure these secrets in your GitHub repository:

1. **Create a GitHub Environment** named `marketplace`:
   - Go to Settings → Environments → New environment
   - Name it `marketplace`
   - Add deployment protection rules if desired

2. **Add Marketplace Secrets** to the `marketplace` environment:
   - `VSCE_PAT`: Personal Access Token for VS Code Marketplace
   - `OVSX_PAT`: Personal Access Token for Open VSX Registry

#### Getting Marketplace Tokens

**VS Code Marketplace (VSCE_PAT):**
1. Go to https://dev.azure.com/
2. Create a Personal Access Token with `Marketplace (publish)` scope
3. Add it as `VSCE_PAT` secret

**Open VSX Registry (OVSX_PAT):**
1. Go to https://open-vsx.org/
2. Sign in and go to your user settings
3. Generate an access token
4. Add it as `OVSX_PAT` secret

### Workflow Jobs

The release pipeline consists of three main jobs:

#### 1. Build (`build`)
- Sets up the build environment
- Installs dependencies and runs tests
- Packages VS Code extension if applicable
- Creates distribution archives
- Uploads artifacts for subsequent jobs

#### 2. Release (`release`)
- Downloads build artifacts
- Generates release notes from git history
- Creates GitHub release with all artifacts
- Marks pre-releases automatically

#### 3. Publish to VS Code Marketplace (`publish-vscode`)
- Only runs for VS Code extensions
- Requires the `marketplace` environment
- Publishes to both VS Code Marketplace and Open VSX Registry
- Includes safety checks for missing tokens

### Version Management

The pipeline supports semantic versioning with the following format:
- `v1.0.0` - Major release
- `v1.0.1` - Patch release
- `v1.1.0-beta.1` - Pre-release (marked as pre-release in GitHub)

### Project Structure

For optimal pipeline functionality, organize your project as follows:

```
├── .github/
│   └── workflows/
│       └── release.yml          # Release pipeline
├── src/                         # Source code
├── out/                         # Compiled output (created by build)
├── test/                        # Tests
├── package.json                 # Project configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

### Customization

The release pipeline is designed to be flexible and can be customized for different project types:

- **Non-VS Code projects**: Will skip VSIX packaging but still create releases
- **Different build tools**: Modify the build steps in the workflow
- **Additional platforms**: Add matrix builds for multiple OS/architectures
- **Custom artifacts**: Modify the artifact creation steps

### Troubleshooting

#### Common Issues

1. **Build failures**: Check that your `package.json` scripts are correct
2. **Missing artifacts**: Ensure build outputs are in expected directories (`out/`, `dist/`, `build/`)
3. **Marketplace publishing fails**: Verify that tokens are correctly configured in the `marketplace` environment
4. **Release not created**: Ensure the tag follows semantic versioning (`v*.*.*`)

#### Debugging

- Check the Actions tab for detailed logs
- Verify that all required files are committed
- Ensure package.json version matches the git tag
- Test builds locally before pushing tags

## Development

### Prerequisites

- Node.js 18 or later
- npm or yarn
- VS Code (for extension development)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/AnywhereAiOps/CapCop.git
   cd CapCop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Create a pull request

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.