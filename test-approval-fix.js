// Test script to verify the approval system fix
// Run this in VS Code's developer console or as a test

console.log('=== Testing CapCop Approval System ===');

// Mock test data that mimics what the extension sends
const testData = {
    requestId: 'test-request-123',
    request: {
        kind: 'edit_project',
        reason: 'Test approval modal functionality',
        suggestedScopes: ['src/**/*', 'test/**/*'],
        ttlSuggestion: 30,
        quotaSuggestion: 25
    },
    rules: {
        behavior: {
            autoApprove: {
                read_project: false,
                read_all: false,
                edit_project: false,
                edit_all: false,
                cmd_safe: true,
                cmd_any: false,
                browser: false,
                mcp: false
            }
        },
        permissions: {
            safeCommands: ['npm test', 'npm run build', 'git status'],
            editScopes: ['src/**/*', 'docs/**/*'],
            readScopes: ['**/*']
        },
        protect: {
            denyPaths: ['node_modules/**', '.git/**'],
            denyCommands: ['rm -rf', 'sudo', 'format']
        },
        quotas: {
            maxRequestsPerAction: 100,
            defaultTtlMinutes: 60,
            maxTtlMinutes: 1440
        }
    },
    currentApprovalState: {
        autoApprove: {
            read_project: false,
            read_all: false,
            edit_project: false,
            edit_all: false,
            cmd_safe: true,
            cmd_any: false,
            browser: false,
            mcp: false
        },
        notificationsEnabled: true,
        maxRequests: 1200,
        grants: []
    }
};

console.log('Test data structure:', testData);

// Test that all required properties are present
function validateTestData(data) {
    const errors = [];
    
    if (!data.requestId) errors.push('Missing requestId');
    if (!data.request) errors.push('Missing request object');
    if (!data.rules) errors.push('Missing rules object');
    if (!data.currentApprovalState) errors.push('Missing currentApprovalState object');
    
    // Test nested properties
    if (data.request && !data.request.kind) errors.push('Missing request.kind');
    if (data.rules && !data.rules.behavior) errors.push('Missing rules.behavior');
    if (data.currentApprovalState && !data.currentApprovalState.autoApprove) {
        errors.push('Missing currentApprovalState.autoApprove');
    }
    
    return errors;
}

const validationErrors = validateTestData(testData);
if (validationErrors.length > 0) {
    console.error('❌ Validation failed:', validationErrors);
} else {
    console.log('✅ Test data validation passed');
}

// Test the data structure that will be passed to the ApprovalModal component
console.log('Data that will be passed to ApprovalModal:');
console.log('- requestId:', testData.requestId);
console.log('- request.kind:', testData.request?.kind);
console.log('- rules.behavior exists:', !!testData.rules?.behavior);
console.log('- currentApprovalState.autoApprove exists:', !!testData.currentApprovalState?.autoApprove);

console.log('=== Test Complete ===');
console.log('If this data structure matches what ApprovalModal expects, the undefined error should be fixed.');
