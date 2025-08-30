import { render } from 'preact';
import { ApprovalModal } from './components/ApprovalModal';

interface ApprovalState {
    currentRequest: {
        requestId: string;
        request: any;
        rules: any;
        currentApprovalState: any;
    } | null;
    onResponse: (requestId: string, response: any) => void;
    onClose: () => void;
}

declare global {
    interface Window {
        approvalState: ApprovalState;
        renderApprovalModal: (requestData: any) => void;
    }
}

// Function to try rendering from state if data is already available
function tryRenderFromState() {
    const currentRequest = window.approvalState?.currentRequest;
    if (currentRequest && window.renderApprovalModal) {
        console.log('[Webview] Rendering from stored state:', currentRequest);
        window.renderApprovalModal(currentRequest);
    }
}

// Function to render the approval modal
window.renderApprovalModal = (requestData) => {
    const root = document.getElementById('root');
    if (!root) {
        console.error('Root element not found for approval modal');
        return;
    }

    // Validate the request data structure
    if (!requestData || !requestData.requestId || !requestData.request || !requestData.rules) {
        console.error('[Webview] Invalid request data received:', requestData);
        return;
    }

    console.log('[Webview] Rendering approval modal with data:', requestData);
    
    render(
        <ApprovalModal
            requestId={requestData.requestId}
            request={requestData.request}
            rules={requestData.rules}
            currentApprovalState={requestData.currentApprovalState}
            onResponse={window.approvalState.onResponse}
            onClose={window.approvalState.onClose}
        />,
        root
    );
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Webview] Approval webview loaded and ready');
    // Try to render if we already have data stored
    tryRenderFromState();
});
