import * as vscode from 'vscode';
import { IRISStateManager, IRISAnalysisState, AnalysisData } from '../state/irisState';
import { DecorationManager } from '../decorations/decorationManager';
import { SegmentNavigator } from '../decorations/segmentNavigator';
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
 * - Interactive block selection with pin/unpin toggle (UI Refinement 2)
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
  private segmentNavigator: SegmentNavigator;
  private disposables: vscode.Disposable[] = [];
  private logger: Logger;

  constructor(
    private readonly extensionUri: vscode.Uri,
    stateManager: IRISStateManager,
    decorationManager: DecorationManager,
    segmentNavigator: SegmentNavigator,
    outputChannel: vscode.OutputChannel
  ) {
    this.stateManager = stateManager;
    this.decorationManager = decorationManager;
    this.segmentNavigator = segmentNavigator;
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
      
      // UI Refinement 2: Pin/unpin selection model message types
      case 'BLOCK_SELECTED':
        this.handleBlockSelected(message.blockId);
        break;
      
      case 'BLOCK_DESELECTED':
        this.handleBlockDeselected(message.blockId);
        break;
      
      case 'SEGMENT_NAVIGATED':
        this.handleSegmentNavigated(message.blockId, message.segmentIndex, message.totalSegments);
        break;
      
      case 'ESCAPE_PRESSED':
        this.handleEscapePressed();
        break;
      
      case 'BLOCK_CLEAR':
        this.handleBlockClear();
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
   * Handle BLOCK_SELECTED message
   * UI Refinement 2: Pin/unpin selection model
   * REQ-042: Select block and apply persistent highlighting with segment navigation
   */
  private handleBlockSelected(blockId: string): void {
    this.logger.info('Block selected - pin/unpin model', { blockId });
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn('No active editor for block select');
      return;
    }

    // REQ-042 (1): Find the block by blockId
    const blocks = this.stateManager.getResponsibilityBlocks();
    if (!blocks) {
      this.logger.warn('No responsibility blocks available');
      return;
    }

    const block = blocks.find(b => b.blockId === blockId);
    if (!block) {
      this.logger.warn('Block not found', { blockId });
      return;
    }

    // REQ-042 (1): Store selection state in state manager
    this.stateManager.selectBlock(blockId);

    // REQ-042 (3): Count segments (distinct ranges)
    const totalSegments = block.ranges.length;
    const currentSegment = 0; // Always start at first segment

    // REQ-042 (4): Show segment navigator with segment count
    this.segmentNavigator.showNavigator(blockId, currentSegment, totalSegments);

    // REQ-042 (5): Apply highlighting decoration to all block segments (REQ-053)
    this.decorationManager.applyBlockSelection(activeEditor, block);

    // Scroll editor to first segment of the selected block (near top with padding)
    if (block.ranges.length > 0) {
      const [startLine] = block.ranges[0];
      const padding = 3; // lines of context above the block
      const revealLine = Math.max(startLine - 1 - padding, 0);
      const revealPos = new vscode.Position(revealLine, 0);
      activeEditor.revealRange(new vscode.Range(revealPos, revealPos), vscode.TextEditorRevealType.AtTop);
      const cursorPos = new vscode.Position(startLine - 1, 0);
      activeEditor.selection = new vscode.Selection(cursorPos, cursorPos);
    }

    // REQ-048: Update VS Code context for keybinding
    vscode.commands.executeCommand('setContext', 'iris.blockSelected', true);
    
    this.logger.info('Block selected with segment navigator', { 
      blockId, 
      totalSegments,
      label: block.label 
    });
  }

  /**
   * Handle BLOCK_CLEAR message
   * REQ-022: Deselects/unpins block and clears decorations
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
   * Handle BLOCK_DESELECTED message
   * UI Refinement 2: Pin/unpin selection model
   * REQ-043: Deselect block, clear highlighting, and hide segment navigator
   */
  private handleBlockDeselected(blockId: string): void {
    this.logger.info('Block deselected - pin/unpin model', { blockId });
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    // REQ-043 (1): Clear selection state in state manager (also resets segment index to 0)
    this.stateManager.deselectBlock();
    
    // REQ-043 (2): Clear decorations for the block
    this.decorationManager.clearCurrentHighlight(activeEditor);
    
    // REQ-043 (3): Hide segment navigator
    this.segmentNavigator.hideNavigator();
    
    // REQ-048: Update VS Code context for keybinding
    vscode.commands.executeCommand('setContext', 'iris.blockSelected', false);
    
    this.logger.info('Block deselected - navigator hidden', { blockId });
  }

  /**
   * Handle SEGMENT_NAVIGATED message
   * UI Refinement 2: Navigate between scattered segments of a block
   * REQ-044: Scroll editor to target segment and update navigator indicator
   */
  private handleSegmentNavigated(blockId: string, segmentIndex: number, totalSegments: number): void {
    this.logger.info('Segment navigated', { blockId, segmentIndex, totalSegments });
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn('No active editor for segment navigation');
      return;
    }

    // REQ-044 (2): Get the selected block from state manager
    const blocks = this.stateManager.getResponsibilityBlocks();
    if (!blocks) {
      this.logger.error('No responsibility blocks available for segment navigation');
      return;
    }
    
    const block = blocks.find(b => b.blockId === blockId);
    
    if (!block || !block.ranges || segmentIndex >= block.ranges.length) {
      this.logger.error('Invalid segment navigation', { blockId, segmentIndex });
      return;
    }

    // REQ-044 (1): Update segment index in state manager
    this.stateManager.setCurrentSegmentIndex(segmentIndex);

    // REQ-044 (2): Get the target segment (ranges are 1-based line numbers from API)
    const [startLine, endLine] = block.ranges[segmentIndex];
    
    // Convert to 0-based for VS Code API
    const position = new vscode.Position(startLine - 1, 0);
    const range = new vscode.Range(position, position);
    
    // REQ-044 (3): Scroll editor to segment and center it (REQ-083)
    activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    
    // REQ-084: Move cursor to segment start position
    activeEditor.selection = new vscode.Selection(position, position);
    
    // REQ-044 (4): Update navigator indicator to reflect new segment position
    this.segmentNavigator.updateNavigator(segmentIndex, totalSegments);
    
    this.logger.info('Scrolled to segment and updated navigator', { 
      blockId, 
      segmentIndex: segmentIndex + 1, 
      totalSegments,
      startLine 
    });
  }

  /**
   * Handle ESCAPE_PRESSED message
   * UI Refinement 2: Simplified escape handling for pin/unpin model
   * REQ-045: Deselect current block via Escape key (same as BLOCK_DESELECTED)
   */
  private handleEscapePressed(): void {
    this.logger.info('Escape pressed - deselecting block');
    
    const selectedBlockId = this.stateManager.getSelectedBlockId();
    if (!selectedBlockId) {
      this.logger.info('No block selected - ignoring Escape');
      return;
    }
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    // REQ-045 (1): Execute deselection behavior (same as BLOCK_DESELECTED)
    this.stateManager.deselectBlock();
    this.decorationManager.clearCurrentHighlight(activeEditor);
    this.segmentNavigator.hideNavigator();
    vscode.commands.executeCommand('setContext', 'iris.blockSelected', false);
    
    // REQ-045 (2): Notify webview of deselection via STATE_UPDATE message
    this.sendStateUpdate();
    
    this.logger.info('Block deselected via Escape', { blockId: selectedBlockId });
  }

  /**
   * Send state update message to webview
   * Used for notifying webview of state changes
   */
  public sendStateUpdate(): void {
    const currentState = this.stateManager.getCurrentState();
    this.postMessageToWebview({
      type: 'STATE_UPDATE',
      state: currentState
    });
  }

  /**
   * Send navigation command to webview for segment navigation
   * REQ-079, REQ-080: Support keyboard shortcuts for segment navigation
   * @param direction - 'prev' or 'next'
   */
  public sendNavigationCommand(direction: 'prev' | 'next'): void {
    if (!this.view) {
      this.logger.warn('Cannot send navigation command - webview not initialized');
      return;
    }

    // Send command to webview, which will handle the navigation via handleSegmentNavigation
    this.postMessageToWebview({
      type: 'NAVIGATE_SEGMENT',
      direction: direction
    });
    this.logger.info('Sent segment navigation command', { direction });
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
    // Phase 1 UI Refinement: Removed "File Intent" header per TASK-003 / REQ-014
    // Phase 2: Clean header-free implementation (TASK-014, REQ-014)
    const fileIntentHtml = `
      <div class="file-intent-section">
        <div class="file-intent-content">
          ${this.escapeHtml(data.fileIntent)}
        </div>
      </div>
    `;
    
    // Render vertical list of Responsibility Blocks (TASK-0056)
    // Phase 8: Add interactive elements for hover and focus
    // Phase 1 UI Refinement: Removed "Responsibility Blocks" header per TASK-015 / REQ-013
    // Phase 2: Clean implementation without section headers (TASK-015, REQ-013)
    // Phase 3: TASK-019 - Wrap description in collapsible container for animated reveal
    const blocksHtml = data.responsibilityBlocks.length > 0
      ? `
        <div class="responsibility-blocks-section">
          <div class="blocks-list">
            ${data.responsibilityBlocks.map(block => `
              <div class="block-item" 
                   data-block-id="${block.blockId}"
                   onmouseenter="handleBlockHover('${block.blockId}')"
                   onmouseleave="handleBlockClear()"
                   onclick="handleBlockClick('${block.blockId}')">
                <div class="block-label">${this.escapeHtml(block.label)}</div>
                <div class="block-description-container">
                  <div class="block-description">${this.escapeHtml(block.description)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      : `
        <div class="responsibility-blocks-section">
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
    // Phase 2: Removed section headers per REQ-013, REQ-014 (TASK-014, TASK-015)
    if (data) {
      const fileIntentHtml = `
        <div class="file-intent-section stale">
          <div class="file-intent-content">
            ${this.escapeHtml(data.fileIntent)}
          </div>
        </div>
      `;
      
      const blocksHtml = data.responsibilityBlocks.length > 0
        ? `
          <div class="responsibility-blocks-section stale">
            <div class="blocks-list">
              ${data.responsibilityBlocks.map(block => `
                <div class="block-item" data-block-id="${block.blockId}">
                  <div class="block-label">${this.escapeHtml(block.label)}</div>
                  <div class="block-description-container">
                    <div class="block-description">${this.escapeHtml(block.description)}</div>
                  </div>
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
    /* Phase 1 UI Refinement: CSS custom properties for reusable values (PAT-002) */
    :root {
      --iris-spacing-xs: 4px;
      --iris-spacing-sm: 8px;
      --iris-spacing-md: 12px;
      --iris-spacing-lg: 16px;
      --iris-spacing-xl: 24px;
      --iris-border-radius: 6px;
      --iris-transition-fast: 0.15s ease;
      --iris-transition-normal: 0.2s ease;
      --iris-transition-slow: 0.3s ease;
    }
    
    body {
      padding: var(--iris-spacing-lg);
      color: var(--vscode-foreground);
      font-family: var(--vscode-editor-font-family); /* TASK-007: Use editor font per REQ-002 */
      font-size: 13px; /* TASK-007: Refined font size */
      line-height: 1.6; /* TASK-007: Improved line height for readability */
      overflow-y: auto;
      scrollbar-gutter: stable; /* Reserve scrollbar space to prevent layout shift on hover */
    }
    
    /* Phase 2: Removed h2 styling as section headers removed per REQ-013, REQ-014 */
    
    h3 {
      margin: 0 0 var(--iris-spacing-sm) 0;
      font-size: 14px;
      font-weight: 600;
    }
    
    p {
      margin: 0 0 var(--iris-spacing-sm) 0;
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
    
    /* Stale Banner - TASK-010: Updated styling for new design language */
    .stale-banner {
      display: flex;
      gap: var(--iris-spacing-md);
      padding: var(--iris-spacing-md);
      margin-bottom: var(--iris-spacing-lg);
      background: var(--vscode-inputValidation-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      border-radius: var(--iris-border-radius);
      transition: all var(--iris-transition-normal); /* TASK-011: Smooth transitions */
    }
    
    .stale-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    
    .stale-message {
      flex: 1;
    }
    
    .stale-message strong {
      display: block;
      margin-bottom: var(--iris-spacing-xs);
      color: var(--vscode-inputValidation-warningForeground);
      font-weight: 600;
    }
    
    /* File Intent Section - TASK-003, TASK-007, TASK-009: Refined styling */
    /* Phase 2: Adjusted spacing after header removal (TASK-017) */
    .file-intent-section {
      margin-bottom: calc(var(--iris-spacing-xl) + var(--iris-spacing-sm)); /* TASK-017: Increased spacing to compensate for removed header */
    }
    
    .file-intent-content {
      padding: var(--iris-spacing-lg); /* TASK-009: Better padding */
      background: transparent; /* TASK-004: Cleaner appearance */
      border: none; /* TASK-004: Remove border for minimal look */
      border-left: 3px solid var(--vscode-textLink-foreground); /* TASK-004: Accent border */
      border-radius: 0; /* Clean edge */
      font-size: 13px; /* TASK-007: Consistent font size */
      line-height: 1.7; /* TASK-007: Improved readability */
      color: var(--vscode-editor-foreground); /* TASK-008: Clear color */
      font-style: italic; /* Distinguish from regular text */
      opacity: 0.95;
      transition: all var(--iris-transition-normal); /* TASK-011 */
    }
    
    .file-intent-section.stale .file-intent-content {
      opacity: 0.6;
    }
    
    /* Responsibility Blocks Section - TASK-004 through TASK-011: Complete styling upgrade */
    .responsibility-blocks-section {
      margin-bottom: var(--iris-spacing-lg);
    }
    
    .blocks-list {
      display: flex;
      flex-direction: column;
      gap: var(--iris-spacing-sm); /* TASK-009: Tighter gap for clean look */
    }
    
    /* TASK-004: Updated block styling with refined appearance */
    .block-item {
      padding: var(--iris-spacing-md) var(--iris-spacing-lg); /* TASK-009: Refined padding */
      background: transparent; /* TASK-004: Clean background */
      border: 1px solid var(--vscode-widget-border); /* TASK-004: Subtle border */
      border-radius: var(--iris-border-radius); /* TASK-004: Rounded corners */
      cursor: pointer;
      transition: all var(--iris-transition-normal); /* TASK-011: Smooth transitions */
      position: relative;
    }
    
    /* TASK-005: Hover state with background change and subtle elevation */
    .block-item:hover {
      border-color: var(--vscode-focusBorder); /* TASK-005: Highlight border on hover */
      background: var(--vscode-list-hoverBackground); /* TASK-005: Background change */
      transform: translateY(-1px); /* TASK-005: Subtle elevation */
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* TASK-005: Subtle shadow */
    }
    
    /* TASK-006: Selected/focus state with stronger highlight */
    .block-item.active {
      border-color: var(--vscode-textLink-activeForeground); /* TASK-006: Strong border */
      background: var(--vscode-list-activeSelectionBackground); /* TASK-006: Distinct background */
      transform: translateY(0); /* No elevation for selected */
      box-shadow: 0 0 0 2px var(--vscode-focusBorder); /* TASK-006: Focus ring */
    }
    
    /* TASK-010: Stale state styling */
    .responsibility-blocks-section.stale .block-item {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .responsibility-blocks-section.stale .block-item:hover {
      border-color: var(--vscode-widget-border);
      background: transparent;
      transform: none;
      box-shadow: none;
    }
    
    /* TASK-007, TASK-008: Typography updates for block label */
    .block-label {
      font-weight: 600;
      margin-bottom: var(--iris-spacing-xs); /* TASK-009: Refined spacing */
      color: var(--vscode-editor-foreground); /* TASK-008: Use foreground color */
      font-size: 13px; /* TASK-007: Consistent sizing */
      line-height: 1.5;
    }
    
    /* Phase 3: TASK-020 - Description container with smooth transitions */
    .block-description-container {
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transition: max-height var(--iris-transition-slow) ease,
                  opacity var(--iris-transition-normal) ease,
                  padding var(--iris-transition-normal) ease,
                  margin var(--iris-transition-normal) ease;
      padding: 0;
      margin: 0;
    }
    
    /* Phase 3: TASK-022 - Reveal description on hover with smooth animation */
    .block-item:hover .block-description-container {
      max-height: 200px; /* Generous max-height for smooth reveal */
      opacity: 1;
      padding-top: var(--iris-spacing-xs);
      margin-top: var(--iris-spacing-xs);
    }
    
    /* UI Refinement 2: Keep description visible when block is selected (pinned) */
    .block-item.active .block-description-container {
      max-height: 200px;
      opacity: 1;
      padding-top: var(--iris-spacing-xs);
      margin-top: var(--iris-spacing-xs);
    }
    
    /* TASK-007, TASK-008: Typography updates for block description */
    .block-description {
      font-size: 12px; /* TASK-007: Slightly smaller for hierarchy */
      color: var(--vscode-descriptionForeground); /* TASK-008: Muted description color */
      line-height: 1.6; /* TASK-007: Better readability */
      opacity: 0.9;
    }
    
    .no-blocks {
      padding: var(--iris-spacing-xl);
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      font-size: 13px;
    }
    
    /* UI Refinement 2 Phase 3: Floating Segment Navigator (REQ-062 to REQ-065) */
    /* REQ-062: Floating navigator positioning at bottom-right of viewport */
    .segment-navigator {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      display: none; /* Hidden by default, shown when block selected */
      flex-direction: column;
      gap: var(--iris-spacing-xs);
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: var(--iris-border-radius);
      padding: var(--iris-spacing-xs);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    /* REQ-065: Visibility toggle class */
    .segment-navigator.navigator-visible {
      display: flex;
    }
    
    /* REQ-063: Up/down button styling - accessible, minimal visual weight */
    .segment-nav-button {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      border-radius: 4px;
      width: 32px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 14px;
      transition: all var(--iris-transition-fast);
    }
    
    .segment-nav-button:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
      transform: translateY(-1px);
    }
    
    .segment-nav-button:active:not(:disabled) {
      transform: translateY(0);
    }
    
    .segment-nav-button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    
    /* REQ-064: Segment indicator text - centered, monospace, subtle background */
    .segment-indicator {
      font-family: var(--vscode-editor-font-family);
      font-size: 11px;
      text-align: center;
      padding: 4px 8px;
      background: var(--vscode-input-background);
      border-radius: 3px;
      color: var(--vscode-input-foreground);
      user-select: none;
      font-variant-numeric: tabular-nums;
    }
  </style>
</head>
<body>
  ${bodyContent}
  <script>
    // VS Code API for posting messages
    const vscode = acquireVsCodeApi();
    
    // UI Refinement 2: Pin/unpin selection model state
    // REQ-009: Renamed from activeFocusedBlockId for semantic clarity
    let selectedBlockId = null;
    
    // REQ-012: Track which segment of selected block is currently visible
    let currentSegmentIndex = 0;
    
    // REQ-013: Track total segment count of selected block
    let segmentCount = 0;
    
    // Store analysis data for segment navigation (REQ-023)
    let analysisData = null;
    
    // Send WEBVIEW_READY on initialization
    window.addEventListener('DOMContentLoaded', () => {
      vscode.postMessage({ type: 'WEBVIEW_READY' });
    });
    
    // REQ-067 to REQ-071: Keyboard shortcuts for segment navigation
    // Listen for Ctrl+ArrowUp, Ctrl+ArrowDown, and Escape key
    window.addEventListener('keydown', (event) => {
      // REQ-071: Only process shortcuts when a block is selected
      if (!selectedBlockId) {
        return;
      }
      
      // REQ-068: Ctrl+Up navigates to previous segment
      if (event.ctrlKey && event.key === 'ArrowUp') {
        event.preventDefault();
        handleSegmentNavigation('prev');
        return;
      }
      
      // REQ-069: Ctrl+Down navigates to next segment
      if (event.ctrlKey && event.key === 'ArrowDown') {
        event.preventDefault();
        handleSegmentNavigation('next');
        return;
      }
      
      // REQ-070: Escape key deselects the block
      if (event.key === 'Escape') {
        event.preventDefault();
        executeDeselectBlock(selectedBlockId);
        return;
      }
    });
    
    // Handle block hover
    function handleBlockHover(blockId) {
      // REQ-014: Don't send hover if block is selected/pinned
      if (selectedBlockId !== null) {
        return;
      }
      vscode.postMessage({ type: 'BLOCK_HOVER', blockId: blockId });
    }
    
    // Handle block clear (mouse leave)
    function handleBlockClear() {
      // REQ-015: Don't send clear if block is selected/pinned
      if (selectedBlockId !== null) {
        return;
      }
      vscode.postMessage({ type: 'BLOCK_CLEAR' });
    }
    
    // Handle block click - UI Refinement 2: Pin/unpin toggle model
    // REQ-016 to REQ-020: Simplified click handler without double-click detection
    // Pin/Unpin toggle model:
    // - First click on a block: selects it (pins it, applies persistent highlighting)
    // - Second click on same block: deselects it (unpins it, clears highlighting)
    // - Click on different block: deselects current, selects new one
    // - No focus mode, no folding, no double-click - just simple toggle
    function handleBlockClick(blockId) {
      // REQ-016: Detect if block is already selected (pin/unpin toggle)
      if (selectedBlockId === blockId) {
        // REQ-017: Block already selected - unpin it
        executeDeselectBlock(blockId);
      } else {
        // REQ-018: Block not selected - pin it
        executeSelectBlock(blockId);
      }
    }
    
    // REQ-021: Execute block selection (pin block)
    // UI Refinement 2: Select a block and apply persistent highlighting
    function executeSelectBlock(blockId) {
      // REQ-021 (1): Find block in analysis data
      if (!analysisData || !analysisData.responsibilityBlocks) {
        console.error('Cannot select block: no analysis data available');
        return;
      }
      
      const block = analysisData.responsibilityBlocks.find(b => b.blockId === blockId);
      if (!block) {
        console.error('Cannot select block: block not found', blockId);
        return;
      }
      
      // Update selection state
      selectedBlockId = blockId;
      
      // REQ-021 (4): Reset segment index to 0 when selecting new block
      currentSegmentIndex = 0;
      
      // Calculate segment count from block ranges
      segmentCount = block.ranges ? block.ranges.length : 0;
      
      // REQ-021 (3): Update DOM - set active class on clicked block
      document.querySelectorAll('.block-item').forEach(item => {
        if (item.dataset.blockId === blockId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
      
      // REQ-021 (2): Send BLOCK_SELECTED message to extension with blockId
      vscode.postMessage({ type: 'BLOCK_SELECTED', blockId: blockId });
      
      // REQ-021 (5): Note - navigation buttons will be shown in future implementation
      console.log('Block selected:', blockId, 'segments:', segmentCount);
    }
    
    // REQ-022: Execute block deselection (unpin block)
    // UI Refinement 2: Deselect a block and clear highlighting
    function executeDeselectBlock(blockId) {
      // REQ-022 (1): Send BLOCK_DESELECTED message to extension
      vscode.postMessage({ type: 'BLOCK_DESELECTED', blockId: blockId });
      
      // REQ-022 (2): Remove active class from all blocks
      document.querySelectorAll('.block-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // REQ-022 (3): Clear selection state
      selectedBlockId = null;
      currentSegmentIndex = 0;
      segmentCount = 0;
      
      // REQ-022 (4): Note - navigation buttons will be hidden in future implementation
    }
    
    // REQ-023: Handle segment navigation for blocks with scattered ranges
    // UI Refinement 2: Navigate between non-contiguous code segments
    // 
    // Navigation flow:
    // 1. User presses Ctrl+Up/Down or clicks navigation buttons in webview
    // 2. Calculate new segment index (bounded by segment count)
    // 3. Send SEGMENT_NAVIGATED message to extension with new index
    // 4. Extension scrolls editor to target segment and updates state
    // 5. Extension sends back updated segment count via navigator update
    function handleSegmentNavigation(direction) {
      // Validate that a block is selected
      if (!selectedBlockId) {
        console.warn('Cannot navigate segments: no block selected');
        return;
      }
      
      // Get the selected block from analysis data
      if (!analysisData || !analysisData.responsibilityBlocks) {
        console.error('Cannot navigate: no analysis data available');
        return;
      }
      
      const block = analysisData.responsibilityBlocks.find(b => b.blockId === selectedBlockId);
      if (!block || !block.ranges || block.ranges.length === 0) {
        console.error('Cannot navigate: block has no ranges');
        return;
      }
      
      // Calculate new segment index based on direction
      let newIndex = currentSegmentIndex;
      if (direction === 'next') {
        newIndex = Math.min(currentSegmentIndex + 1, block.ranges.length - 1);
      } else if (direction === 'prev') {
        newIndex = Math.max(currentSegmentIndex - 1, 0);
      }
      
      // Only proceed if index actually changed
      if (newIndex === currentSegmentIndex) {
        console.log('Already at', direction === 'next' ? 'last' : 'first', 'segment');
        return;
      }
      
      // REQ-023: Update current segment index
      currentSegmentIndex = newIndex;
      
      // REQ-023: Send SEGMENT_NAVIGATED message with new index to extension
      // Extension will handle scrolling editor to the segment
      vscode.postMessage({ 
        type: 'SEGMENT_NAVIGATED', 
        blockId: selectedBlockId,
        segmentIndex: currentSegmentIndex,
        totalSegments: block.ranges.length
      });
      
      console.log('Navigated to segment', currentSegmentIndex + 1, 'of', block.ranges.length);
    }
    
    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      console.log('Received message from extension:', message);
      
      // Store analysis data for segment navigation (REQ-023)
      if (message.type === 'ANALYSIS_DATA') {
        analysisData = message.payload;
        console.log('Stored analysis data:', analysisData.responsibilityBlocks.length, 'blocks');
      }
      
      // Handle state changes
      if (message.type === 'STATE_UPDATE') {
        // REQ-072: Clear selection on state transitions to IDLE or STALE
        if (message.state === 'IDLE' || message.state === 'STALE') {
          if (selectedBlockId !== null) {
            console.log('Clearing selection due to state transition to', message.state);
            selectedBlockId = null;
            currentSegmentIndex = 0;
            segmentCount = 0;
            document.querySelectorAll('.block-item').forEach(item => {
              item.classList.remove('active');
            });
          }
        }
      }
      
      // REQ-032: Handle ESCAPE_PRESSED message (replaces FOCUS_CLEARED_VIA_ESC)
      if (message.type === 'ESCAPE_PRESSED') {
        selectedBlockId = null;
        currentSegmentIndex = 0;
        segmentCount = 0;
        document.querySelectorAll('.block-item').forEach(item => {
          item.classList.remove('active');
        });
      }

      // REQ-079, REQ-080: Handle NAVIGATE_SEGMENT message from keyboard shortcuts
      if (message.type === 'NAVIGATE_SEGMENT') {
        if (selectedBlockId !== null) {
          console.log('Navigating segment via keyboard shortcut:', message.direction);
          handleSegmentNavigation(message.direction);
        } else {
          console.log('No block selected, ignoring navigation command');
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
   * REQ-094: Notify webview that block has been deselected (round-trip message verification)
   * Called by Esc key handler in extension.ts
   * UI Refinement 2: Updated to use ESCAPE_PRESSED message
   */
  public notifyFocusCleared(): void {
    if (!this.view) {
      return;
    }
    
    // Send message to webview to update UI state
    this.postMessageToWebview({
      type: 'STATE_UPDATE',
      state: this.stateManager.getCurrentState()
    });
    
    // REQ-032: Use ESCAPE_PRESSED message type
    this.view.webview.postMessage({ type: 'ESCAPE_PRESSED' });
    
    this.logger.info('Notified webview of escape pressed');
  }

  /**
   * Dispose resources per TASK-0105
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.logger.info('Side panel provider disposed');
  }
}
