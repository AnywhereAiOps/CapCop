import { ToolAdapter, ToolResult, ToolExecutionContext } from './ToolAdapter';
export declare class ToolRegistry {
    private tools;
    initializeBuiltinTools(): Promise<void>;
    registerTool(tool: ToolAdapter): void;
    getTool(toolId: string): ToolAdapter | undefined;
    getTools(): ToolAdapter[];
    getAvailableTools(context: ToolExecutionContext): ToolAdapter[];
    getToolSchemas(context?: ToolExecutionContext): Array<{
        type: 'function';
        function: {
            name: string;
            description: string;
            parameters: {
                type: 'object';
                properties: Record<string, any>;
                required?: string[];
            };
        };
    }>;
    executeTool(toolId: string, args: any, context: ToolExecutionContext): Promise<ToolResult>;
    unregisterTool(toolId: string): boolean;
    clearTools(): void;
    getToolCount(): number;
    getToolIds(): string[];
}
