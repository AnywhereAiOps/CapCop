import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { RulesConfig, ProfileConfig, ProfileName, DEFAULT_RULES } from './RulesTypes';

export class RulesLoader {
    private extensionUri: vscode.Uri;
    
    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
    }

    async loadRules(workspaceFolder?: vscode.WorkspaceFolder): Promise<{ rules: Required<RulesConfig>; profile: string; sources: string[] }> {
        const sources: string[] = [];
        let mergedRules: Required<RulesConfig> = { ...DEFAULT_RULES };
        let selectedProfile = 'capcop-default';

        // 1. Load profile defaults first (lowest precedence)
        try {
            const profileConfig = await this.loadProfileConfig(workspaceFolder);
            if (profileConfig?.profile) {
                selectedProfile = profileConfig.profile;
                const profileRules = await this.loadProfileDefaults(profileConfig.profile as ProfileName);
                if (profileRules) {
                    mergedRules = this.mergeRules(mergedRules, profileRules);
                    sources.push(`profile:${profileConfig.profile}`);
                }
            }
        } catch (error) {
            console.warn('Failed to load profile config:', error);
        }

        // 2. Load workspace .capcoprules (if different from project)
        if (workspaceFolder) {
            try {
                const workspaceRules = await this.loadWorkspaceRules();
                if (workspaceRules && Object.keys(workspaceRules).length > 0) {
                    mergedRules = this.mergeRules(mergedRules, workspaceRules);
                    sources.push('workspace:.capcoprules');
                }
            } catch (error) {
                console.warn('Failed to load workspace rules:', error);
            }
        }

        // 3. Load project-local .capcoprules (highest precedence)
        if (workspaceFolder) {
            try {
                const projectRules = await this.loadProjectRules(workspaceFolder);
                if (projectRules && Object.keys(projectRules).length > 0) {
                    mergedRules = this.mergeRules(mergedRules, projectRules);
                    sources.push('project:.capcoprules');
                }
            } catch (error) {
                console.warn('Failed to load project rules:', error);
            }
        }

        return { rules: mergedRules, profile: selectedProfile, sources };
    }

    private async loadProfileConfig(workspaceFolder?: vscode.WorkspaceFolder): Promise<ProfileConfig | null> {
        if (!workspaceFolder) {
            return null;
        }

        const profilePath = vscode.Uri.joinPath(workspaceFolder.uri, '.capcoprules', 'profile.yaml');
        try {
            const content = await vscode.workspace.fs.readFile(profilePath);
            const text = Buffer.from(content).toString('utf8');
            return this.parseYamlOrJson(text) as ProfileConfig;
        } catch {
            // Try JSON
            const profileJsonPath = vscode.Uri.joinPath(workspaceFolder.uri, '.capcoprules', 'profile.json');
            try {
                const content = await vscode.workspace.fs.readFile(profileJsonPath);
                const text = Buffer.from(content).toString('utf8');
                return JSON.parse(text) as ProfileConfig;
            } catch {
                return null;
            }
        }
    }

    private async loadProfileDefaults(profileName: ProfileName): Promise<RulesConfig | null> {
        const profilePath = vscode.Uri.joinPath(this.extensionUri, 'profiles', `${profileName}.defaults.yaml`);
        try {
            const content = await vscode.workspace.fs.readFile(profilePath);
            const text = Buffer.from(content).toString('utf8');
            return this.parseYamlOrJson(text) as RulesConfig;
        } catch (error) {
            console.warn(`Failed to load profile ${profileName}:`, error);
            return null;
        }
    }

    private async loadWorkspaceRules(): Promise<RulesConfig | null> {
        // Load from VS Code settings directory or similar
        // For now, skip workspace-level rules (implement later if needed)
        return null;
    }

    private async loadProjectRules(workspaceFolder: vscode.WorkspaceFolder): Promise<RulesConfig | null> {
        const rulesDir = vscode.Uri.joinPath(workspaceFolder.uri, '.capcoprules');
        
        let mergedRules: RulesConfig = {};

        // Load individual rule files
        const ruleFiles = [
            'allowlists.yaml',
            'allowlists.json',
            'denylists.yaml',
            'denylists.json',
            'behavior.yaml',
            'behavior.json',
            'quotas.yaml',
            'quotas.json'
        ];

        for (const fileName of ruleFiles) {
            try {
                const filePath = vscode.Uri.joinPath(rulesDir, fileName);
                const content = await vscode.workspace.fs.readFile(filePath);
                const text = Buffer.from(content).toString('utf8');
                const rules = this.parseYamlOrJson(text) as RulesConfig;
                if (rules) {
                    mergedRules = this.mergeRules(mergedRules, rules);
                }
            } catch {
                // File doesn't exist or invalid, continue
            }
        }

        // Also try to load a single consolidated rules file
        try {
            const mainRulesPath = vscode.Uri.joinPath(rulesDir, 'rules.yaml');
            const content = await vscode.workspace.fs.readFile(mainRulesPath);
            const text = Buffer.from(content).toString('utf8');
            const rules = this.parseYamlOrJson(text) as RulesConfig;
            if (rules) {
                mergedRules = this.mergeRules(mergedRules, rules);
            }
        } catch {
            // Try JSON version
            try {
                const mainRulesPath = vscode.Uri.joinPath(rulesDir, 'rules.json');
                const content = await vscode.workspace.fs.readFile(mainRulesPath);
                const text = Buffer.from(content).toString('utf8');
                const rules = JSON.parse(text) as RulesConfig;
                if (rules) {
                    mergedRules = this.mergeRules(mergedRules, rules);
                }
            } catch {
                // No main rules file
            }
        }

        return Object.keys(mergedRules).length > 0 ? mergedRules : null;
    }

    private parseYamlOrJson(text: string): any {
        try {
            return yaml.load(text);
        } catch {
            try {
                return JSON.parse(text);
            } catch {
                return null;
            }
        }
    }

    private mergeRules(base: RulesConfig | Required<RulesConfig>, override: RulesConfig): Required<RulesConfig> {
        const result: Required<RulesConfig> = {
            behavior: {
                autoApprove: { ...DEFAULT_RULES.behavior.autoApprove, ...(base.behavior?.autoApprove || {}) }
            },
            permissions: {
                safeCommands: base.permissions?.safeCommands ? [...base.permissions.safeCommands] : [...DEFAULT_RULES.permissions.safeCommands],
                readScopes: base.permissions?.readScopes ? [...base.permissions.readScopes] : [...DEFAULT_RULES.permissions.readScopes],
                editScopes: base.permissions?.editScopes ? [...base.permissions.editScopes] : [...DEFAULT_RULES.permissions.editScopes]
            },
            protect: {
                denyPaths: base.protect?.denyPaths ? [...base.protect.denyPaths] : [...DEFAULT_RULES.protect.denyPaths],
                denyCommands: base.protect?.denyCommands ? [...base.protect.denyCommands] : [...DEFAULT_RULES.protect.denyCommands]
            },
            quotas: {
                maxRequestsPerAction: base.quotas?.maxRequestsPerAction ?? DEFAULT_RULES.quotas.maxRequestsPerAction,
                defaultTtlMinutes: base.quotas?.defaultTtlMinutes ?? DEFAULT_RULES.quotas.defaultTtlMinutes,
                maxTtlMinutes: base.quotas?.maxTtlMinutes ?? DEFAULT_RULES.quotas.maxTtlMinutes
            }
        };

        // Merge behavior (booleans - false wins)
        if (override.behavior?.autoApprove) {
            for (const [key, value] of Object.entries(override.behavior.autoApprove)) {
                if (value === false) {
                    (result.behavior.autoApprove as any)[key] = false;
                } else if (value === true && (result.behavior.autoApprove as any)[key] !== false) {
                    (result.behavior.autoApprove as any)[key] = true;
                }
            }
        }

        // Merge permissions (intersection for allow lists)
        if (override.permissions) {
            if (override.permissions.safeCommands) {
                result.permissions.safeCommands = this.intersectArrays(
                    result.permissions.safeCommands,
                    override.permissions.safeCommands
                );
            }
            
            if (override.permissions.readScopes) {
                result.permissions.readScopes = this.intersectArrays(
                    result.permissions.readScopes,
                    override.permissions.readScopes
                );
            }
            
            if (override.permissions.editScopes) {
                result.permissions.editScopes = this.intersectArrays(
                    result.permissions.editScopes,
                    override.permissions.editScopes
                );
            }
        }

        // Merge protect (union for deny lists)
        if (override.protect) {
            if (override.protect.denyPaths) {
                result.protect.denyPaths = this.unionArrays(
                    result.protect.denyPaths,
                    override.protect.denyPaths
                );
            }
            
            if (override.protect.denyCommands) {
                result.protect.denyCommands = this.unionArrays(
                    result.protect.denyCommands,
                    override.protect.denyCommands
                );
            }
        }

        // Merge quotas (minimum wins)
        if (override.quotas) {
            if (typeof override.quotas.maxRequestsPerAction === 'number') {
                result.quotas.maxRequestsPerAction = Math.min(
                    result.quotas.maxRequestsPerAction,
                    override.quotas.maxRequestsPerAction
                );
            }
            
            if (typeof override.quotas.defaultTtlMinutes === 'number') {
                result.quotas.defaultTtlMinutes = Math.min(
                    result.quotas.defaultTtlMinutes,
                    override.quotas.defaultTtlMinutes
                );
            }
            
            if (typeof override.quotas.maxTtlMinutes === 'number') {
                result.quotas.maxTtlMinutes = Math.min(
                    result.quotas.maxTtlMinutes,
                    override.quotas.maxTtlMinutes
                );
            }
        }

        return result;
    }

    private intersectArrays(arr1: string[], arr2: string[]): string[] {
        if (arr1.length === 0) return arr2;
        if (arr2.length === 0) return arr1;
        return arr1.filter(item => arr2.includes(item));
    }

    private unionArrays(arr1: string[], arr2: string[]): string[] {
        return [...new Set([...arr1, ...arr2])];
    }

    async loadPrompts(workspaceFolder?: vscode.WorkspaceFolder): Promise<string | null> {
        if (!workspaceFolder) {
            return null;
        }

        const promptsPath = vscode.Uri.joinPath(workspaceFolder.uri, '.capcoprules', 'prompts.md');
        try {
            const content = await vscode.workspace.fs.readFile(promptsPath);
            return Buffer.from(content).toString('utf8');
        } catch {
            return null;
        }
    }
}
