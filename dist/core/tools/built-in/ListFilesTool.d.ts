import { ToolAdapter, ToolResult, ToolExecutionContext } from '../ToolAdapter';
export declare class ListFilesTool implements ToolAdapter {
    readonly id = "list_files";
    readonly displayName = "List Files";
    readonly description = "List files and directories in the workspace or a specific path";
    getSchema(): {
        type: "function";
        function: {
            name: string;
            description: string;
            parameters: {
                type: "object";
                properties: Record<string, any>;
                required: never[];
            };
        };
    };
    validateArgs(args: any): {
        valid: boolean;
        error?: string;
    };
    isAvailable(_context: ToolExecutionContext): boolean;
    private shouldIncludeFile;
    private matchesPattern;
    private listDirectory;
    execute(args: any, _context: ToolExecutionContext): Promise<ToolResult>;
}
