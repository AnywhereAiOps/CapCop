import { ToolAdapter, ToolResult, ToolExecutionContext } from '../ToolAdapter';
export declare class FetchUrlTool implements ToolAdapter {
    readonly id = "fetch_url";
    readonly displayName = "Fetch URL";
    readonly description = "Fetch content from a URL and optionally convert HTML to markdown";
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
    private htmlToMarkdown;
    private stripTags;
    private fetchWithTimeout;
    execute(args: any, _context: ToolExecutionContext): Promise<ToolResult>;
}
