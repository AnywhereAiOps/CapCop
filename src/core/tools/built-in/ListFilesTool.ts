import * as vscode from 'vscode';
import { ToolAdapter, ToolResult, ToolExecutionContext } from '../ToolAdapter';

export class ListFilesTool implements ToolAdapter {
    readonly id = 'list_files';
    readonly displayName = 'List Files';
    readonly description = 'List files and directories in the workspace or a specific path';

    getSchema() {
        return {
            type: 'function' as const,
            function: {
                name: this.id,
                description: this.description,
                parameters: {
                    type: 'object' as const,
                    properties: {
                        path: {
                            type: 'string',
                            description: 'The relative path to list (default: workspace root)'
                        },
                        recursive: {
                            type: 'boolean',
                            description: 'Whether to list files recursively (default: false)'
                        },
                        includeHidden: {
                            type: 'boolean',
                            description: 'Whether to include hidden files/directories (default: false)'
                        },
                        maxDepth: {
                            type: 'number',
                            description: 'Maximum depth for recursive listing (default: 10)'
                        },
                        pattern: {
                            type: 'string',
                            description: 'Glob pattern to filter files (e.g., "*.ts", "**/*.json")'
                        }
                    } as Record<string, any>,
                    required: []
                }
            }
        };
    }

    validateArgs(args: any): { valid: boolean; error?: string } {
        if (args && typeof args !== 'object') {
            return { valid: false, error: 'Arguments must be an object' };
        }

        if (args?.path && typeof args.path !== 'string') {
            return { valid: false, error: 'Path must be a string' };
        }

        if (args?.recursive && typeof args.recursive !== 'boolean') {
            return { valid: false, error: 'Recursive must be a boolean' };
        }

        if (args?.includeHidden && typeof args.includeHidden !== 'boolean') {
            return { valid: false, error: 'IncludeHidden must be a boolean' };
        }

        if (args?.maxDepth && (typeof args.maxDepth !== 'number' || args.maxDepth < 1)) {
            return { valid: false, error: 'MaxDepth must be a positive number' };
        }

        if (args?.pattern && typeof args.pattern !== 'string') {
            return { valid: false, error: 'Pattern must be a string' };
        }

        return { valid: true };
    }

    isAvailable(_context: ToolExecutionContext): boolean {
        // Available when we have a workspace
        return !!vscode.workspace.workspaceFolders?.length;
    }

    private shouldIncludeFile(name: string, includeHidden: boolean): boolean {
        if (!includeHidden && name.startsWith('.')) {
            return false;
        }
        return true;
    }

    private matchesPattern(path: string, pattern?: string): boolean {
        if (!pattern) return true;
        
        // Simple glob pattern matching
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')  // ** matches any path
            .replace(/\*/g, '[^/]*')  // * matches any filename characters
            .replace(/\?/g, '[^/]');  // ? matches single character
        
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
    }

    private async listDirectory(
        dirUri: vscode.Uri,
        relativePath: string,
        recursive: boolean,
        includeHidden: boolean,
        maxDepth: number,
        currentDepth: number,
        pattern?: string
    ): Promise<Array<{ name: string; type: 'file' | 'directory'; path: string; size?: number }>> {
        const results: Array<{ name: string; type: 'file' | 'directory'; path: string; size?: number }> = [];

        if (currentDepth >= maxDepth) {
            return results;
        }

        try {
            const entries = await vscode.workspace.fs.readDirectory(dirUri);
            
            for (const [name, type] of entries) {
                if (!this.shouldIncludeFile(name, includeHidden)) {
                    continue;
                }

                const itemPath = relativePath ? `${relativePath}/${name}` : name;
                const itemUri = vscode.Uri.joinPath(dirUri, name);

                if (type === vscode.FileType.File) {
                    if (this.matchesPattern(itemPath, pattern)) {
                        try {
                            const stat = await vscode.workspace.fs.stat(itemUri);
                            results.push({
                                name,
                                type: 'file',
                                path: itemPath,
                                size: stat.size
                            });
                        } catch {
                            // If we can't stat the file, include it without size
                            results.push({
                                name,
                                type: 'file',
                                path: itemPath
                            });
                        }
                    }
                } else if (type === vscode.FileType.Directory) {
                    // Always include directory in results
                    if (this.matchesPattern(itemPath, pattern) || !pattern || pattern.includes('/')) {
                        results.push({
                            name,
                            type: 'directory',
                            path: itemPath
                        });
                    }

                    // Recurse into directory if requested
                    if (recursive) {
                        const subResults = await this.listDirectory(
                            itemUri,
                            itemPath,
                            recursive,
                            includeHidden,
                            maxDepth,
                            currentDepth + 1,
                            pattern
                        );
                        results.push(...subResults);
                    }
                }
            }
        } catch (error) {
            // Directory might not be accessible, skip it
            console.warn(`Cannot read directory ${dirUri.toString()}: ${error}`);
        }

        return results;
    }

    async execute(args: any, _context: ToolExecutionContext): Promise<ToolResult> {
        try {
            const { 
                path = '',
                recursive = false,
                includeHidden = false,
                maxDepth = 10,
                pattern
            } = args || {};
            
            // Resolve the directory path relative to workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return {
                    success: false,
                    error: 'No workspace folder is open'
                };
            }

            // Use the first workspace folder as base
            const workspaceUri = workspaceFolders[0]!.uri;
            const targetUri = path ? vscode.Uri.joinPath(workspaceUri, path) : workspaceUri;

            // Check if target path exists and is a directory
            try {
                const stat = await vscode.workspace.fs.stat(targetUri);
                if (stat.type !== vscode.FileType.Directory) {
                    return {
                        success: false,
                        error: `Path "${path}" is not a directory`
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    error: `Path "${path}" does not exist or is not accessible`
                };
            }

            // List directory contents
            const files = await this.listDirectory(
                targetUri,
                '',
                recursive,
                includeHidden,
                maxDepth,
                0,
                pattern
            );

            // Sort results: directories first, then files, both alphabetically
            files.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            return {
                success: true,
                data: {
                    path: path || '/',
                    files,
                    totalFiles: files.filter(f => f.type === 'file').length,
                    totalDirectories: files.filter(f => f.type === 'directory').length,
                    recursive,
                    includeHidden,
                    pattern
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to list files: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
}
