#!/bin/bash

# CapCop Local Development Server
# Runs VS Code Web locally with the extension loaded

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT=${PORT:-8080}
HOST=${HOST:-0.0.0.0}

echo -e "${BLUE}🚀 CapCop Local Development Server${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is required but not installed.${NC}"
    echo -e "${YELLOW}Please install Node.js from https://nodejs.org${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is required but not installed.${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Build the extension if dist folder doesn't exist or is outdated
if [ ! -d "dist" ] || [ "src" -nt "dist" ] || [ "package.json" -nt "dist" ]; then
    echo -e "${YELLOW}🔨 Building extension...${NC}"
    npm run build
fi

# Check if @vscode/test-web is available
if ! npm list @vscode/test-web &> /dev/null; then
    echo -e "${YELLOW}📦 Installing VS Code Web test runner...${NC}"
    npm install --save-dev @vscode/test-web
fi

# Get local IP addresses
LOCAL_IPS=$(ifconfig 2>/dev/null | grep -E "inet [0-9]" | grep -v 127.0.0.1 | awk '{print $2}' | head -3)
if [ -z "$LOCAL_IPS" ]; then
    # Fallback for Linux systems
    LOCAL_IPS=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
fi

echo -e "${GREEN}✅ Extension built successfully${NC}"
echo -e "${BLUE}🌐 Starting VS Code Web server...${NC}"
echo ""
echo -e "${GREEN}🔗 Access VS Code Web at:${NC}"
echo -e "   ${YELLOW}Local:${NC}    http://localhost:${PORT}"

# Display network IPs
for ip in $LOCAL_IPS; do
    if [ "$ip" != "localhost" ]; then
        echo -e "   ${YELLOW}Network:${NC}  http://${ip}:${PORT}"
    fi
done

echo ""
echo -e "${BLUE}📝 Extension will be automatically loaded${NC}"
echo -e "${BLUE}💡 Open the Command Palette (Cmd/Ctrl+Shift+P) and run 'CapCop: Open' to start${NC}"
echo ""
echo -e "${RED}Press Ctrl+C to stop the server${NC}"
echo ""

# Create a temporary folder structure for testing
TEST_WORKSPACE="test-workspace"
if [ ! -d "$TEST_WORKSPACE" ]; then
    mkdir -p "$TEST_WORKSPACE"
    echo -e "${YELLOW}# Welcome to CapCop Test Workspace

This is a sample file to test CapCop's functionality.

## Features to Test:
- File reading with @file
- Directory listing with @folder  
- Problem detection with @problems
- URL fetching with @url

Try asking CapCop to:
1. Read this file
2. List the project structure
3. Create a new file
4. Fetch content from a URL
" > "$TEST_WORKSPACE/README.md"
fi

# Start VS Code Web with the extension
npx vscode-test-web \
    --browserType=none \
    --host="$HOST" \
    --port="$PORT" \
    --extensionDevelopmentPath="$(pwd)" \
    --folder-uri="vscode-vfs://github/test/workspace" \
    "$TEST_WORKSPACE" || {
    
    echo -e "${RED}❌ Failed to start VS Code Web server${NC}"
    echo -e "${YELLOW}💡 This could be due to:${NC}"
    echo -e "   • Port $PORT already in use"
    echo -e "   • Missing dependencies"
    echo -e "   • Network connectivity issues"
    echo ""
    echo -e "${YELLOW}🔧 Try these solutions:${NC}"
    echo -e "   • Use a different port: PORT=3000 $0"
    echo -e "   • Kill any running VS Code Web processes: pkill -f vscode-test-web"
    echo -e "   • Check if the port is free: lsof -i :$PORT"
    echo ""
    echo -e "${BLUE}💡 For production testing, consider using code-server instead${NC}"
    exit 1
}
