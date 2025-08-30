# Approval System Fix Log

## Issue Description
The approval webview was receiving `undefined` values for all approval request data, causing the error:
```
TypeError: undefined is not an object (evaluating 'n.behavior')
```

## Root Cause Analysis
The issue was in the message passing between the VS Code extension and the webview:

1. **Extension Side (ApprovalPanel.ts)**: Data was correctly structured and sent via `postMessage`
2. **Webview HTML Script**: Data was correctly received and stored in `window.approvalState.currentRequest`
3. **Critical Bug**: When calling `window.renderApprovalModal()`, we were passing the entire `currentRequest` object instead of its individual properties

## The Fix
**Before (Broken)**:
```javascript
// In ApprovalPanel.ts webview HTML
window.approvalState.currentRequest = {
    requestId: message.requestId,
    request: message.request,
    rules: message.rules,
    currentApprovalState: message.currentApprovalState
};

// This was wrong - passing the wrapped object
window.renderApprovalModal(window.approvalState.currentRequest);
```

**After (Fixed)**:
```javascript
// In ApprovalPanel.ts webview HTML  
window.approvalState.currentRequest = {
    requestId: message.requestId,
    request: message.request,
    rules: message.rules,
    currentApprovalState: message.currentApprovalState
};

// This is correct - passing individual properties
window.renderApprovalModal({
    requestId: message.requestId,
    request: message.request,
    rules: message.rules,
    currentApprovalState: message.currentApprovalState
});
```

## Expected Behavior After Fix
- ApprovalModal component should receive properly structured data
- No more `undefined` errors when accessing `rules.behavior` or other properties
- Approval modal should render correctly with all toggles and settings

## Files Modified
- `src/ui/ApprovalPanel.ts`: Fixed message passing in webview HTML script
- Added logging to help debug future issues

## Testing Instructions
1. Reload the VS Code extension
2. Run command: `CapCop: Show Approval Modal`
3. Check developer console - should see proper data structure
4. Approval modal should display with all controls working

## Validation
The fix addresses the exact mismatch between:
- What `renderApprovalModal()` expected: `{requestId, request, rules, currentApprovalState}`
- What we were passing: `{currentRequest: {requestId, request, rules, currentApprovalState}}`

This caused the ApprovalModal component to receive `undefined` for all its required props.
