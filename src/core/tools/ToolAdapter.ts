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
    
    // Tool schema for LLM integration
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
    
    // Execute the tool
    execute(args: any, context: ToolExecutionContext): Promise<ToolResult>;
    
    // Validate arguments before execution
    validateArgs?(args: any): { valid: boolean; error?: string };
    
    // Check if tool is available in current context
    isAvailable?(context: ToolExecutionContext): boolean;
}
