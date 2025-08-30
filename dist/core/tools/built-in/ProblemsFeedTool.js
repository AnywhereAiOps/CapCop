import * as vscode from 'vscode';
export class ProblemsFeedTool {
    id = 'problems_feed';
    displayName = 'Problems Feed';
    description = 'Get workspace diagnostics/problems (errors, warnings, info)';
    getSchema() {
        return {
            type: 'function',
            function: {
                name: this.id,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        severity: {
                            type: 'string',
                            description: 'Filter by severity level',
                            enum: ['error', 'warning', 'information', 'hint']
                        },
                        path: {
                            type: 'string',
                            description: 'Filter by file path pattern (glob pattern)'
                        },
                        source: {
                            type: 'string',
                            description: 'Filter by diagnostic source (e.g., "typescript", "eslint")'
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of problems to return (default: 100)'
                        }
                    },
                    required: []
                }
            }
        };
    }
    validateArgs(args) {
        if (args && typeof args !== 'object') {
            return { valid: false, error: 'Arguments must be an object' };
        }
        if (args?.severity && !['error', 'warning', 'information', 'hint'].includes(args.severity)) {
            return { valid: false, error: 'Severity must be one of: error, warning, information, hint' };
        }
        if (args?.path && typeof args.path !== 'string') {
            return { valid: false, error: 'Path must be a string' };
        }
        if (args?.source && typeof args.source !== 'string') {
            return { valid: false, error: 'Source must be a string' };
        }
        if (args?.maxResults && (typeof args.maxResults !== 'number' || args.maxResults < 1)) {
            return { valid: false, error: 'MaxResults must be a positive number' };
        }
        return { valid: true };
    }
    isAvailable(_context) {
        // Always available - diagnostics can exist even without workspace
        return true;
    }
    severityToString(severity) {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return 'error';
            case vscode.DiagnosticSeverity.Warning:
                return 'warning';
            case vscode.DiagnosticSeverity.Information:
                return 'information';
            case vscode.DiagnosticSeverity.Hint:
                return 'hint';
            default:
                return 'unknown';
        }
    }
    matchesPattern(path, pattern) {
        if (!pattern)
            return true;
        // Simple glob pattern matching
        const regexPattern = pattern
            .replace(/\*\*/g, '.*') // ** matches any path
            .replace(/\*/g, '[^/]*') // * matches any filename characters
            .replace(/\?/g, '[^/]'); // ? matches single character
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
    }
    formatRange(range) {
        if (range.start.line === range.end.line) {
            if (range.start.character === range.end.character) {
                return `${range.start.line + 1}:${range.start.character + 1}`;
            }
            else {
                return `${range.start.line + 1}:${range.start.character + 1}-${range.end.character + 1}`;
            }
        }
        else {
            return `${range.start.line + 1}:${range.start.character + 1}-${range.end.line + 1}:${range.end.character + 1}`;
        }
    }
    async execute(args, _context) {
        try {
            const { severity, path: pathPattern, source: sourceFilter, maxResults = 100 } = args || {};
            const problems = [];
            // Get all diagnostics
            const diagnostics = vscode.languages.getDiagnostics();
            for (const [uri, diagnosticArray] of diagnostics) {
                const relativePath = vscode.workspace.asRelativePath(uri);
                // Filter by path pattern
                if (pathPattern && !this.matchesPattern(relativePath, pathPattern)) {
                    continue;
                }
                for (const diagnostic of diagnosticArray) {
                    // Filter by severity
                    if (severity && this.severityToString(diagnostic.severity) !== severity) {
                        continue;
                    }
                    // Filter by source
                    if (sourceFilter && diagnostic.source !== sourceFilter) {
                        continue;
                    }
                    // Process related information
                    const relatedInfo = diagnostic.relatedInformation?.map(info => ({
                        uri: info.location.uri.toString(),
                        range: this.formatRange(info.location.range),
                        message: info.message
                    }));
                    const problem = {
                        uri: uri.toString(),
                        path: relativePath,
                        severity: this.severityToString(diagnostic.severity),
                        source: diagnostic.source || 'unknown',
                        message: diagnostic.message,
                        range: this.formatRange(diagnostic.range),
                    };
                    if (diagnostic.code) {
                        problem.code = typeof diagnostic.code === 'object' ? diagnostic.code.value : diagnostic.code;
                    }
                    if (relatedInfo) {
                        problem.relatedInformation = relatedInfo;
                    }
                    problems.push(problem);
                    // Stop if we've reached max results
                    if (problems.length >= maxResults) {
                        break;
                    }
                }
                if (problems.length >= maxResults) {
                    break;
                }
            }
            // Sort by severity (errors first), then by path, then by line number
            problems.sort((a, b) => {
                const severityOrder = { error: 0, warning: 1, information: 2, hint: 3 };
                const aSeverity = severityOrder[a.severity] ?? 4;
                const bSeverity = severityOrder[b.severity] ?? 4;
                if (aSeverity !== bSeverity) {
                    return aSeverity - bSeverity;
                }
                if (a.path !== b.path) {
                    return a.path.localeCompare(b.path);
                }
                // Extract line numbers for comparison
                const aLine = parseInt(a.range.split(':')[0]) || 0;
                const bLine = parseInt(b.range.split(':')[0]) || 0;
                return aLine - bLine;
            });
            // Get summary statistics
            const summary = {
                total: problems.length,
                errors: problems.filter(p => p.severity === 'error').length,
                warnings: problems.filter(p => p.severity === 'warning').length,
                information: problems.filter(p => p.severity === 'information').length,
                hints: problems.filter(p => p.severity === 'hint').length,
                affectedFiles: [...new Set(problems.map(p => p.path))].length,
                sources: [...new Set(problems.map(p => p.source))].sort()
            };
            return {
                success: true,
                data: {
                    problems,
                    summary,
                    filters: {
                        severity,
                        path: pathPattern,
                        source: sourceFilter,
                        maxResults
                    },
                    truncated: diagnostics.length > 0 && problems.length >= maxResults
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get problems: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
}
//# sourceMappingURL=ProblemsFeedTool.js.map