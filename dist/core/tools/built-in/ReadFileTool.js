import * as vscode from 'vscode';
export class ReadFileTool {
    id = 'read_file';
    displayName = 'Read File';
    description = 'Read the contents of a file from the workspace';
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
                            description: 'The relative path to the file to read'
                        },
                        encoding: {
                            type: 'string',
                            description: 'Text encoding to use (default: utf8)',
                            enum: ['utf8', 'base64']
                        }
                    },
                    required: ['path']
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
        if (args.encoding && !['utf8', 'base64'].includes(args.encoding)) {
            return { valid: false, error: 'Encoding must be either "utf8" or "base64"' };
        }
        return { valid: true };
    }
    isAvailable(_context) {
        // Available when we have a workspace
        return !!vscode.workspace.workspaceFolders?.length;
    }
    async execute(args, _context) {
        try {
            const { path, encoding = 'utf8' } = args;
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
            // Check if file exists
            try {
                const stat = await vscode.workspace.fs.stat(fileUri);
                if (stat.type === vscode.FileType.Directory) {
                    return {
                        success: false,
                        error: `Path "${path}" is a directory, not a file`
                    };
                }
            }
            catch (error) {
                return {
                    success: false,
                    error: `File "${path}" does not exist or is not accessible`
                };
            }
            // Read file contents
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            let content;
            if (encoding === 'base64') {
                content = Buffer.from(fileData).toString('base64');
            }
            else {
                content = new TextDecoder('utf-8').decode(fileData);
            }
            return {
                success: true,
                data: {
                    path,
                    content,
                    encoding,
                    size: fileData.length,
                    uri: fileUri.toString()
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
}
//# sourceMappingURL=ReadFileTool.js.map