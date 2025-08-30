import { ToolAdapter, ToolResult, ToolExecutionContext } from '../ToolAdapter';
export declare class WriteFileTool implements ToolAdapter {
    readonly id = "write_file";
    readonly displayName = "Write File";
    readonly description = "Write content to a file with diff preview and user approval";
    getSchema(): {
        type: "function";
        function: {
            name: string;
            description: string;
            parameters: {
                type: "object";
                properties: Record<string, any>;
                required: string[];
            };
        };
    };
    validateArgs(args: any): {
        valid: boolean;
        error?: string;
    };
    isAvailable(_context: ToolExecutionContext): boolean;
    private generateDiff;
    execute(args: any, _context: ToolExecutionContext): Promise<ToolResult>;
}
