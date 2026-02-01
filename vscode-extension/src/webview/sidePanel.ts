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
      
      case 'BLOCK_CLICK':
        this.handleBlockClick(message.blockId);
        break;
      
      case 'BLOCK_DOUBLE_CLICK':
        this.handleBlockDoubleClick(message.blockId);
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
   * Handle BLOCK_CLICK message
   * Per Phase 4, REQ-006: Scroll to first line and enter focus mode without folding
   * Per Phase 6, REQ-010: Clicking on currently selected block must exit focus mode
   * TASK-029: Scroll-to-line logic with InCenter reveal
   * TASK-030: Integrate with focus mode
   * TASK-031: Apply focus decorations after scroll
   * TASK-045, TASK-046: Click-to-exit logic for already-focused blocks
   */
  private handleBlockClick(blockId: string): void {
    this.logger.info('Block click', { blockId });
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn('No active editor for block click');
      return;
    }

    // TASK-045: Detect if clicked block is already focused
    const currentFocusedBlockId = this.stateManager.getFocusedBlockId();
    
    if (currentFocusedBlockId === blockId) {
      // TASK-046: Click-to-exit logic - exit focus mode and unfold
      this.logger.info('Clicked on already-focused block - exiting Focus Mode', { blockId });
      
      // Unfold any previously folded ranges
      if (this.stateManager.isFoldActive()) {
        this.unfoldRanges(activeEditor);
        this.stateManager.clearFold();
      }
      
      // Clear focus state
      this.stateManager.clearFocus();
      
      // Clear focus decorations
      this.decorationManager.clearFocusMode(activeEditor);
      
      this.logger.info('Exited Focus Mode via click-to-exit', { blockId });
      return;
    }

    // Find the block by blockId
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

    // Get first range start line (API returns ONE-based, convert to ZERO-based)
    if (block.ranges.length === 0) {
      this.logger.warn('Block has no ranges', { blockId });
      return;
    }

    const firstLineOneBased = block.ranges[0][0];
    const firstLineZeroBased = firstLineOneBased - 1;
    
    this.logger.info('Scrolling to first line and entering Focus Mode', { 
      blockId, 
      lineOneBased: firstLineOneBased,
      lineZeroBased: firstLineZeroBased 
    });

    // Scroll to first line with InCenter reveal
    const position = new vscode.Position(firstLineZeroBased, 0);
    const range = new vscode.Range(position, position);
    activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    
    // Move cursor to first line
    activeEditor.selection = new vscode.Selection(position, position);

    // Enter Focus Mode via state manager (TASK-030)
    this.stateManager.setFocusedBlock(blockId);
    
    // Apply focus decorations (TASK-031)
    this.decorationManager.applyFocusMode(activeEditor, block, blocks);
    
    // Update VS Code context for keybinding
    vscode.commands.executeCommand('setContext', 'iris.focusModeActive', true);
    
    this.logger.info('Completed block click: scrolled and entered focus mode', { blockId });
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
   * Phase 5: Also clear fold state per TASK-037
   * Phase 6: Update VS Code context for keybinding
   */
  private handleFocusClear(): void {
    this.logger.info( 'Focus clear - exiting Focus Mode');
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    // Clear focus state in state manager
    this.stateManager.clearFocus();
    
    // Clear fold state if active (TASK-037)
    if (this.stateManager.isFoldActive()) {
      this.unfoldRanges(activeEditor);
      this.stateManager.clearFold();
    }
    
    // Clear focus decorations
    this.decorationManager.clearFocusMode(activeEditor);
    
    // Update VS Code context for keybinding
    vscode.commands.executeCommand('setContext', 'iris.focusModeActive', false);
  }

  /**
   * Handle BLOCK_DOUBLE_CLICK message
   * Per Phase 5, REQ-007, REQ-008: Fold gaps or toggle fold state
   * TASK-034: Detect fold gaps
   * TASK-036: Apply folds
   * TASK-037: Unfold
   * TASK-038: Toggle behavior
   */
  private handleBlockDoubleClick(blockId: string): void {
    this.logger.info('Block double-click - fold/unfold gaps', { blockId });
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn('No active editor for block double-click');
      return;
    }

    // Find the block by blockId
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

    // Check if clicking on already focused and folded block (toggle behavior - REQ-008)
    const isFocused = this.stateManager.getFocusedBlockId() === blockId;
    const isFolded = this.stateManager.isBlockFolded(blockId);
    
    if (isFocused && isFolded) {
      // TASK-038: Toggle - unfold the block
      this.logger.info('Toggling fold: unfolding block', { blockId });
      this.unfoldRanges(activeEditor);
      this.stateManager.clearFold();
      return;
    }

    // Scroll to first line (REQ-007)
    if (block.ranges.length === 0) {
      this.logger.warn('Block has no ranges', { blockId });
      return;
    }

    const firstLineOneBased = block.ranges[0][0];
    const firstLineZeroBased = firstLineOneBased - 1;
    
    this.logger.info('Scrolling to first line', { 
      blockId, 
      lineOneBased: firstLineOneBased,
      lineZeroBased: firstLineZeroBased 
    });

    // Scroll to first line with InCenter reveal
    const position = new vscode.Position(firstLineZeroBased, 0);
    const range = new vscode.Range(position, position);
    activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    
    // Move cursor to first line
    activeEditor.selection = new vscode.Selection(position, position);

    // Enter Focus Mode
    this.stateManager.setFocusedBlock(blockId);
    
    // Apply focus decorations
    this.decorationManager.applyFocusMode(activeEditor, block, blocks);
    
    // Update VS Code context for keybinding
    vscode.commands.executeCommand('setContext', 'iris.focusModeActive', true);
    
    // TASK-034: Detect fold gaps between scattered ranges
    const foldGaps = this.detectFoldGaps(block.ranges);
    
    if (foldGaps.length > 0) {
      this.logger.info('Detected fold gaps', { 
        blockId, 
        gapCount: foldGaps.length,
        gaps: foldGaps
      });
      
      // TASK-036: Apply folds
      this.foldRanges(activeEditor, foldGaps);
      
      // Store fold state
      this.stateManager.setFoldedBlock(blockId, foldGaps);
    } else {
      this.logger.info('No fold gaps detected - block has contiguous ranges', { blockId });
    }
    
    this.logger.info('Completed block double-click: scrolled, entered focus, and folded gaps', { blockId });
  }

  /**
   * Detect gaps between scattered block ranges
   * Per TASK-034: Implement fold gap detection algorithm
   * 
   * Algorithm:
   * 1. Sort ranges by start line
   * 2. For each consecutive pair of ranges, check if there's a gap
   * 3. If end of range[i] + 1 < start of range[i+1], there's a gap
   * 4. Gap range: [end of range[i] + 1, start of range[i+1] - 1]
   * 
   * @param ranges ONE-based ranges from API
   * @returns ZERO-based fold gap ranges
   */
  private detectFoldGaps(ranges: Array<[number, number]>): Array<[number, number]> {
    if (ranges.length <= 1) {
      return []; // No gaps if single range or no ranges
    }

    // Sort ranges by start line (should already be sorted, but ensure it)
    const sortedRanges = [...ranges].sort((a, b) => a[0] - b[0]);
    
    const gaps: Array<[number, number]> = [];
    
    for (let i = 0; i < sortedRanges.length - 1; i++) {
      const currentEnd = sortedRanges[i][1];  // ONE-based
      const nextStart = sortedRanges[i + 1][0]; // ONE-based
      
      // Check if there's a gap (at least 1 line between ranges)
      if (currentEnd + 1 < nextStart) {
        // Gap exists: lines between currentEnd and nextStart
        // Gap range: [currentEnd + 1, nextStart - 1] in ONE-based
        // Convert to ZERO-based: [currentEnd, nextStart - 2]
        const gapStartZeroBased = currentEnd;      // currentEnd + 1 - 1
        const gapEndZeroBased = nextStart - 2;      // nextStart - 1 - 1
        
        gaps.push([gapStartZeroBased, gapEndZeroBased]);
      }
    }
    
    return gaps;
  }

  /**
   * Fold line ranges in the editor
   * Per TASK-036: Implement fold logic using VS Code folding API
   * 
   * @param editor Active text editor
   * @param ranges ZERO-based line ranges to fold
   */
  private async foldRanges(editor: vscode.TextEditor, ranges: Array<[number, number]>): Promise<void> {
    // Create folding ranges
    const foldingRanges = ranges.map(([start, end]) => 
      new vscode.Range(
        new vscode.Position(start, 0),
        new vscode.Position(end, editor.document.lineAt(end).text.length)
      )
    );
    
    // Apply folds using VS Code command
    await vscode.commands.executeCommand('editor.fold', {
      selectionLines: ranges.map(([start]) => start)
    });
    
    this.logger.info('Applied folds', { 
      foldCount: ranges.length,
      ranges: ranges
    });
  }

  /**
   * Unfold previously folded ranges
   * Per TASK-037: Implement unfold logic
   * 
   * @param editor Active text editor
   */
  private async unfoldRanges(editor: vscode.TextEditor): Promise<void> {
    const foldedRanges = this.stateManager.getFoldedRanges();
    
    if (!foldedRanges || foldedRanges.length === 0) {
      return;
    }
    
    // Unfold all previously folded ranges
    await vscode.commands.executeCommand('editor.unfold', {
      selectionLines: foldedRanges.map(([start]) => start)
    });
    
    this.logger.info('Unfolded ranges', { 
      unfoldCount: foldedRanges.length,
      ranges: foldedRanges
    });
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
          <div class="focus-controls">
            <button class="focus-clear-button" onclick="handleFocusClear()">Clear Focus</button>
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
    
    /* Phase 3: TASK-023 - Keep description visible when block is in focus mode */
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
    
    /* Focus Controls - TASK-011: Added transitions */
    .focus-controls {
      margin-top: var(--iris-spacing-md);
      padding: var(--iris-spacing-sm) 0;
      text-align: center;
    }
    
    .focus-clear-button {
      padding: var(--iris-spacing-sm) var(--iris-spacing-lg);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: var(--iris-border-radius);
      cursor: pointer;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      font-weight: 500;
      transition: all var(--iris-transition-fast); /* TASK-011: Smooth transitions */
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .focus-clear-button:hover {
      background: var(--vscode-button-hoverBackground);
      transform: translateY(-1px); /* Subtle lift on hover */
    }
    
    .focus-clear-button:active {
      background: var(--vscode-button-activeBackground);
      transform: translateY(0); /* Press down effect */
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
    
    // Phase 5: TASK-032 - Double-click detection state
    let lastClickTime = 0;
    let lastClickedBlockId = null;
    const DOUBLE_CLICK_THRESHOLD_MS = 300;
    
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
    
    // Handle block click (single click or first click of double-click)
    // Per Phase 4, TASK-025, TASK-027: Send BLOCK_CLICK message
    // Per Phase 5, TASK-032: Detect double-click and send BLOCK_DOUBLE_CLICK
    function handleBlockClick(blockId) {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTime;
      
      // Check if this is a double-click
      if (timeSinceLastClick < DOUBLE_CLICK_THRESHOLD_MS && lastClickedBlockId === blockId) {
        // Double-click detected
        handleBlockDoubleClick(blockId);
        // Reset click tracking
        lastClickTime = 0;
        lastClickedBlockId = null;
        return;
      }
      
      // Record this click for potential double-click detection
      lastClickTime = now;
      lastClickedBlockId = blockId;
      
      // Delay single-click action to allow double-click detection
      setTimeout(() => {
        // Check if a double-click occurred during the delay
        if (lastClickedBlockId === blockId && lastClickTime === now) {
          // No double-click occurred, execute single-click behavior
          executeSingleClick(blockId);
        }
      }, DOUBLE_CLICK_THRESHOLD_MS);
    }
    
    // Execute single-click behavior
    // Per Phase 6, REQ-010: Clicking on currently selected block exits focus mode
    function executeSingleClick(blockId) {
      // Check if clicking on already-focused block (click-to-exit)
      if (activeFocusedBlockId === blockId) {
        // Exit focus mode
        activeFocusedBlockId = null;
        
        // Remove active state from all blocks
        document.querySelectorAll('.block-item').forEach(item => {
          item.classList.remove('active');
        });
        
        vscode.postMessage({ type: 'BLOCK_CLICK', blockId: blockId });
        return;
      }
      
      // Enter focus mode for new block
      activeFocusedBlockId = blockId;
      
      // Update UI to show focused state
      document.querySelectorAll('.block-item').forEach(item => {
        if (item.dataset.blockId === blockId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
      
      vscode.postMessage({ type: 'BLOCK_CLICK', blockId: blockId });
    }
    
    // Handle block double-click
    // Per Phase 5, TASK-032: Send BLOCK_DOUBLE_CLICK message
    function handleBlockDoubleClick(blockId) {
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
      
      vscode.postMessage({ type: 'BLOCK_DOUBLE_CLICK', blockId: blockId });
    }
    
    // Handle block select (legacy - kept for compatibility)
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
      
      // Phase 6: Handle focus cleared via Esc key
      if (message.type === 'FOCUS_CLEARED_VIA_ESC') {
        activeFocusedBlockId = null;
        document.querySelectorAll('.block-item').forEach(item => {
          item.classList.remove('active');
        });
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
   * Notify webview that focus mode has been cleared
   * Called by Esc key handler in extension.ts
   * Per Phase 6: TASK-040
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
    
    // Also clear active class from blocks in webview
    this.view.webview.postMessage({ type: 'FOCUS_CLEARED_VIA_ESC' });
    
    this.logger.info('Notified webview of focus clear');
  }

  /**
   * Dispose resources per TASK-0105
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.logger.info('Side panel provider disposed');
  }
}
