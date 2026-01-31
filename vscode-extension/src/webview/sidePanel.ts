import * as vscode from 'vscode';
import { IRISStateManager, IRISAnalysisState, AnalysisData } from '../state/irisState';
import { DecorationManager } from '../decorations/decorationManager';
import { createLogger, Logger } from '../utils/logger';
import { 
  WebviewMessage, 
  ExtensionMessage, 
  isWebviewMessage,
  AnalysisDataMessage,
  StateUpdateMessage
} from '../types/messages';

/**
 * Webview View Provider for IRIS Side Panel
 * 
 * Per REQ-004 (State-Driven UI):
 * - Webview is stateless and derives all content from IRISStateManager
 * - Never persists or mutates data
 * - Reacts to state changes via event subscription
 * 
 * Per GOAL-005 (Read-only Webview):
 * - Renders File Intent prominently at top
 * - Displays vertical list of Responsibility Blocks (label + description)
 * - No interactive elements (Phase 5 is read-only only)
 * 
 * Per UX-001 (Honest State):
 * - IDLE: empty state message
 * - ANALYZING: loading indicator
 * - ANALYZED: display results
 * - STALE: outdated analysis warning
 * 
 * Phase 10: UX Polish & Stability
 * - TASK-0104: Structured logging
 */
export class IRISSidePanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'iris.sidePanel';
  
  private view?: vscode.WebviewView;
  private stateManager: IRISStateManager;
  private decorationManager: DecorationManager;
  private disposables: vscode.Disposable[] = [];
  private logger: Logger;

  constructor(
    private readonly extensionUri: vscode.Uri,
    stateManager: IRISStateManager,
    decorationManager: DecorationManager,
    outputChannel: vscode.OutputChannel
  ) {
    this.stateManager = stateManager;
    this.decorationManager = decorationManager;
    this.logger = createLogger(outputChannel, 'SidePanel');
    
    // Subscribe to state changes
    this.disposables.push(
      this.stateManager.onStateChange((state) => {
        this.handleStateChange(state);
      })
    );
    
    this.logger.info('Side panel provider created');
  }

  /**
   * Called when the view is first resolved
   * Per TASK-0052: Manage lifecycle without owning semantic state
   * Per TASK-0064: Implement message listeners
   */
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.view = webviewView;
    
    // Configure webview
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    
    this.logger.info( 'Webview view resolved');
    
    // Set up message listener per TASK-0064
    this.disposables.push(
      webviewView.webview.onDidReceiveMessage((message: any) => {
        this.handleWebviewMessage(message);
      })
    );
    
    // Render initial state
    this.renderCurrentState();
    
    // Handle webview disposal
    webviewView.onDidDispose(() => {
      this.view = undefined;
      this.logger.info( 'Webview view disposed');
    });
  }

  /**
   * Handle state change events from state manager
   * Per REQ-004: React to state changes, never own data
   */
  private handleStateChange(state: IRISAnalysisState): void {
    this.logger.info( `State changed to: ${state}`);
    this.renderCurrentState();
    
    // Send state update message to webview per Phase 6
    this.postMessageToWebview({
      type: 'STATE_UPDATE',
      state: state
    });
  }

  /**
   * Handle messages from webview
   * Per TASK-0064, TASK-0066, TASK-0067
   * Enforces blockId-based routing per REQ-005
   */
  private handleWebviewMessage(message: any): void {
    // Validate message type per TASK-0067
    if (!isWebviewMessage(message)) {
      this.logger.warn( 'Received malformed message from webview', { 
        messageType: message?.type,
        message: JSON.stringify(message) 
      });
      return;
    }

    // Route based on message type
    switch (message.type) {
      case 'WEBVIEW_READY':
        this.handleWebviewReady();
        break;
      
      case 'BLOCK_HOVER':
        this.handleBlockHover(message.blockId);
        break;
      
      case 'BLOCK_SELECT':
        this.handleBlockSelect(message.blockId);
        break;
      
      case 'BLOCK_CLEAR':
        this.handleBlockClear();
        break;
      
      case 'FOCUS_CLEAR':
        this.handleFocusClear();
        break;
      
      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = message;
        this.logger.warn( 'Unknown message type', { message });
    }
  }

  /**
   * Handle WEBVIEW_READY message
   * Sent when webview is fully initialized
   */
  private handleWebviewReady(): void {
    this.logger.info( 'Webview ready signal received');
    
    // Send current state
    const currentState = this.stateManager.getCurrentState();
    this.postMessageToWebview({
      type: 'STATE_UPDATE',
      state: currentState
    });
    
    // Send analysis data if available
    if (currentState === IRISAnalysisState.ANALYZED) {
      const data = this.stateManager.getAnalysisData();
      if (data) {
        this.sendAnalysisData(data);
      }
    }
  }

  /**
   * Handle BLOCK_HOVER message
   * Per TASK-0066, TASK-0068: blockId-based routing with logging
   * Triggers editor decorations (Phase 7)
   */
  private handleBlockHover(blockId: string): void {
    this.logger.info( 'Block hover', { blockId });
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn( 'No active editor for block hover');
      return;
    }

    // Find the block by blockId
    const blocks = this.stateManager.getResponsibilityBlocks();
    if (!blocks) {
      this.logger.warn( 'No responsibility blocks available');
      return;
    }

    const block = blocks.find(b => b.blockId === blockId);
    if (!block) {
      this.logger.warn( 'Block not found', { blockId });
      return;
    }

    // Apply hover decorations
    this.decorationManager.applyBlockHover(activeEditor, block);
  }

  /**
   * Handle BLOCK_SELECT message
   * Per TASK-0066, TASK-0068: blockId-based routing with logging
   * Triggers Focus Mode (Phase 8)
   */
  private handleBlockSelect(blockId: string): void {
    this.logger.info( 'Block select - entering Focus Mode', { blockId });
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn( 'No active editor for block select');
      return;
    }

    // Find the block by blockId
    const blocks = this.stateManager.getResponsibilityBlocks();
    if (!blocks) {
      this.logger.warn( 'No responsibility blocks available');
      return;
    }

    const block = blocks.find(b => b.blockId === blockId);
    if (!block) {
      this.logger.warn( 'Block not found', { blockId });
      return;
    }

    // Store focus state in state manager
    this.stateManager.setFocusedBlock(blockId);
    
    // Apply focus decorations
    this.decorationManager.applyFocusMode(activeEditor, block, blocks);
  }

  /**
   * Handle BLOCK_CLEAR message
   * Clears decorations and exits focus mode
   */
  private handleBlockClear(): void {
    this.logger.info( 'Block clear');
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    // Clear hover decorations
    this.decorationManager.clearCurrentHighlight(activeEditor);
  }

  /**
   * Handle FOCUS_CLEAR message
   * Per TASK-0085: Exit Focus Mode
   */
  private handleFocusClear(): void {
    this.logger.info( 'Focus clear - exiting Focus Mode');
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    // Clear focus state in state manager
    this.stateManager.clearFocus();
    
    // Clear focus decorations
    this.decorationManager.clearFocusMode(activeEditor);
  }

  /**
   * Post message to webview
   * Per TASK-0065: Implement dispatch from extension to webview
   */
  private postMessageToWebview(message: ExtensionMessage): void {
    if (!this.view) {
      return;
    }
    
    this.view.webview.postMessage(message);
    this.logger.info( 'Sent message to webview', { type: message.type });
  }

  /**
   * Send analysis data to webview
   * Per Phase 6: ANALYSIS_DATA message with blockId + metadata
   */
  private sendAnalysisData(data: AnalysisData): void {
    const message: AnalysisDataMessage = {
      type: 'ANALYSIS_DATA',
      payload: {
        fileIntent: data.fileIntent,
        metadata: data.metadata,
        responsibilityBlocks: data.responsibilityBlocks,
        analyzedFileUri: data.analyzedFileUri,
        analyzedAt: data.analyzedAt.toISOString()
      }
    };
    
    this.postMessageToWebview(message);
    this.logger.info( 'Sent analysis data to webview', { 
      blockCount: data.responsibilityBlocks.length 
    });
  }

  /**
   * Render webview content based on current state
   * Per UX-001: Handle all states appropriately
   */
  private renderCurrentState(): void {
    if (!this.view) {
      return;
    }

    const currentState = this.stateManager.getCurrentState();
    
    switch (currentState) {
      case IRISAnalysisState.IDLE:
        this.renderIdleState();
        break;
      case IRISAnalysisState.ANALYZING:
        this.renderAnalyzingState();
        break;
      case IRISAnalysisState.ANALYZED:
        this.renderAnalyzedState();
        break;
      case IRISAnalysisState.STALE:
        this.renderStaleState();
        break;
    }
  }

  /**
   * Render IDLE state: empty state message
   * Per UX-001, TASK-0057
   */
  private renderIdleState(): void {
    if (!this.view) {
      return;
    }
    
    this.view.webview.html = this.getHtmlTemplate(
      'No Analysis Available',
      `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>No Analysis Available</h3>
        <p>Run IRIS analysis on an active file to see results here.</p>
        <p class="hint">Use the command: <code>IRIS: Run Analysis</code></p>
      </div>
      `
    );
    
    this.logger.info( 'Rendered IDLE state');
  }

  /**
   * Render ANALYZING state: loading indicator
   * Per UX-001, TASK-0057
   */
  private renderAnalyzingState(): void {
    if (!this.view) {
      return;
    }
    
    this.view.webview.html = this.getHtmlTemplate(
      'Analyzing...',
      `
      <div class="loading-state">
        <div class="spinner"></div>
        <h3>Analyzing...</h3>
        <p>IRIS is analyzing your code. This may take a few moments.</p>
      </div>
      `
    );
    
    this.logger.info( 'Rendered ANALYZING state');
  }

  /**
   * Render ANALYZED state: display File Intent and Responsibility Blocks
   * Per GOAL-005, TASK-0054, TASK-0055, TASK-0056
   */
  private renderAnalyzedState(): void {
    if (!this.view) {
      return;
    }
    
    const data = this.stateManager.getAnalysisData();
    if (!data) {
      this.logger.warn( 'No analysis data available in ANALYZED state');
      this.renderIdleState();
      return;
    }
    
    // Send analysis data to webview per Phase 6
    this.sendAnalysisData(data);
    
    // Render File Intent prominently at top (TASK-0055)
    const fileIntentHtml = `
      <div class="file-intent-section">
        <h2 class="section-title">File Intent</h2>
        <div class="file-intent-content">
          ${this.escapeHtml(data.fileIntent)}
        </div>
      </div>
    `;
    
    // Render vertical list of Responsibility Blocks (TASK-0056)
    // Phase 8: Add interactive elements for hover and focus
    const blocksHtml = data.responsibilityBlocks.length > 0
      ? `
        <div class="responsibility-blocks-section">
          <h2 class="section-title">Responsibility Blocks</h2>
          <div class="blocks-list">
            ${data.responsibilityBlocks.map(block => `
              <div class="block-item" 
                   data-block-id="${block.blockId}"
                   onmouseenter="handleBlockHover('${block.blockId}')"
                   onmouseleave="handleBlockClear()"
                   onclick="handleBlockSelect('${block.blockId}')">
                <div class="block-label">${this.escapeHtml(block.label)}</div>
                <div class="block-description">${this.escapeHtml(block.description)}</div>
              </div>
            `).join('')}
          </div>
          <div class="focus-controls">
            <button class="focus-clear-button" onclick="handleFocusClear()">Clear Focus</button>
          </div>
        </div>
      `
      : `
        <div class="responsibility-blocks-section">
          <h2 class="section-title">Responsibility Blocks</h2>
          <p class="no-blocks">No responsibility blocks identified.</p>
        </div>
      `;
    
    this.view.webview.html = this.getHtmlTemplate(
      'Analysis Results',
      fileIntentHtml + blocksHtml
    );
    
    this.logger.info( 'Rendered ANALYZED state', { 
      blockCount: data.responsibilityBlocks.length 
    });
  }

  /**
   * Render STALE state: outdated analysis warning
   * Per UX-001, TASK-0057
   */
  private renderStaleState(): void {
    if (!this.view) {
      return;
    }
    
    const data = this.stateManager.getAnalysisData();
    
    // Send ANALYSIS_STALE message to webview per Phase 6
    this.postMessageToWebview({
      type: 'ANALYSIS_STALE'
    });
    
    // Show stale warning banner
    const warningBanner = `
      <div class="stale-banner">
        <div class="stale-icon">⚠️</div>
        <div class="stale-message">
          <strong>Outdated Analysis</strong>
          <p>The file has been modified since this analysis. Results may no longer be accurate.</p>
          <p class="hint">Re-run analysis to update: <code>IRIS: Run Analysis</code></p>
        </div>
      </div>
    `;
    
    // Still show the data but with stale indicator
    if (data) {
      const fileIntentHtml = `
        <div class="file-intent-section stale">
          <h2 class="section-title">File Intent</h2>
          <div class="file-intent-content">
            ${this.escapeHtml(data.fileIntent)}
          </div>
        </div>
      `;
      
      const blocksHtml = data.responsibilityBlocks.length > 0
        ? `
          <div class="responsibility-blocks-section stale">
            <h2 class="section-title">Responsibility Blocks</h2>
            <div class="blocks-list">
              ${data.responsibilityBlocks.map(block => `
                <div class="block-item" data-block-id="${block.blockId}">
                  <div class="block-label">${this.escapeHtml(block.label)}</div>
                  <div class="block-description">${this.escapeHtml(block.description)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `
        : '';
      
      this.view.webview.html = this.getHtmlTemplate(
        'Analysis Results (Outdated)',
        warningBanner + fileIntentHtml + blocksHtml
      );
    } else {
      // Shouldn't happen, but fallback to idle
      this.renderIdleState();
    }
    
    this.logger.info( 'Rendered STALE state');
  }

  /**
   * Generate HTML template with consistent structure
   * Per TASK-0053: Minimal, static HTML structure
   * Per TASK-0065: Include JavaScript for webview message posting
   */
  private getHtmlTemplate(title: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    body {
      padding: 16px;
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      line-height: 1.5;
    }
    
    h2 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
    }
    
    h3 {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    p {
      margin: 0 0 8px 0;
    }
    
    code {
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: var(--vscode-editor-font-family);
      font-size: 0.9em;
    }
    
    .hint {
      font-size: 0.9em;
      color: var(--vscode-descriptionForeground);
    }
    
    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 48px 16px;
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    /* Loading State */
    .loading-state {
      text-align: center;
      padding: 48px 16px;
    }
    
    .spinner {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      border: 4px solid var(--vscode-progressBar-background);
      border-top-color: var(--vscode-progressBar-foreground);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Stale Banner */
    .stale-banner {
      display: flex;
      gap: 12px;
      padding: 12px;
      margin-bottom: 16px;
      background: var(--vscode-inputValidation-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      border-radius: 4px;
    }
    
    .stale-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .stale-message {
      flex: 1;
    }
    
    .stale-message strong {
      display: block;
      margin-bottom: 4px;
      color: var(--vscode-inputValidation-warningForeground);
    }
    
    /* File Intent Section */
    .file-intent-section {
      margin-bottom: 24px;
    }
    
    .file-intent-content {
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .file-intent-section.stale .file-intent-content {
      opacity: 0.7;
    }
    
    /* Responsibility Blocks Section */
    .responsibility-blocks-section {
      margin-bottom: 16px;
    }
    
    .blocks-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .block-item {
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .block-item:hover {
      border-color: var(--vscode-textLink-foreground);
      background: var(--vscode-list-hoverBackground);
    }
    
    .block-item.active {
      border-color: var(--vscode-textLink-activeForeground);
      background: var(--vscode-list-activeSelectionBackground);
    }
    
    .responsibility-blocks-section.stale .block-item {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .responsibility-blocks-section.stale .block-item:hover {
      border-color: var(--vscode-panel-border);
      background: var(--vscode-editor-background);
    }
    
    .block-label {
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--vscode-textLink-foreground);
    }
    
    .block-description {
      font-size: 0.95em;
      color: var(--vscode-descriptionForeground);
    }
    
    .no-blocks {
      padding: 12px;
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
    }
    
    /* Focus Controls */
    .focus-controls {
      margin-top: 12px;
      padding: 8px 0;
      text-align: center;
    }
    
    .focus-clear-button {
      padding: 6px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
      font-size: 13px;
    }
    
    .focus-clear-button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    
    .focus-clear-button:active {
      background: var(--vscode-button-activeBackground);
    }
  </style>
</head>
<body>
  ${bodyContent}
  <script>
    // VS Code API for posting messages
    const vscode = acquireVsCodeApi();
    
    // Track active focused block
    let activeFocusedBlockId = null;
    
    // Send WEBVIEW_READY on initialization
    window.addEventListener('DOMContentLoaded', () => {
      vscode.postMessage({ type: 'WEBVIEW_READY' });
    });
    
    // Handle block hover
    function handleBlockHover(blockId) {
      // Don't send hover if in focus mode
      if (activeFocusedBlockId !== null) {
        return;
      }
      vscode.postMessage({ type: 'BLOCK_HOVER', blockId: blockId });
    }
    
    // Handle block clear (mouse leave)
    function handleBlockClear() {
      // Don't send clear if in focus mode
      if (activeFocusedBlockId !== null) {
        return;
      }
      vscode.postMessage({ type: 'BLOCK_CLEAR' });
    }
    
    // Handle block select (click)
    function handleBlockSelect(blockId) {
      // Enter focus mode
      activeFocusedBlockId = blockId;
      
      // Update UI to show focused state
      document.querySelectorAll('.block-item').forEach(item => {
        if (item.dataset.blockId === blockId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
      
      vscode.postMessage({ type: 'BLOCK_SELECT', blockId: blockId });
    }
    
    // Handle focus clear
    function handleFocusClear() {
      activeFocusedBlockId = null;
      
      // Remove active state from all blocks
      document.querySelectorAll('.block-item').forEach(item => {
        item.classList.remove('active');
      });
      
      vscode.postMessage({ type: 'FOCUS_CLEAR' });
    }
    
    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      console.log('Received message from extension:', message);
      
      // Handle state changes
      if (message.type === 'STATE_UPDATE') {
        // Clear focus mode on state changes to IDLE or STALE
        if (message.state === 'IDLE' || message.state === 'STALE') {
          activeFocusedBlockId = null;
          document.querySelectorAll('.block-item').forEach(item => {
            item.classList.remove('active');
          });
        }
      }
    });
  </script>
</body>
</html>`;
  }

  /**
   * Escape HTML to prevent XSS
   * Per TASK-0058: Ensure webview never persists or mutates data
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Dispose resources per TASK-0105
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.logger.info('Side panel provider disposed');
  }
}
