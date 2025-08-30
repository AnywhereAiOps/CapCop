import { ToolAdapter, ToolResult, ToolExecutionContext } from './ToolAdapter';
import { ReadFileTool } from './built-in/ReadFileTool';
import { WriteFileTool } from './built-in/WriteFileTool';
import { ListFilesTool } from './built-in/ListFilesTool';
import { ProblemsFeedTool } from './built-in/ProblemsFeedTool';
import { FetchUrlTool } from './built-in/FetchUrlTool';

export class ToolRegistry {
    private tools = new Map<string, ToolAdapter>();

    async initializeBuiltinTools(): Promise<void> {
        // Register all built-in tools
        const builtinTools = [
            new ReadFileTool(),
            new WriteFileTool(),
            new ListFilesTool(),
            new ProblemsFeedTool(),
            new FetchUrlTool()
        ];

        for (const tool of builtinTools) {
            this.registerTool(tool);
        }

        console.log(`Initialized ${builtinTools.length} built-in tools: ${builtinTools.map(t => t.id).join(', ')}`);
    }

    registerTool(tool: ToolAdapter): void {
        this.tools.set(tool.id, tool);
    }

    getTool(toolId: string): ToolAdapter | undefined {
        return this.tools.get(toolId);
    }

    getTools(): ToolAdapter[] {
        return Array.from(this.tools.values());
    }

    getAvailableTools(context: ToolExecutionContext): ToolAdapter[] {
        return this.getTools().filter(tool => 
            !tool.isAvailable || tool.isAvailable(context)
        );
    }

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
    }> {
        const availableTools = context ? this.getAvailableTools(context) : this.getTools();
        return availableTools.map(tool => tool.getSchema());
    }

    async executeTool(toolId: string, args: any, context: ToolExecutionContext): Promise<ToolResult> {
        const tool = this.getTool(toolId);
        if (!tool) {
            return {
                success: false,
                error: `Tool '${toolId}' not found`
            };
        }

        // Check if tool is available in current context
        if (tool.isAvailable && !tool.isAvailable(context)) {
            return {
                success: false,
                error: `Tool '${toolId}' is not available in current context`
            };
        }

        // Validate arguments if validator exists
        if (tool.validateArgs) {
            const validation = tool.validateArgs(args);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Invalid arguments for tool '${toolId}': ${validation.error}`
                };
            }
        }

        try {
            return await tool.execute(args, context);
        } catch (error) {
            return {
                success: false,
                error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
                metadata: { originalError: error }
            };
        }
    }

    unregisterTool(toolId: string): boolean {
        return this.tools.delete(toolId);
    }

    clearTools(): void {
        this.tools.clear();
    }

    getToolCount(): number {
        return this.tools.size;
    }

    getToolIds(): string[] {
        return Array.from(this.tools.keys());
    }
}
