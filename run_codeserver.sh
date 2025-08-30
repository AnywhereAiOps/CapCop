#!/bin/bash

# CapCop Code Server Development Setup
# Alternative to VS Code Web using code-server for more reliable extension testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT=${PORT:-8080}
EXTENSION_NAME="capcop"

echo -e "${BLUE}🚀 CapCop Code-Server Development Setup${NC}"
echo -e "${BLUE}======================================${NC}"

# Check if code-server is installed
if ! command -v code-server &> /dev/null; then
    echo -e "${YELLOW}📦 Installing code-server...${NC}"
    curl -fsSL https://code-server.dev/install.sh | sh
    # Ensure code-server is in PATH
    export PATH="$HOME/.local/bin:$PATH"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed.${NC}"
    echo -e "${YELLOW}Please install Node.js from https://nodejs.org${NC}"
    exit 1
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Build the extension
echo -e "${YELLOW}🔨 Building extension...${NC}"
npm run build

# Package the extension
echo -e "${YELLOW}📦 Packaging extension...${NC}"
if ! command -v vsce &> /dev/null; then
    echo -e "${YELLOW}📦 Installing VSCE...${NC}"
    npx --yes @vscode/vsce --version >/dev/null 2>&1 || true
    VSCE="npx @vscode/vsce"
else
    VSCE="vsce"
fi

# Clean old packages
rm -f ${EXTENSION_NAME}-*.vsix

# Package extension with explicit output name
$VSCE package -o "${EXTENSION_NAME}.vsix"
VSIX_FILE="${EXTENSION_NAME}.vsix"

if [ ! -f "$VSIX_FILE" ]; then
    echo -e "${RED}❌ Failed to create .vsix package${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Extension packaged: $VSIX_FILE${NC}"

# Create test workspace if it doesn't exist
TEST_WORKSPACE="test-workspace"
if [ ! -d "$TEST_WORKSPACE" ]; then
    mkdir -p "$TEST_WORKSPACE"
    echo "# CapCop Test Workspace

Welcome to the CapCop test environment!

## Test Cases
1. **File Operations**: Try reading this file with @file
2. **Directory Listing**: Use @folder to explore the project
3. **Problem Detection**: Use @problems to find issues
4. **URL Fetching**: Test @url with documentation links

## Sample Code
\`\`\`javascript
function greet(name) {
    console.log('Hello, ' + name + '!');
}

// TODO: Add error handling
greet('CapCop');
\`\`\`

## Extension Commands to Test
- Open Command Palette (Cmd/Ctrl+Shift+P)
- Run 'CapCop: Open' to open the sidebar
- Try 'CapCop: Start New Chat' for a fresh session
" > "$TEST_WORKSPACE/README.md"

    echo "const express = require('express');
const app = express();

// Missing error handling - should show up in @problems
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Unused variable - should show as warning
const unusedVar = 'test';

app.listen(3000);" > "$TEST_WORKSPACE/server.js"
fi

echo -e "${YELLOW}🔧 Installing extension into code-server...${NC}"
# Uninstall any existing version first
code-server --uninstall-extension capcop.capcop 2>/dev/null || true
code-server --install-extension "./${VSIX_FILE}"

echo -e "${BLUE}🌐 Starting code-server in background...${NC}"
LOG_FILE="code-server.log"
PID_FILE="code-server.pid"

# Start code-server in background
nohup code-server \
    --bind-addr="0.0.0.0:${PORT}" \
    --auth=none \
    --disable-telemetry \
    "${TEST_WORKSPACE}" > "${LOG_FILE}" 2>&1 &

echo $! > "${PID_FILE}"
echo -e "${GREEN}🆔 code-server PID: $(cat ${PID_FILE})${NC}"
echo -e "${BLUE}🗒️  Logs: ${LOG_FILE}${NC}"

echo -n "⏳ Waiting for server to become ready"
STATUS=""
for i in {1..60}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORT}/" 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ] || [ "$STATUS" = "302" ]; then
        echo ""
        echo -e "${GREEN}✅ Ready: http://localhost:${PORT}${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

if [ "$STATUS" != "200" ] && [ "$STATUS" != "302" ]; then
    echo ""
    echo -e "${RED}❌ code-server did not become ready within timeout${NC}"
    echo "Last 10 log lines:"
    tail -n 10 "${LOG_FILE}" 2>/dev/null || echo "No logs available"
    exit 1
fi

echo ""
echo -e "${GREEN}🔗 Access code-server at:${NC}"
echo -e "   ${YELLOW}Local:${NC}    http://localhost:${PORT}"
echo ""
echo -e "${BLUE}📝 Extension should be pre-installed and ready!${NC}"
echo -e "   Look for CapCop robot icon in the Activity Bar"
echo ""
echo -e "${YELLOW}🔎 Verify with:${NC} curl -s -I http://localhost:${PORT} | head -1"
echo -e "${YELLOW}📜 Follow logs:${NC} tail -f ${LOG_FILE}"
echo -e "${YELLOW}🛑 Stop server:${NC} kill \$(cat ${PID_FILE}) && rm ${PID_FILE}"
