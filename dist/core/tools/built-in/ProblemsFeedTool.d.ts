import { ToolAdapter, ToolResult, ToolExecutionContext } from '../ToolAdapter';
export declare class ProblemsFeedTool implements ToolAdapter {
    readonly id = "problems_feed";
    readonly displayName = "Problems Feed";
    readonly description = "Get workspace diagnostics/problems (errors, warnings, info)";
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
    private severityToString;
    private matchesPattern;
    private formatRange;
    execute(args: any, _context: ToolExecutionContext): Promise<ToolResult>;
}
