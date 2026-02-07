import * as vscode from 'vscode';
import { IRISAnalysisState } from '@iris/core';
import type { AnalysisData } from '@iris/core';
import { IRISStateManager } from '../state/irisState';
import { DecorationManager } from '../decorations/decorationManager';
import { createLogger, Logger } from '../utils/logger';
import { generateBlockColorOpaque } from '../utils/colorAssignment';
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
 * Stateless webview that derives all content from IRISStateManager.
 * Renders File Intent, Responsibility Blocks, and handles block selection.
 *
 * States: IDLE | ANALYZING | ANALYZED | STALE
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
    
    // Set up message listener
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
   */
  private handleStateChange(state: IRISAnalysisState): void {
    this.logger.info( `State changed to: ${state}`);
    this.renderCurrentState();
    
    // Send state update message to webview
    this.postMessageToWebview({
      type: 'STATE_UPDATE',
      state: state
    });
  }

  /**
   * Handle messages from webview
   */
  private handleWebviewMessage(message: any): void {
    // Validate message type
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
   * Triggers editor decorations
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
   * Select block and apply persistent highlighting with segment navigation
   */
  private handleBlockSelected(blockId: string): void {
    this.logger.info('Block selected - pin/unpin model', { blockId });
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn('No active editor for block select');
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

    // Store selection state in state manager
    this.stateManager.selectBlock(blockId);

    // Count segments (distinct ranges)
    const totalSegments = block.ranges.length;
    // Apply highlighting decoration to all block segments
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

    // Update VS Code context for keybinding
    vscode.commands.executeCommand('setContext', 'iris.blockSelected', true);
    
    this.logger.info('Block selected with segment navigator', { 
      blockId, 
      totalSegments,
      label: block.label 
    });
  }

  /**
   * Handle BLOCK_CLEAR message
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
   * Deselect block, clear highlighting, and hide segment navigator
   */
  private handleBlockDeselected(blockId: string): void {
    this.logger.info('Block deselected - pin/unpin model', { blockId });
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }

    // Clear selection state in state manager (also resets segment index to 0)
    this.stateManager.deselectBlock();
    
    // Clear decorations for the block
    this.decorationManager.clearCurrentHighlight(activeEditor);
    
    // Update VS Code context for keybinding
    vscode.commands.executeCommand('setContext', 'iris.blockSelected', false);
    
    this.logger.info('Block deselected - navigator hidden', { blockId });
  }

  /**
   * Handle SEGMENT_NAVIGATED message
   * Scroll editor to target segment and update navigator indicator
   */
  private handleSegmentNavigated(blockId: string, segmentIndex: number, totalSegments: number): void {
    this.logger.info('Segment navigated', { blockId, segmentIndex, totalSegments });
    
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn('No active editor for segment navigation');
      return;
    }

    // Get the selected block from state manager
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

    // Update segment index in state manager
    this.stateManager.setCurrentSegmentIndex(segmentIndex);

    // Get the target segment (ranges are 1-based line numbers from API)
    const [startLine, endLine] = block.ranges[segmentIndex];

    // Scroll editor to segment at top with padding
    const padding = 3;
    const revealLine = Math.max(startLine - 1 - padding, 0);
    const revealPos = new vscode.Position(revealLine, 0);
    activeEditor.revealRange(new vscode.Range(revealPos, revealPos), vscode.TextEditorRevealType.AtTop);

    // Move cursor to segment start position
    const cursorPos = new vscode.Position(startLine - 1, 0);
    activeEditor.selection = new vscode.Selection(cursorPos, cursorPos);
    
    
    this.logger.info('Scrolled to segment and updated navigator', { 
      blockId, 
      segmentIndex: segmentIndex + 1, 
      totalSegments,
      startLine 
    });
  }

  /**
   * Handle ESCAPE_PRESSED message
   * Deselect current block via Escape key
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

    // Execute deselection behavior
    this.stateManager.deselectBlock();
    this.decorationManager.clearCurrentHighlight(activeEditor);
    vscode.commands.executeCommand('setContext', 'iris.blockSelected', false);
    
    // Notify webview of deselection via STATE_UPDATE message
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
    
    // Send analysis data to webview
    this.sendAnalysisData(data);
    
    // Render File Intent prominently at top
    const fileIntentHtml = `
      <div class="file-intent-section">
        <div class="file-intent-content">
          ${this.escapeHtml(data.fileIntent)}
        </div>
      </div>
    `;
    
    // Render vertical list of Responsibility Blocks
    const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
      || vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;

    const blocksHtml = data.responsibilityBlocks.length > 0
      ? `
        <div class="responsibility-blocks-section">
          <div class="blocks-list">
            ${data.responsibilityBlocks.map(block => {
              const dotColor = generateBlockColorOpaque(block.blockId, isDarkTheme);
              return `
              <div class="block-item"
                   data-block-id="${block.blockId}"
                   onmouseenter="handleBlockHover('${block.blockId}')"
                   onmouseleave="handleBlockClear()"
                   onclick="handleBlockClick('${block.blockId}')">
                <div class="block-header">
                  <span class="block-dot" style="background: ${dotColor};"></span>
                  <span class="block-label">${this.escapeHtml(block.label)}</span>
                </div>
                <div class="block-description-container">
                  <div class="block-description">${this.escapeHtml(block.description)}</div>
                </div>
              </div>
            `;}).join('')}
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
   */
  private renderStaleState(): void {
    if (!this.view) {
      return;
    }
    
    const data = this.stateManager.getAnalysisData();
    
    // Send ANALYSIS_STALE message to webview
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
    // Show stale data without interactive elements
    if (data) {
      const fileIntentHtml = `
        <div class="file-intent-section stale">
          <div class="file-intent-content">
            ${this.escapeHtml(data.fileIntent)}
          </div>
        </div>
      `;
      
      const isDarkThemeStale = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark
        || vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;

      const blocksHtml = data.responsibilityBlocks.length > 0
        ? `
          <div class="responsibility-blocks-section stale">
            <div class="blocks-list">
              ${data.responsibilityBlocks.map(block => {
                const dotColor = generateBlockColorOpaque(block.blockId, isDarkThemeStale);
                return `
                <div class="block-item" data-block-id="${block.blockId}">
                  <div class="block-header">
                    <span class="block-dot" style="background: ${dotColor};"></span>
                    <span class="block-label">${this.escapeHtml(block.label)}</span>
                  </div>
                  <div class="block-description-container">
                    <div class="block-description">${this.escapeHtml(block.description)}</div>
                  </div>
                </div>
              `;}).join('')}
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
   */
  private getHtmlTemplate(title: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    /* CSS custom properties for reusable values */
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
      font-family: var(--vscode-font-family);
      font-size: 13px;
      line-height: 1.6;
      overflow-y: overlay; /* Overlay scrollbar so it doesn't consume layout width */
    }
    
    
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
    
    /* Stale Banner */
    .stale-banner {
      display: flex;
      gap: var(--iris-spacing-md);
      padding: var(--iris-spacing-md);
      margin-bottom: var(--iris-spacing-lg);
      background: var(--vscode-inputValidation-warningBackground);
      border: 1px solid var(--vscode-inputValidation-warningBorder);
      border-radius: var(--iris-border-radius);
      transition: all var(--iris-transition-normal);
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
    
    /* File Intent */
    .file-intent-section {
      margin-bottom: var(--iris-spacing-sm); 
    }
    
    .file-intent-content {
      padding: 0 0 var(--iris-spacing-lg) 0;
      background: transparent;
      border: none;
      font-size: 16px;
      line-height: 1.6;
      font-weight: 600;
      color: var(--vscode-foreground);
      transition: all var(--iris-transition-normal);
    }
    
    .file-intent-section.stale .file-intent-content {
      opacity: 0.6;
    }
    
    /* Responsibility Blocks Section */
    .responsibility-blocks-section {
      margin-bottom: var(--iris-spacing-lg);
    }
    
    .blocks-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .block-item {
      padding: 6px 8px;
      background: transparent;
      cursor: pointer;
      transition: background var(--iris-transition-fast);
      border-radius: 3px;
    }

    .block-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .block-item.active {
      background: var(--vscode-list-activeSelectionBackground);
    }

    .responsibility-blocks-section.stale .block-item {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .responsibility-blocks-section.stale .block-item:hover {
      background: transparent;
    }

    .block-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .block-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 5px;
    }

    .block-label {
      font-weight: 500;
      font-size: 13px;
      line-height: 1.4;
      color: var(--vscode-foreground);
    }

    .block-description-container {
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transition: max-height var(--iris-transition-slow),
                  opacity var(--iris-transition-normal),
                  padding var(--iris-transition-normal);
      padding-left: 14px;
    }

    .block-item:hover .block-description-container,
    .block-item.active .block-description-container {
      max-height: 200px;
      opacity: 1;
      padding-top: var(--iris-spacing-xs);
    }

    .block-description {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.5;
    }
    
    .no-blocks {
      padding: var(--iris-spacing-xl);
      text-align: center;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      font-size: 13px;
    }
    
  </style>
</head>
<body>
  ${bodyContent}
  <script>
    // VS Code API for posting messages
    const vscode = acquireVsCodeApi();
    
    // Pin/unpin selection model state
    let selectedBlockId = null;
    
    let currentSegmentIndex = 0;
    let segmentCount = 0;
    let analysisData = null;
    
    // Send WEBVIEW_READY on initialization
    window.addEventListener('DOMContentLoaded', () => {
      vscode.postMessage({ type: 'WEBVIEW_READY' });
    });
    
    // Keyboard shortcuts for segment navigation
    window.addEventListener('keydown', (event) => {
      // Only process shortcuts when a block is selected
      if (!selectedBlockId) {
        return;
      }
      
      // Ctrl+Up navigates to previous segment
      if (event.ctrlKey && event.key === 'ArrowUp') {
        event.preventDefault();
        handleSegmentNavigation('prev');
        return;
      }
      
      // Ctrl+Down navigates to next segment
      if (event.ctrlKey && event.key === 'ArrowDown') {
        event.preventDefault();
        handleSegmentNavigation('next');
        return;
      }
      
      // Escape key deselects the block
      if (event.key === 'Escape') {
        event.preventDefault();
        executeDeselectBlock(selectedBlockId);
        return;
      }
    });
    
    // Handle block hover
    function handleBlockHover(blockId) {
      // Don't send hover for the selected/pinned block
      if (selectedBlockId !== null && blockId === selectedBlockId) {
        return;
      }
      vscode.postMessage({ type: 'BLOCK_HOVER', blockId: blockId });
    }

    // Handle block clear (mouse leave)
    function handleBlockClear() {
      vscode.postMessage({ type: 'BLOCK_CLEAR' });
    }
    
    // Handle block click - pin/unpin toggle
    function handleBlockClick(blockId) {
      if (selectedBlockId === blockId) {
        // Block already selected - unpin it
        executeDeselectBlock(blockId);
      } else {
        // Block not selected - pin it
        executeSelectBlock(blockId);
      }
    }
    
    // Execute block selection (pin block)
    function executeSelectBlock(blockId) {
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
      
      // Reset segment index to 0 when selecting new block
      currentSegmentIndex = 0;
      
      // Calculate segment count from block ranges
      segmentCount = block.ranges ? block.ranges.length : 0;
      
      // Update DOM - set active class on clicked block
      document.querySelectorAll('.block-item').forEach(item => {
        if (item.dataset.blockId === blockId) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
      
      // Send BLOCK_SELECTED message to extension with blockId
      vscode.postMessage({ type: 'BLOCK_SELECTED', blockId: blockId });
      
      console.log('Block selected:', blockId, 'segments:', segmentCount);
    }
    
    // Execute block deselection (unpin block)
    function executeDeselectBlock(blockId) {
      // Send BLOCK_DESELECTED message to extension
      vscode.postMessage({ type: 'BLOCK_DESELECTED', blockId: blockId });
      
      // Remove active class from all blocks
      document.querySelectorAll('.block-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Clear selection state
      selectedBlockId = null;
      currentSegmentIndex = 0;
      segmentCount = 0;
      
    }
    
    // Handle segment navigation for blocks with scattered ranges
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
      
      // Update current segment index
      currentSegmentIndex = newIndex;
      
      // Send SEGMENT_NAVIGATED message with new index to extension
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
      
      // Store analysis data for segment navigation
      if (message.type === 'ANALYSIS_DATA') {
        analysisData = message.payload;
        console.log('Stored analysis data:', analysisData.responsibilityBlocks.length, 'blocks');
      }
      
      // Handle state changes
      if (message.type === 'STATE_UPDATE') {
        // Clear selection on state transitions to IDLE or STALE
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
      
      // Handle ESCAPE_PRESSED message
      if (message.type === 'ESCAPE_PRESSED') {
        selectedBlockId = null;
        currentSegmentIndex = 0;
        segmentCount = 0;
        document.querySelectorAll('.block-item').forEach(item => {
          item.classList.remove('active');
        });
      }

      // Handle NAVIGATE_SEGMENT message from keyboard shortcuts
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
   * Notify webview that block has been deselected
   * Called by Esc key handler in extension.ts
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
    
    // Send ESCAPE_PRESSED to webview
    this.view.webview.postMessage({ type: 'ESCAPE_PRESSED' });
    
    this.logger.info('Notified webview of escape pressed');
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.logger.info('Side panel provider disposed');
  }
}
