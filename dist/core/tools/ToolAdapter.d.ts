export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: Record<string, any>;
}
export interface ToolExecutionContext {
    sessionId: string;
    workspaceUri?: string;
    userId?: string;
}
export interface ToolAdapter {
    id: string;
    displayName: string;
    description: string;
    getSchema(): {
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
    };
    execute(args: any, context: ToolExecutionContext): Promise<ToolResult>;
    validateArgs?(args: any): {
        valid: boolean;
        error?: string;
    };
    isAvailable?(context: ToolExecutionContext): boolean;
}
