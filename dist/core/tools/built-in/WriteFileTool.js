import * as vscode from 'vscode';
export class WriteFileTool {
    id = 'write_file';
    displayName = 'Write File';
    description = 'Write content to a file with diff preview and user approval';
    getSchema() {
        return {
            type: 'function',
            function: {
                name: this.id,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The relative path to the file to write'
                        },
                        content: {
                            type: 'string',
                            description: 'The content to write to the file'
                        },
                        encoding: {
                            type: 'string',
                            description: 'Text encoding to use (default: utf8)',
                            enum: ['utf8', 'base64']
                        },
                        createDirectories: {
                            type: 'boolean',
                            description: 'Create parent directories if they do not exist (default: true)'
                        }
                    },
                    required: ['path', 'content']
                }
            }
        };
    }
    validateArgs(args) {
        if (!args || typeof args !== 'object') {
            return { valid: false, error: 'Arguments must be an object' };
        }
        if (!args.path || typeof args.path !== 'string') {
            return { valid: false, error: 'Path is required and must be a string' };
        }
        if (args.content === undefined || typeof args.content !== 'string') {
            return { valid: false, error: 'Content is required and must be a string' };
        }
        if (args.encoding && !['utf8', 'base64'].includes(args.encoding)) {
            return { valid: false, error: 'Encoding must be either "utf8" or "base64"' };
        }
        return { valid: true };
    }
    isAvailable(_context) {
        // Available when we have a workspace
        return !!vscode.workspace.workspaceFolders?.length;
    }
    generateDiff(originalContent, newContent, filePath) {
        const originalLines = originalContent.split('\n');
        const newLines = newContent.split('\n');
        let diff = `--- ${filePath} (original)\n+++ ${filePath} (modified)\n`;
        // Simple line-by-line diff
        const maxLines = Math.max(originalLines.length, newLines.length);
        let contextStart = -1;
        let hasChanges = false;
        for (let i = 0; i < maxLines; i++) {
            const originalLine = originalLines[i] || '';
            const newLine = newLines[i] || '';
            if (originalLine !== newLine) {
                if (!hasChanges) {
                    // Start of changes - show context
                    contextStart = Math.max(0, i - 3);
                    diff += `@@ -${contextStart + 1},${Math.min(originalLines.length - contextStart, 10)} +${contextStart + 1},${Math.min(newLines.length - contextStart, 10)} @@\n`;
                    // Add context lines before change
                    for (let j = contextStart; j < i; j++) {
                        if (originalLines[j] !== undefined) {
                            diff += ` ${originalLines[j]}\n`;
                        }
                    }
                    hasChanges = true;
                }
                // Show removed lines
                if (i < originalLines.length) {
                    diff += `-${originalLine}\n`;
                }
                // Show added lines
                if (i < newLines.length) {
                    diff += `+${newLine}\n`;
                }
            }
            else if (hasChanges && i - contextStart < 10) {
                // Show context after changes (limited)
                diff += ` ${originalLine}\n`;
            }
        }
        if (!hasChanges) {
            diff += 'No differences found\n';
        }
        return diff;
    }
    async execute(args, _context) {
        try {
            const { path, content, encoding = 'utf8', createDirectories = true } = args;
            // Resolve the file path relative to workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return {
                    success: false,
                    error: 'No workspace folder is open'
                };
            }
            // Use the first workspace folder as base
            const workspaceUri = workspaceFolders[0].uri;
            const fileUri = vscode.Uri.joinPath(workspaceUri, path);
            // Check if file exists and read existing content for diff
            let existingContent = '';
            let fileExists = false;
            try {
                const fileData = await vscode.workspace.fs.readFile(fileUri);
                existingContent = new TextDecoder('utf-8').decode(fileData);
                fileExists = true;
            }
            catch {
                // File doesn't exist, which is fine
            }
            // Generate diff if file exists
            let diffPreview = '';
            if (fileExists) {
                diffPreview = this.generateDiff(existingContent, content, path);
            }
            else {
                diffPreview = `Creating new file: ${path}\n+${content.split('\n').join('\n+')}`;
            }
            // Show diff to user for approval
            const action = await vscode.window.showInformationMessage(`${fileExists ? 'Modify' : 'Create'} file: ${path}`, {
                modal: true,
                detail: `Preview of changes:\n\n${diffPreview.substring(0, 1000)}${diffPreview.length > 1000 ? '\n...(truncated)' : ''}`
            }, 'Approve', 'Reject');
            if (action !== 'Approve') {
                return {
                    success: false,
                    error: 'File write operation was rejected by user',
                    metadata: {
                        userRejected: true,
                        diff: diffPreview
                    }
                };
            }
            // Create parent directories if needed
            if (createDirectories) {
                const parentUri = vscode.Uri.joinPath(fileUri, '..');
                try {
                    await vscode.workspace.fs.createDirectory(parentUri);
                }
                catch {
                    // Directory might already exist, ignore
                }
            }
            // Write file content
            let fileData;
            if (encoding === 'base64') {
                fileData = new Uint8Array(Buffer.from(content, 'base64'));
            }
            else {
                fileData = new TextEncoder().encode(content);
            }
            await vscode.workspace.fs.writeFile(fileUri, fileData);
            // Show success message
            vscode.window.showInformationMessage(`File ${fileExists ? 'modified' : 'created'}: ${path}`);
            return {
                success: true,
                data: {
                    path,
                    size: fileData.length,
                    encoding,
                    created: !fileExists,
                    modified: fileExists,
                    uri: fileUri.toString(),
                    diff: diffPreview
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
}
//# sourceMappingURL=WriteFileTool.js.map