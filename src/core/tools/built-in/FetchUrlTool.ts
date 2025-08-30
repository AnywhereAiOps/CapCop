import { ToolAdapter, ToolResult, ToolExecutionContext } from '../ToolAdapter';

export class FetchUrlTool implements ToolAdapter {
    readonly id = 'fetch_url';
    readonly displayName = 'Fetch URL';
    readonly description = 'Fetch content from a URL and optionally convert HTML to markdown';

    getSchema() {
        return {
            type: 'function' as const,
            function: {
                name: this.id,
                description: this.description,
                parameters: {
                    type: 'object' as const,
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The URL to fetch content from'
                        },
                        convertToMarkdown: {
                            type: 'boolean',
                            description: 'Convert HTML content to markdown (default: true)'
                        },
                        timeout: {
                            type: 'number',
                            description: 'Request timeout in milliseconds (default: 10000)'
                        },
                        followRedirects: {
                            type: 'boolean',
                            description: 'Follow HTTP redirects (default: true)'
                        },
                        headers: {
                            type: 'object',
                            description: 'Additional HTTP headers to send'
                        }
                    } as Record<string, any>,
                    required: ['url']
                }
            }
        };
    }

    validateArgs(args: any): { valid: boolean; error?: string } {
        if (!args || typeof args !== 'object') {
            return { valid: false, error: 'Arguments must be an object' };
        }

        if (!args.url || typeof args.url !== 'string') {
            return { valid: false, error: 'URL is required and must be a string' };
        }

        // Basic URL validation
        try {
            new URL(args.url);
        } catch {
            return { valid: false, error: 'URL must be a valid URL' };
        }

        if (args.convertToMarkdown !== undefined && typeof args.convertToMarkdown !== 'boolean') {
            return { valid: false, error: 'ConvertToMarkdown must be a boolean' };
        }

        if (args.timeout !== undefined && (typeof args.timeout !== 'number' || args.timeout < 1)) {
            return { valid: false, error: 'Timeout must be a positive number' };
        }

        if (args.followRedirects !== undefined && typeof args.followRedirects !== 'boolean') {
            return { valid: false, error: 'FollowRedirects must be a boolean' };
        }

        if (args.headers !== undefined && (typeof args.headers !== 'object' || Array.isArray(args.headers))) {
            return { valid: false, error: 'Headers must be an object' };
        }

        return { valid: true };
    }

    isAvailable(_context: ToolExecutionContext): boolean {
        // Available when we have internet connectivity (assume we do in web context)
        return true;
    }

    private htmlToMarkdown(html: string): string {
        // Simple HTML to Markdown conversion
        // This is a basic implementation - in production you might want to use a proper library
        let markdown = html;

        // Remove script and style tags completely
        markdown = markdown.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
        
        // Convert headings
        markdown = markdown.replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_match, level, content) => {
            const hashes = '#'.repeat(parseInt(level));
            return `\n${hashes} ${this.stripTags(content).trim()}\n`;
        });
        
        // Convert paragraphs
        markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, (_match, content) => {
            return `\n${this.stripTags(content).trim()}\n`;
        });
        
        // Convert line breaks
        markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
        
        // Convert bold and italic
        markdown = markdown.replace(/<(strong|b)[^>]*>(.*?)<\/\1>/gi, '**$2**');
        markdown = markdown.replace(/<(em|i)[^>]*>(.*?)<\/\1>/gi, '*$2*');
        
        // Convert code
        markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
        markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gi, (_match, content) => {
            return `\n\`\`\`\n${this.stripTags(content)}\n\`\`\`\n`;
        });
        
        // Convert links
        markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)');
        
        // Convert images
        markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)');
        markdown = markdown.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/gi, '![$1]($2)');
        markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, '![]($1)');
        
        // Convert lists
        markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, content) => {
            const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
            return `\n${items}`;
        });
        
        markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, content) => {
            let counter = 1;
            const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => {
                return `${counter++}. $1\n`;
            });
            return `\n${items}`;
        });
        
        // Convert blockquotes
        markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, (_match, content) => {
            const lines = this.stripTags(content).trim().split('\n');
            return `\n${lines.map(line => `> ${line}`).join('\n')}\n`;
        });
        
        // Convert tables (basic)
        markdown = markdown.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match, content) => {
            // This is a very basic table conversion
            const rows = content.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
            if (rows.length === 0) return '';
            
            let table = '\n';
            rows.forEach((row: string, index: number) => {
                const cells = row.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
                const cellContents = cells.map((cell: string) => {
                    return this.stripTags(cell.replace(/<\/?(?:th|td)[^>]*>/gi, '')).trim();
                });
                
                table += `| ${cellContents.join(' | ')} |\n`;
                
                // Add separator after header row
                if (index === 0) {
                    table += `| ${cellContents.map(() => '---').join(' | ')} |\n`;
                }
            });
            
            return table + '\n';
        });
        
        // Remove remaining HTML tags
        markdown = this.stripTags(markdown);
        
        // Clean up extra whitespace
        markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
        markdown = markdown.replace(/^\s+|\s+$/g, '');
        
        return markdown;
    }

    private stripTags(html: string): string {
        return html.replace(/<[^>]*>/g, '');
    }

    private async fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    async execute(args: any, _context: ToolExecutionContext): Promise<ToolResult> {
        try {
            const {
                url,
                convertToMarkdown = true,
                timeout = 10000,
                followRedirects = true,
                headers = {}
            } = args;

            // Prepare fetch options
            const fetchOptions: RequestInit = {
                method: 'GET',
                headers: {
                    'User-Agent': 'CapCop-VSCode-Extension/1.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    ...headers
                },
                redirect: followRedirects ? 'follow' : 'manual'
            };

            // Fetch the URL
            const response = await this.fetchWithTimeout(url, fetchOptions, timeout);

            if (!response.ok) {
                return {
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`
                };
            }

            // Get content type
            const contentType = response.headers.get('content-type') || '';
            const isHTML = contentType.includes('text/html');
            
            // Read response text
            const content = await response.text();
            
            // Convert to markdown if requested and content is HTML
            let processedContent = content;
            if (convertToMarkdown && isHTML) {
                processedContent = this.htmlToMarkdown(content);
            }

            return {
                success: true,
                data: {
                    url,
                    status: response.status,
                    statusText: response.statusText,
                    contentType,
                    content: processedContent,
                    originalContent: isHTML && convertToMarkdown ? content : undefined,
                    isHTML,
                    convertedToMarkdown: convertToMarkdown && isHTML,
                    size: content.length,
                    headers: (() => {
                        const headersObj: Record<string, string> = {};
                        response.headers.forEach((value, key) => {
                            headersObj[key] = value;
                        });
                        return headersObj;
                    })()
                }
            };

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return {
                    success: false,
                    error: `Request timed out after ${args.timeout || 10000}ms`
                };
            }
            
            return {
                success: false,
                error: `Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
}
