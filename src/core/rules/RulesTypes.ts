export interface RulesConfig {
    behavior?: {
        autoApprove?: {
            read_project?: boolean;
            read_all?: boolean;
            edit_project?: boolean;
            edit_all?: boolean;
            cmd_safe?: boolean;
            cmd_any?: boolean;
            browser?: boolean;
            mcp?: boolean;
        };
    };
    permissions?: {
        safeCommands?: string[];
        readScopes?: string[];
        editScopes?: string[];
    };
    protect?: {
        denyPaths?: string[];
        denyCommands?: string[];
    };
    quotas?: {
        maxRequestsPerAction?: number;
        defaultTtlMinutes?: number;
        maxTtlMinutes?: number;
    };
}

export interface ProfileConfig {
    profile: string;
}

export interface MergedRules extends RulesConfig {
    profile: string;
    mergeReport?: string[];
}

export const DEFAULT_RULES: Required<RulesConfig> = {
    behavior: {
        autoApprove: {
            read_project: false,
            read_all: false,
            edit_project: false,
            edit_all: false,
            cmd_safe: false,
            cmd_any: false,
            browser: false,
            mcp: false
        }
    },
    permissions: {
        safeCommands: [
            'npm test',
            'npm run test',
            'npm run build',
            'npm run lint',
            'pnpm test',
            'pnpm run test',
            'pnpm run build',
            'pnpm run lint',
            'yarn test',
            'yarn build',
            'yarn lint',
            'tsc --noEmit',
            'eslint --fix',
            'prettier --write'
        ],
        readScopes: ['**/*'],
        editScopes: ['src/**/*', 'docs/**/*', '*.md', '*.json']
    },
    protect: {
        denyPaths: [
            '.git/**',
            '**/node_modules/**',
            '**/.env*',
            '**/dist/**',
            '**/build/**'
        ],
        denyCommands: [
            'rm -rf',
            'rm -r',
            'del /s',
            'rmdir /s',
            'git push --force',
            'git push -f',
            'sudo',
            'su',
            'chmod 777',
            'chown',
            'mkfs',
            'fdisk',
            'dd if=',
            'format',
            '> /dev/',
            'curl -s * | sh',
            'wget * | sh',
            'eval',
            'exec'
        ]
    },
    quotas: {
        maxRequestsPerAction: 100,
        defaultTtlMinutes: 60,
        maxTtlMinutes: 1440 // 24 hours
    }
};

export const PROFILE_NAMES = ['capcop-default', 'cline', 'gemini'] as const;
export type ProfileName = typeof PROFILE_NAMES[number];
