import { ToolAdapter, ToolResult, ToolExecutionContext } from '../ToolAdapter';
export declare class ReadFileTool implements ToolAdapter {
    readonly id = "read_file";
    readonly displayName = "Read File";
    readonly description = "Read the contents of a file from the workspace";
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
    execute(args: any, _context: ToolExecutionContext): Promise<ToolResult>;
}
