"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var path = __toESM(require("path"));
var vscode5 = __toESM(require("vscode"));

// src/state/irisState.ts
var vscode2 = __toESM(require("vscode"));

// src/utils/logger.ts
var vscode = __toESM(require("vscode"));
var Logger = class {
  outputChannel;
  componentName;
  constructor(outputChannel, componentName) {
    this.outputChannel = outputChannel;
    this.componentName = componentName;
  }
  /**
   * Log an informational message
   */
  info(message, context) {
    this.log("INFO" /* INFO */, message, context);
  }
  /**
   * Log a warning message
   */
  warn(message, context) {
    this.log("WARN" /* WARN */, message, context);
  }
  /**
   * Log an error message
   */
  error(message, context) {
    this.log("ERROR" /* ERROR */, message, context);
  }
  /**
   * Log a debug message (verbose)
   */
  debug(message, context) {
    this.log("DEBUG" /* DEBUG */, message, context);
  }
  /**
   * Log an error with exception details
   */
  errorWithException(message, error, context) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : void 0;
    this.log("ERROR" /* ERROR */, message, {
      ...context,
      error: errorMessage,
      stack: errorStack
    });
  }
  /**
   * Core logging function with structured format
   * Per LOG-001, LOG-002
   */
  log(level, message, context) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context, null, 0)}` : "";
    const logLine = `[${timestamp}] [${level}] [${this.componentName}] ${message}${contextStr}`;
    this.outputChannel.appendLine(logLine);
    if (level === "ERROR" /* ERROR */) {
      void vscode.window.showErrorMessage(`IRIS: ${message}`);
    }
  }
  /**
   * Show output channel to user
   */
  show(preserveFocus = true) {
    this.outputChannel.show(preserveFocus);
  }
};
function createLogger(outputChannel, componentName) {
  return new Logger(outputChannel, componentName);
}

// src/state/irisState.ts
var IRISStateManager = class {
  state;
  outputChannel;
  logger;
  stateChangeEmitter;
  /**
   * Event fired when state changes
   * Allows UI components to react to state transitions
   */
  onStateChange;
  constructor(outputChannel) {
    this.outputChannel = outputChannel;
    this.logger = createLogger(outputChannel, "StateManager");
    this.stateChangeEmitter = new vscode2.EventEmitter();
    this.onStateChange = this.stateChangeEmitter.event;
    this.state = {
      currentState: "IDLE" /* IDLE */,
      analysisData: null,
      activeFileUri: null,
      focusState: { activeBlockId: null }
    };
    this.logger.info("State manager initialized", { initialState: "IDLE" /* IDLE */ });
  }
  /**
   * Dispose resources
   */
  dispose() {
    this.stateChangeEmitter.dispose();
  }
  /**
   * Transition to ANALYZING state when analysis request starts
   * Per STATE-002, TASK-0045
   */
  startAnalysis(fileUri) {
    const previousState = this.state.currentState;
    if (previousState === "ANALYZING" /* ANALYZING */) {
      this.logger.warn("Analysis already in progress, ignoring duplicate trigger", { fileUri });
      return;
    }
    this.state.currentState = "ANALYZING" /* ANALYZING */;
    this.state.activeFileUri = fileUri;
    this.state.analysisData = null;
    this.logStateTransition(previousState, "ANALYZING" /* ANALYZING */, fileUri);
    this.stateChangeEmitter.fire("ANALYZING" /* ANALYZING */);
  }
  /**
   * Transition to ANALYZED state on successful analysis with valid schema
   * Per STATE-002, TASK-0046
   */
  setAnalyzed(data) {
    const previousState = this.state.currentState;
    if (previousState !== "ANALYZING" /* ANALYZING */) {
      this.logger.warn("Received analysis data without being in ANALYZING state", {
        currentState: previousState,
        fileUri: data.analyzedFileUri
      });
      return;
    }
    this.state.currentState = "ANALYZED" /* ANALYZED */;
    this.state.analysisData = data;
    this.logStateTransition(previousState, "ANALYZED" /* ANALYZED */, data.analyzedFileUri, {
      blockCount: data.responsibilityBlocks.length,
      fileIntent: data.fileIntent.substring(0, 50) + "..."
      // Truncate for logging
    });
    this.stateChangeEmitter.fire("ANALYZED" /* ANALYZED */);
  }
  /**
   * Transition to IDLE state on error or invalid schema
   * Per STATE-002, TASK-0047, API-002
   */
  setError(error, fileUri) {
    const previousState = this.state.currentState;
    this.state.currentState = "IDLE" /* IDLE */;
    this.state.analysisData = null;
    this.logStateTransition(previousState, "IDLE" /* IDLE */, fileUri, { error });
    this.stateChangeEmitter.fire("IDLE" /* IDLE */);
  }
  /**
   * Transition to STALE state when file is modified
   * Per STATE-003
   * Phase 8: Exit Focus Mode per TASK-0086
   */
  setStale() {
    const previousState = this.state.currentState;
    if (previousState !== "ANALYZED" /* ANALYZED */) {
      return;
    }
    const fileUri = this.state.analysisData?.analyzedFileUri;
    this.state.currentState = "STALE" /* STALE */;
    this.clearFocus();
    this.logStateTransition(previousState, "STALE" /* STALE */, fileUri);
    this.stateChangeEmitter.fire("STALE" /* STALE */);
  }
  /**
   * Reset to IDLE state (user-initiated or editor change)
   * Phase 8: Exit Focus Mode per TASK-0086
   */
  reset() {
    const previousState = this.state.currentState;
    this.state.currentState = "IDLE" /* IDLE */;
    this.state.analysisData = null;
    this.state.activeFileUri = null;
    this.clearFocus();
    this.logStateTransition(previousState, "IDLE" /* IDLE */, void 0, { reason: "reset" });
    this.stateChangeEmitter.fire("IDLE" /* IDLE */);
  }
  // ========================================
  // READ-ONLY SELECTORS per REQ-004
  // ========================================
  /**
   * Get current state enum value
   */
  getCurrentState() {
    return this.state.currentState;
  }
  /**
   * Get complete analysis data (null if not in ANALYZED state)
   */
  getAnalysisData() {
    return this.state.analysisData;
  }
  /**
   * Get file intent only
   */
  getFileIntent() {
    return this.state.analysisData?.fileIntent ?? null;
  }
  /**
   * Get responsibility blocks only
   */
  getResponsibilityBlocks() {
    return this.state.analysisData?.responsibilityBlocks ?? null;
  }
  /**
   * Get metadata only
   */
  getMetadata() {
    return this.state.analysisData?.metadata ?? null;
  }
  /**
   * Get analyzed file URI
   */
  getAnalyzedFileUri() {
    return this.state.analysisData?.analyzedFileUri ?? null;
  }
  /**
   * Get active file URI being tracked
   */
  getActiveFileUri() {
    return this.state.activeFileUri;
  }
  /**
   * Check if analysis data is available
   */
  hasAnalysisData() {
    return this.state.analysisData !== null;
  }
  /**
   * Check if currently analyzing
   */
  isAnalyzing() {
    return this.state.currentState === "ANALYZING" /* ANALYZING */;
  }
  /**
   * Check if analysis is stale
   */
  isStale() {
    return this.state.currentState === "STALE" /* STALE */;
  }
  /**
   * Get raw server response (for debugging or advanced use)
   */
  getRawResponse() {
    return this.state.analysisData?.rawResponse ?? null;
  }
  // ========================================
  // FOCUS STATE MANAGEMENT (Phase 8)
  // ========================================
  /**
   * Enter Focus Mode for a specific block
   * Per TASK-0081, GOAL-008
   */
  setFocusedBlock(blockId) {
    const previousBlockId = this.state.focusState.activeBlockId;
    this.state.focusState.activeBlockId = blockId;
    this.logger.info("Entered Focus Mode", {
      blockId,
      previousBlockId
    });
  }
  /**
   * Exit Focus Mode
   * Per TASK-0085
   */
  clearFocus() {
    const previousBlockId = this.state.focusState.activeBlockId;
    if (previousBlockId === null) {
      return;
    }
    this.state.focusState.activeBlockId = null;
    this.logger.info("Exited Focus Mode", {
      previousBlockId
    });
  }
  /**
   * Get current focused block ID
   */
  getFocusedBlockId() {
    return this.state.focusState.activeBlockId;
  }
  /**
   * Check if Focus Mode is active
   */
  isFocusModeActive() {
    return this.state.focusState.activeBlockId !== null;
  }
  // ========================================
  // LOGGING per LOG-001, LOG-002
  // ========================================
  /**
   * Log state transition with structured metadata
   * Per STATE-002, LOG-001, LOG-002
   */
  logStateTransition(from, to, fileUri, metadata) {
    const message = `State transition: ${from} \u2192 ${to}`;
    const context = {
      from,
      to,
      fileUri,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...metadata
    };
    this.logger.info(message, context);
  }
};

// src/webview/sidePanel.ts
var vscode3 = __toESM(require("vscode"));

// src/types/messages.ts
function isWebviewMessage(message) {
  if (!message || typeof message !== "object" || typeof message.type !== "string") {
    return false;
  }
  switch (message.type) {
    case "WEBVIEW_READY":
      return true;
    case "BLOCK_HOVER":
    case "BLOCK_SELECT":
      return typeof message.blockId === "string" && message.blockId.length > 0;
    case "BLOCK_CLEAR":
    case "FOCUS_CLEAR":
      return true;
    default:
      return false;
  }
}

// src/webview/sidePanel.ts
var IRISSidePanelProvider = class {
  constructor(extensionUri, stateManager, decorationManager, outputChannel) {
    this.extensionUri = extensionUri;
    this.stateManager = stateManager;
    this.decorationManager = decorationManager;
    this.logger = createLogger(outputChannel, "SidePanel");
    this.disposables.push(
      this.stateManager.onStateChange((state) => {
        this.handleStateChange(state);
      })
    );
    this.logger.info("Side panel provider created");
  }
  static viewType = "iris.sidePanel";
  view;
  stateManager;
  decorationManager;
  disposables = [];
  logger;
  /**
   * Called when the view is first resolved
   * Per TASK-0052: Manage lifecycle without owning semantic state
   * Per TASK-0064: Implement message listeners
   */
  resolveWebviewView(webviewView, context, token) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    this.logger.info("Webview view resolved");
    this.disposables.push(
      webviewView.webview.onDidReceiveMessage((message) => {
        this.handleWebviewMessage(message);
      })
    );
    this.renderCurrentState();
    webviewView.onDidDispose(() => {
      this.view = void 0;
      this.logger.info("Webview view disposed");
    });
  }
  /**
   * Handle state change events from state manager
   * Per REQ-004: React to state changes, never own data
   */
  handleStateChange(state) {
    this.logger.info(`State changed to: ${state}`);
    this.renderCurrentState();
    this.postMessageToWebview({
      type: "STATE_UPDATE",
      state
    });
  }
  /**
   * Handle messages from webview
   * Per TASK-0064, TASK-0066, TASK-0067
   * Enforces blockId-based routing per REQ-005
   */
  handleWebviewMessage(message) {
    if (!isWebviewMessage(message)) {
      this.logger.warn("Received malformed message from webview", {
        messageType: message?.type,
        message: JSON.stringify(message)
      });
      return;
    }
    switch (message.type) {
      case "WEBVIEW_READY":
        this.handleWebviewReady();
        break;
      case "BLOCK_HOVER":
        this.handleBlockHover(message.blockId);
        break;
      case "BLOCK_SELECT":
        this.handleBlockSelect(message.blockId);
        break;
      case "BLOCK_CLEAR":
        this.handleBlockClear();
        break;
      case "FOCUS_CLEAR":
        this.handleFocusClear();
        break;
      default:
        const _exhaustive = message;
        this.logger.warn("Unknown message type", { message });
    }
  }
  /**
   * Handle WEBVIEW_READY message
   * Sent when webview is fully initialized
   */
  handleWebviewReady() {
    this.logger.info("Webview ready signal received");
    const currentState = this.stateManager.getCurrentState();
    this.postMessageToWebview({
      type: "STATE_UPDATE",
      state: currentState
    });
    if (currentState === "ANALYZED" /* ANALYZED */) {
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
  handleBlockHover(blockId) {
    this.logger.info("Block hover", { blockId });
    const activeEditor = vscode3.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn("No active editor for block hover");
      return;
    }
    const blocks = this.stateManager.getResponsibilityBlocks();
    if (!blocks) {
      this.logger.warn("No responsibility blocks available");
      return;
    }
    const block = blocks.find((b) => b.blockId === blockId);
    if (!block) {
      this.logger.warn("Block not found", { blockId });
      return;
    }
    this.decorationManager.applyBlockHover(activeEditor, block);
  }
  /**
   * Handle BLOCK_SELECT message
   * Per TASK-0066, TASK-0068: blockId-based routing with logging
   * Triggers Focus Mode (Phase 8)
   */
  handleBlockSelect(blockId) {
    this.logger.info("Block select - entering Focus Mode", { blockId });
    const activeEditor = vscode3.window.activeTextEditor;
    if (!activeEditor) {
      this.logger.warn("No active editor for block select");
      return;
    }
    const blocks = this.stateManager.getResponsibilityBlocks();
    if (!blocks) {
      this.logger.warn("No responsibility blocks available");
      return;
    }
    const block = blocks.find((b) => b.blockId === blockId);
    if (!block) {
      this.logger.warn("Block not found", { blockId });
      return;
    }
    this.stateManager.setFocusedBlock(blockId);
    this.decorationManager.applyFocusMode(activeEditor, block, blocks);
  }
  /**
   * Handle BLOCK_CLEAR message
   * Clears decorations and exits focus mode
   */
  handleBlockClear() {
    this.logger.info("Block clear");
    const activeEditor = vscode3.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }
    this.decorationManager.clearCurrentHighlight(activeEditor);
  }
  /**
   * Handle FOCUS_CLEAR message
   * Per TASK-0085: Exit Focus Mode
   */
  handleFocusClear() {
    this.logger.info("Focus clear - exiting Focus Mode");
    const activeEditor = vscode3.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }
    this.stateManager.clearFocus();
    this.decorationManager.clearFocusMode(activeEditor);
  }
  /**
   * Post message to webview
   * Per TASK-0065: Implement dispatch from extension to webview
   */
  postMessageToWebview(message) {
    if (!this.view) {
      return;
    }
    this.view.webview.postMessage(message);
    this.logger.info("Sent message to webview", { type: message.type });
  }
  /**
   * Send analysis data to webview
   * Per Phase 6: ANALYSIS_DATA message with blockId + metadata
   */
  sendAnalysisData(data) {
    const message = {
      type: "ANALYSIS_DATA",
      payload: {
        fileIntent: data.fileIntent,
        metadata: data.metadata,
        responsibilityBlocks: data.responsibilityBlocks,
        analyzedFileUri: data.analyzedFileUri,
        analyzedAt: data.analyzedAt.toISOString()
      }
    };
    this.postMessageToWebview(message);
    this.logger.info("Sent analysis data to webview", {
      blockCount: data.responsibilityBlocks.length
    });
  }
  /**
   * Render webview content based on current state
   * Per UX-001: Handle all states appropriately
   */
  renderCurrentState() {
    if (!this.view) {
      return;
    }
    const currentState = this.stateManager.getCurrentState();
    switch (currentState) {
      case "IDLE" /* IDLE */:
        this.renderIdleState();
        break;
      case "ANALYZING" /* ANALYZING */:
        this.renderAnalyzingState();
        break;
      case "ANALYZED" /* ANALYZED */:
        this.renderAnalyzedState();
        break;
      case "STALE" /* STALE */:
        this.renderStaleState();
        break;
    }
  }
  /**
   * Render IDLE state: empty state message
   * Per UX-001, TASK-0057
   */
  renderIdleState() {
    if (!this.view) {
      return;
    }
    this.view.webview.html = this.getHtmlTemplate(
      "No Analysis Available",
      `
      <div class="empty-state">
        <div class="empty-icon">\u{1F4CA}</div>
        <h3>No Analysis Available</h3>
        <p>Run IRIS analysis on an active file to see results here.</p>
        <p class="hint">Use the command: <code>IRIS: Run Analysis</code></p>
      </div>
      `
    );
    this.logger.info("Rendered IDLE state");
  }
  /**
   * Render ANALYZING state: loading indicator
   * Per UX-001, TASK-0057
   */
  renderAnalyzingState() {
    if (!this.view) {
      return;
    }
    this.view.webview.html = this.getHtmlTemplate(
      "Analyzing...",
      `
      <div class="loading-state">
        <div class="spinner"></div>
        <h3>Analyzing...</h3>
        <p>IRIS is analyzing your code. This may take a few moments.</p>
      </div>
      `
    );
    this.logger.info("Rendered ANALYZING state");
  }
  /**
   * Render ANALYZED state: display File Intent and Responsibility Blocks
   * Per GOAL-005, TASK-0054, TASK-0055, TASK-0056
   */
  renderAnalyzedState() {
    if (!this.view) {
      return;
    }
    const data = this.stateManager.getAnalysisData();
    if (!data) {
      this.logger.warn("No analysis data available in ANALYZED state");
      this.renderIdleState();
      return;
    }
    this.sendAnalysisData(data);
    const fileIntentHtml = `
      <div class="file-intent-section">
        <h2 class="section-title">File Intent</h2>
        <div class="file-intent-content">
          ${this.escapeHtml(data.fileIntent)}
        </div>
      </div>
    `;
    const blocksHtml = data.responsibilityBlocks.length > 0 ? `
        <div class="responsibility-blocks-section">
          <h2 class="section-title">Responsibility Blocks</h2>
          <div class="blocks-list">
            ${data.responsibilityBlocks.map((block) => `
              <div class="block-item" 
                   data-block-id="${block.blockId}"
                   onmouseenter="handleBlockHover('${block.blockId}')"
                   onmouseleave="handleBlockClear()"
                   onclick="handleBlockSelect('${block.blockId}')">
                <div class="block-label">${this.escapeHtml(block.label)}</div>
                <div class="block-description">${this.escapeHtml(block.description)}</div>
              </div>
            `).join("")}
          </div>
          <div class="focus-controls">
            <button class="focus-clear-button" onclick="handleFocusClear()">Clear Focus</button>
          </div>
        </div>
      ` : `
        <div class="responsibility-blocks-section">
          <h2 class="section-title">Responsibility Blocks</h2>
          <p class="no-blocks">No responsibility blocks identified.</p>
        </div>
      `;
    this.view.webview.html = this.getHtmlTemplate(
      "Analysis Results",
      fileIntentHtml + blocksHtml
    );
    this.logger.info("Rendered ANALYZED state", {
      blockCount: data.responsibilityBlocks.length
    });
  }
  /**
   * Render STALE state: outdated analysis warning
   * Per UX-001, TASK-0057
   */
  renderStaleState() {
    if (!this.view) {
      return;
    }
    const data = this.stateManager.getAnalysisData();
    this.postMessageToWebview({
      type: "ANALYSIS_STALE"
    });
    const warningBanner = `
      <div class="stale-banner">
        <div class="stale-icon">\u26A0\uFE0F</div>
        <div class="stale-message">
          <strong>Outdated Analysis</strong>
          <p>The file has been modified since this analysis. Results may no longer be accurate.</p>
          <p class="hint">Re-run analysis to update: <code>IRIS: Run Analysis</code></p>
        </div>
      </div>
    `;
    if (data) {
      const fileIntentHtml = `
        <div class="file-intent-section stale">
          <h2 class="section-title">File Intent</h2>
          <div class="file-intent-content">
            ${this.escapeHtml(data.fileIntent)}
          </div>
        </div>
      `;
      const blocksHtml = data.responsibilityBlocks.length > 0 ? `
          <div class="responsibility-blocks-section stale">
            <h2 class="section-title">Responsibility Blocks</h2>
            <div class="blocks-list">
              ${data.responsibilityBlocks.map((block) => `
                <div class="block-item" data-block-id="${block.blockId}">
                  <div class="block-label">${this.escapeHtml(block.label)}</div>
                  <div class="block-description">${this.escapeHtml(block.description)}</div>
                </div>
              `).join("")}
            </div>
          </div>
        ` : "";
      this.view.webview.html = this.getHtmlTemplate(
        "Analysis Results (Outdated)",
        warningBanner + fileIntentHtml + blocksHtml
      );
    } else {
      this.renderIdleState();
    }
    this.logger.info("Rendered STALE state");
  }
  /**
   * Generate HTML template with consistent structure
   * Per TASK-0053: Minimal, static HTML structure
   * Per TASK-0065: Include JavaScript for webview message posting
   */
  getHtmlTemplate(title, bodyContent) {
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
  escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  /**
   * Dispose resources per TASK-0105
   */
  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.logger.info("Side panel provider disposed");
  }
};

// src/utils/blockId.ts
var crypto = __toESM(require("crypto"));
function normalizeWhitespace(text) {
  return text.trim().replace(/\s+/g, " ");
}
function generateBlockId(block) {
  const normalizedLabel = normalizeWhitespace(block.label);
  const normalizedDescription = normalizeWhitespace(block.description);
  const stringifiedRanges = JSON.stringify(block.ranges);
  const signature = {
    label: normalizedLabel,
    description: normalizedDescription,
    ranges: stringifiedRanges
  };
  const signatureString = JSON.stringify(signature);
  const hash = crypto.createHash("sha1").update(signatureString).digest("hex");
  const blockId = `rb_${hash.slice(0, 12)}`;
  return blockId;
}

// src/decorations/decorationManager.ts
var vscode4 = __toESM(require("vscode"));
var crypto2 = __toESM(require("crypto"));
var DecorationManager = class {
  decorationCache;
  focusedDecorationCache;
  dimmingDecorationType;
  currentlyHighlightedBlockId;
  currentlyFocusedBlockId;
  outputChannel;
  logger;
  constructor(outputChannel) {
    this.outputChannel = outputChannel;
    this.logger = createLogger(outputChannel, "DecorationManager");
    this.decorationCache = /* @__PURE__ */ new Map();
    this.focusedDecorationCache = /* @__PURE__ */ new Map();
    this.dimmingDecorationType = null;
    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    this.logger.info("Decoration manager initialized");
  }
  /**
   * Generate deterministic color from blockId using hash function
   * Per ED-002, TASK-0072
   * 
   * Strategy: Hash blockId to generate stable RGB values
   * Ensures same blockId always gets same color
   */
  generateColorFromBlockId(blockId) {
    const hash = crypto2.createHash("sha1").update(blockId).digest("hex");
    let r = parseInt(hash.substring(0, 2), 16);
    let g = parseInt(hash.substring(2, 4), 16);
    let b = parseInt(hash.substring(4, 6), 16);
    r = 80 + r % 140;
    g = 80 + g % 140;
    b = 80 + b % 140;
    const color = `rgb(${r}, ${g}, ${b})`;
    this.logger.debug(`Generated color for blockId`, { blockId, color });
    return color;
  }
  /**
   * Convert ONE-based API ranges to ZERO-based VS Code ranges
   * Per TASK-0073
   * 
   * API returns: [[start, end], ...] where lines are ONE-based
   * VS Code expects: ZERO-based line numbers
   * 
   * Formula: vscodeRange = backendRange.map(([start, end]) => 
   *            ({ startLine: start - 1, endLine: end - 1 }))
   */
  convertRangesToVSCode(apiRanges) {
    const vscodeRanges = apiRanges.map(([start, end]) => ({
      startLine: start - 1,
      // Convert ONE-based to ZERO-based
      endLine: end - 1
      // Convert ONE-based to ZERO-based
    }));
    this.logger.debug(`Converted ${apiRanges.length} ranges from ONE-based to ZERO-based`);
    return vscodeRanges;
  }
  /**
   * Create or retrieve cached decoration type for a blockId
   * Per TASK-0071, ED-001
   * 
   * Uses TextEditorDecorationType for overlay-only highlighting
   * Caches decoration types to prevent redundant creation
   */
  getOrCreateDecorationType(blockId) {
    const cached = this.decorationCache.get(blockId);
    if (cached) {
      this.logger.debug("Using cached decoration type", { blockId });
      return cached.decorationType;
    }
    const backgroundColor = this.generateColorFromBlockId(blockId);
    const decorationType = vscode4.window.createTextEditorDecorationType({
      backgroundColor,
      isWholeLine: true,
      overviewRulerColor: backgroundColor,
      overviewRulerLane: vscode4.OverviewRulerLane.Right,
      // Add subtle border for better visibility
      border: `1px solid ${backgroundColor}`,
      borderRadius: "2px"
    });
    this.logger.info("Created new decoration type", { blockId, backgroundColor });
    return decorationType;
  }
  /**
   * Create focused decoration type for a blockId
   * Per TASK-0082: Implement focused decoration style distinct from hover
   * 
   * Focused decorations have enhanced emphasis compared to hover
   */
  getOrCreateFocusedDecorationType(blockId) {
    const cached = this.focusedDecorationCache.get(blockId);
    if (cached) {
      return cached;
    }
    const backgroundColor = this.generateColorFromBlockId(blockId);
    const decorationType = vscode4.window.createTextEditorDecorationType({
      backgroundColor,
      isWholeLine: true,
      overviewRulerColor: backgroundColor,
      overviewRulerLane: vscode4.OverviewRulerLane.Center,
      // Enhanced styling for focus mode
      border: `2px solid ${backgroundColor}`,
      borderRadius: "3px",
      // Add gutter icon for focused block
      gutterIconPath: void 0,
      gutterIconSize: "contain"
    });
    this.focusedDecorationCache.set(blockId, decorationType);
    this.logger.info("Created focused decoration type", { blockId, backgroundColor });
    return decorationType;
  }
  /**
   * Get or create dimming decoration type
   * Per TASK-0083: Apply selective dimming to non-focused blocks
   */
  getOrCreateDimmingDecorationType() {
    if (this.dimmingDecorationType) {
      return this.dimmingDecorationType;
    }
    this.dimmingDecorationType = vscode4.window.createTextEditorDecorationType({
      opacity: "0.4",
      isWholeLine: true
    });
    this.logger.info("Created dimming decoration type");
    return this.dimmingDecorationType;
  }
  /**
   * Prepare decoration data for a responsibility block
   * Converts ranges and creates/caches decoration type
   * Per TASK-0071, TASK-0073
   */
  prepareBlockDecoration(block) {
    const cached = this.decorationCache.get(block.blockId);
    if (cached) {
      return cached;
    }
    const decorationType = this.getOrCreateDecorationType(block.blockId);
    const ranges = this.convertRangesToVSCode(block.ranges);
    const decorationData = {
      blockId: block.blockId,
      ranges,
      decorationType
    };
    this.decorationCache.set(block.blockId, decorationData);
    this.logger.info("Prepared block decoration", {
      blockId: block.blockId,
      rangeCount: ranges.length,
      label: block.label
    });
    return decorationData;
  }
  /**
   * Apply decorations for a specific block on BLOCK_HOVER
   * Per TASK-0074
   * Per TASK-0084: Disable hover while in Focus Mode
   * 
   * @param editor - The text editor to apply decorations to
   * @param block - The responsibility block to highlight
   */
  applyBlockHover(editor, block) {
    if (this.currentlyFocusedBlockId !== null) {
      this.logger.info("Hover disabled while in Focus Mode", {
        blockId: block.blockId,
        focusedBlockId: this.currentlyFocusedBlockId
      });
      return;
    }
    this.clearCurrentHighlight(editor);
    const decorationData = this.prepareBlockDecoration(block);
    const vscodeRanges = decorationData.ranges.map(
      (range) => new vscode4.Range(
        new vscode4.Position(range.startLine, 0),
        new vscode4.Position(range.endLine, Number.MAX_SAFE_INTEGER)
      )
    );
    editor.setDecorations(decorationData.decorationType, vscodeRanges);
    this.currentlyHighlightedBlockId = block.blockId;
    this.logger.info("Applied block hover decorations", {
      blockId: block.blockId,
      rangeCount: vscodeRanges.length,
      label: block.label
    });
  }
  /**
   * Clear currently highlighted block decorations
   * Per TASK-0075
   * 
   * @param editor - The text editor to clear decorations from
   */
  clearCurrentHighlight(editor) {
    if (!this.currentlyHighlightedBlockId) {
      return;
    }
    const decorationData = this.decorationCache.get(this.currentlyHighlightedBlockId);
    if (decorationData) {
      editor.setDecorations(decorationData.decorationType, []);
      this.logger.info("Cleared block highlight", {
        blockId: this.currentlyHighlightedBlockId
      });
    }
    this.currentlyHighlightedBlockId = null;
  }
  /**
   * Clear all decorations on BLOCK_CLEAR, IDLE, STALE
   * Per TASK-0075, ED-003
   * 
   * @param editor - The text editor to clear decorations from (optional)
   */
  clearAllDecorations(editor) {
    if (editor) {
      for (const decorationData of this.decorationCache.values()) {
        editor.setDecorations(decorationData.decorationType, []);
      }
      for (const decorationType of this.focusedDecorationCache.values()) {
        editor.setDecorations(decorationType, []);
      }
      if (this.dimmingDecorationType) {
        editor.setDecorations(this.dimmingDecorationType, []);
      }
      this.logger.info("Cleared all decorations from editor", {
        editorUri: editor.document.uri.toString()
      });
    }
    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    this.logger.info("Cleared all decoration state");
  }
  // ========================================
  // FOCUS MODE (Phase 8: GOAL-008)
  // ========================================
  /**
   * Enter Focus Mode for a specific block
   * Per TASK-0082, TASK-0083, GOAL-008
   * 
   * Visual behavior:
   * - Active block: enhanced decoration emphasis
   * - Inactive blocks: reduced opacity/dimming
   * - Non-responsibility code: untouched
   * 
   * @param editor - The text editor to apply focus decorations
   * @param focusedBlock - The block to focus on
   * @param allBlocks - All responsibility blocks for dimming calculation
   */
  applyFocusMode(editor, focusedBlock, allBlocks) {
    this.clearCurrentHighlight(editor);
    this.clearFocusMode(editor);
    const focusedDecorationType = this.getOrCreateFocusedDecorationType(focusedBlock.blockId);
    const focusedData = this.prepareBlockDecoration(focusedBlock);
    const focusedRanges = focusedData.ranges.map(
      (range) => new vscode4.Range(
        new vscode4.Position(range.startLine, 0),
        new vscode4.Position(range.endLine, Number.MAX_SAFE_INTEGER)
      )
    );
    editor.setDecorations(focusedDecorationType, focusedRanges);
    const dimmingDecorationType = this.getOrCreateDimmingDecorationType();
    const dimmingRanges = [];
    for (const block of allBlocks) {
      if (block.blockId !== focusedBlock.blockId) {
        const blockData = this.prepareBlockDecoration(block);
        const blockRanges = blockData.ranges.map(
          (range) => new vscode4.Range(
            new vscode4.Position(range.startLine, 0),
            new vscode4.Position(range.endLine, Number.MAX_SAFE_INTEGER)
          )
        );
        dimmingRanges.push(...blockRanges);
      }
    }
    if (dimmingRanges.length > 0) {
      editor.setDecorations(dimmingDecorationType, dimmingRanges);
    }
    this.currentlyFocusedBlockId = focusedBlock.blockId;
    this.logger.info("Applied Focus Mode", {
      focusedBlockId: focusedBlock.blockId,
      focusedRangeCount: focusedRanges.length,
      dimmedBlockCount: allBlocks.length - 1,
      dimmedRangeCount: dimmingRanges.length,
      label: focusedBlock.label
    });
  }
  /**
   * Exit Focus Mode and clear all focus decorations
   * Per TASK-0085
   * 
   * @param editor - The text editor to clear focus decorations from
   */
  clearFocusMode(editor) {
    if (this.currentlyFocusedBlockId === null) {
      return;
    }
    const previousFocusedBlockId = this.currentlyFocusedBlockId;
    for (const decorationType of this.focusedDecorationCache.values()) {
      editor.setDecorations(decorationType, []);
    }
    if (this.dimmingDecorationType) {
      editor.setDecorations(this.dimmingDecorationType, []);
    }
    this.currentlyFocusedBlockId = null;
    this.logger.info("Cleared Focus Mode", {
      previousFocusedBlockId
    });
  }
  /**
   * Check if currently in Focus Mode
   */
  isFocusModeActive() {
    return this.currentlyFocusedBlockId !== null;
  }
  /**
   * Get currently focused block ID
   */
  getFocusedBlockId() {
    return this.currentlyFocusedBlockId;
  }
  /**
   * Dispose all decoration types
   * Per TASK-0076, ED-003
   * 
   * Called on state transitions (STALE, IDLE) or extension deactivation
   * Prevents memory leaks by properly disposing TextEditorDecorationType instances
   */
  disposeAllDecorations() {
    const hoverCount = this.decorationCache.size;
    const focusCount = this.focusedDecorationCache.size;
    for (const decorationData of this.decorationCache.values()) {
      decorationData.decorationType.dispose();
    }
    for (const decorationType of this.focusedDecorationCache.values()) {
      decorationType.dispose();
    }
    if (this.dimmingDecorationType) {
      this.dimmingDecorationType.dispose();
      this.dimmingDecorationType = null;
    }
    this.decorationCache.clear();
    this.focusedDecorationCache.clear();
    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    this.logger.info("Disposed all decoration types", {
      hoverCount,
      focusCount
    });
  }
  /**
   * Get currently highlighted block ID
   */
  getCurrentlyHighlightedBlockId() {
    return this.currentlyHighlightedBlockId;
  }
  /**
   * Check if decorations exist for a block
   */
  hasDecorationsForBlock(blockId) {
    return this.decorationCache.has(blockId);
  }
  /**
   * Get count of cached decorations
   */
  getCachedDecorationCount() {
    return this.decorationCache.size;
  }
  /**
   * Dispose manager and all resources
   * Per ED-003, TASK-0105
   */
  dispose() {
    this.disposeAllDecorations();
    this.logger.info("Decoration manager disposed");
  }
};

// src/api/irisClient.ts
var APIError = class extends Error {
  constructor(type, message, statusCode, originalError) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.name = "APIError";
  }
};
var IRISAPIClient = class {
  config;
  logger;
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.logger.info("API Client initialized", {
      endpoint: config.endpoint,
      timeout: config.timeout
    });
  }
  /**
   * Send analysis request with comprehensive error handling
   * Per TASK-0101: Global error boundary for server calls
   */
  async analyze(request) {
    this.logger.info("Starting analysis request", {
      filename: request.filename,
      language: request.language,
      sourceLength: request.source_code.length
    });
    try {
      const response = await this.executeRequest(request);
      const validatedResponse = this.validateResponse(response);
      this.logger.info("Analysis request completed successfully", {
        filename: request.filename,
        blockCount: validatedResponse.responsibility_blocks.length
      });
      return validatedResponse;
    } catch (error) {
      if (error instanceof APIError) {
        this.logger.error(`API Error: ${error.type}`, {
          message: error.message,
          statusCode: error.statusCode,
          filename: request.filename
        });
        throw error;
      }
      this.logger.errorWithException("Unexpected error during analysis", error, {
        filename: request.filename
      });
      throw new APIError(
        "NETWORK_ERROR" /* NETWORK_ERROR */,
        "Unexpected error during analysis request",
        void 0,
        error
      );
    }
  }
  /**
   * Execute HTTP request with timeout
   * Per TASK-0101: Error boundary implementation
   */
  async executeRequest(request) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.timeout);
    try {
      this.logger.debug("Sending POST request", {
        endpoint: this.config.endpoint,
        timeout: this.config.timeout
      });
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      this.logger.debug("Received response", {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get("content-type")
      });
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read error response");
        throw new APIError(
          "HTTP_ERROR" /* HTTP_ERROR */,
          `Server returned ${response.status}: ${response.statusText}`,
          response.status
        );
      }
      try {
        const json = await response.json();
        return json;
      } catch (parseError) {
        throw new APIError(
          "PARSE_ERROR" /* PARSE_ERROR */,
          "Failed to parse server response as JSON",
          response.status,
          parseError
        );
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new APIError(
          "TIMEOUT" /* TIMEOUT */,
          `Request timeout after ${this.config.timeout}ms`
        );
      }
      if (error instanceof TypeError) {
        throw new APIError(
          "NETWORK_ERROR" /* NETWORK_ERROR */,
          `Network error: ${error.message}`,
          void 0,
          error
        );
      }
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        "NETWORK_ERROR" /* NETWORK_ERROR */,
        "Unknown network error",
        void 0,
        error
      );
    }
  }
  /**
   * Validate response schema defensively
   * Per TASK-0103, API-002
   * 
   * Required fields:
   * - file_intent (string)
   * - responsibility_blocks (array)
   * 
   * Optional fields:
   * - metadata (object)
   */
  validateResponse(response) {
    this.logger.debug("Validating response schema");
    if (!response || typeof response !== "object") {
      throw new APIError(
        "INVALID_RESPONSE" /* INVALID_RESPONSE */,
        "Response is not an object"
      );
    }
    const record = response;
    if (typeof record.file_intent !== "string") {
      throw new APIError(
        "INVALID_RESPONSE" /* INVALID_RESPONSE */,
        'Missing or invalid "file_intent" field (expected string)'
      );
    }
    if (!Array.isArray(record.responsibility_blocks)) {
      throw new APIError(
        "INVALID_RESPONSE" /* INVALID_RESPONSE */,
        'Missing or invalid "responsibility_blocks" field (expected array)'
      );
    }
    const blocks = record.responsibility_blocks;
    for (let i = 0; i < blocks.length; i++) {
      this.validateResponsibilityBlock(blocks[i], i);
    }
    const metadata = record.metadata ?? {};
    if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
      throw new APIError(
        "INVALID_RESPONSE" /* INVALID_RESPONSE */,
        'Invalid "metadata" field (expected object)'
      );
    }
    this.logger.debug("Response validation successful", {
      blockCount: blocks.length,
      fileIntentLength: record.file_intent.length
    });
    return {
      file_intent: record.file_intent,
      metadata,
      responsibility_blocks: blocks
    };
  }
  /**
   * Validate individual responsibility block
   * Per TASK-0103
   */
  validateResponsibilityBlock(block, index) {
    if (!block || typeof block !== "object") {
      throw new APIError(
        "INVALID_RESPONSE" /* INVALID_RESPONSE */,
        `Responsibility block at index ${index} is not an object`
      );
    }
    const record = block;
    if (typeof record.description !== "string") {
      throw new APIError(
        "INVALID_RESPONSE" /* INVALID_RESPONSE */,
        `Block ${index}: missing or invalid "description" field (expected string)`
      );
    }
    if (typeof record.label !== "string") {
      throw new APIError(
        "INVALID_RESPONSE" /* INVALID_RESPONSE */,
        `Block ${index}: missing or invalid "label" field (expected string)`
      );
    }
    if (!Array.isArray(record.ranges)) {
      throw new APIError(
        "INVALID_RESPONSE" /* INVALID_RESPONSE */,
        `Block ${index}: missing or invalid "ranges" field (expected array)`
      );
    }
    const ranges = record.ranges;
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      if (!Array.isArray(range) || range.length !== 2) {
        throw new APIError(
          "INVALID_RESPONSE" /* INVALID_RESPONSE */,
          `Block ${index}, range ${i}: invalid format (expected [number, number])`
        );
      }
      const [start, end] = range;
      if (typeof start !== "number" || typeof end !== "number") {
        throw new APIError(
          "INVALID_RESPONSE" /* INVALID_RESPONSE */,
          `Block ${index}, range ${i}: invalid types (expected numbers)`
        );
      }
      if (start < 1 || end < 1 || start > end) {
        throw new APIError(
          "INVALID_RESPONSE" /* INVALID_RESPONSE */,
          `Block ${index}, range ${i}: invalid values (start=${start}, end=${end})`
        );
      }
    }
  }
  /**
   * Get user-friendly error message from API error
   */
  static getUserMessage(error) {
    switch (error.type) {
      case "NETWORK_ERROR" /* NETWORK_ERROR */:
        return "Unable to connect to IRIS server. Please check your connection.";
      case "TIMEOUT" /* TIMEOUT */:
        return "Analysis request timed out. The file may be too large or the server is busy.";
      case "HTTP_ERROR" /* HTTP_ERROR */:
        if (error.statusCode === 429) {
          return "Too many requests. Please wait a moment and try again.";
        }
        if (error.statusCode === 500) {
          return "Server error. Please try again later.";
        }
        return `Server error (${error.statusCode}). Please try again.`;
      case "INVALID_RESPONSE" /* INVALID_RESPONSE */:
        return "Received invalid response from server. The analysis may have failed.";
      case "PARSE_ERROR" /* PARSE_ERROR */:
        return "Failed to parse server response. Please try again.";
      default:
        return "Analysis failed due to an unknown error.";
    }
  }
};

// src/extension.ts
var OUTPUT_CHANNEL_NAME = "IRIS";
var SUPPORTED_LANGUAGES = /* @__PURE__ */ new Set([
  "python",
  "javascript",
  "javascriptreact",
  "typescript",
  "typescriptreact"
]);
var ANALYZE_ENDPOINT = "http://localhost:8080/api/iris/analyze";
var REQUEST_TIMEOUT_MS = 15e3;
function activate(context) {
  const outputChannel = vscode5.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(outputChannel);
  const logger = createLogger(outputChannel, "Extension");
  logger.info("Extension activated", { version: context.extension.packageJSON.version });
  const stateManager = new IRISStateManager(outputChannel);
  context.subscriptions.push(stateManager);
  const decorationManager = new DecorationManager(outputChannel);
  context.subscriptions.push(decorationManager);
  const apiClient = new IRISAPIClient(
    {
      endpoint: ANALYZE_ENDPOINT,
      timeout: REQUEST_TIMEOUT_MS
    },
    createLogger(outputChannel, "APIClient")
  );
  stateManager.onStateChange((newState) => {
    const activeEditor = vscode5.window.activeTextEditor;
    if (newState === "IDLE" /* IDLE */ || newState === "STALE" /* STALE */) {
      if (activeEditor) {
        decorationManager.clearAllDecorations(activeEditor);
      }
      decorationManager.disposeAllDecorations();
      logger.info("Cleared decorations", { state: newState });
    }
  });
  const sidePanelProvider = new IRISSidePanelProvider(
    context.extensionUri,
    stateManager,
    decorationManager,
    outputChannel
  );
  context.subscriptions.push(
    vscode5.window.registerWebviewViewProvider(
      IRISSidePanelProvider.viewType,
      sidePanelProvider
    )
  );
  context.subscriptions.push(sidePanelProvider);
  const disposable = vscode5.commands.registerCommand("iris.runAnalysis", async () => {
    try {
      outputChannel.show(true);
      logger.info("Command executed: iris.runAnalysis");
      if (stateManager.isAnalyzing()) {
        logger.warn("Analysis already in progress, ignoring duplicate trigger");
        vscode5.window.showWarningMessage("IRIS: Analysis already in progress.");
        return;
      }
      const activeEditor = vscode5.window.activeTextEditor;
      if (!activeEditor) {
        logger.warn("No active editor found");
        vscode5.window.showInformationMessage("IRIS: No active editor to analyze.");
        return;
      }
      const document = activeEditor.document;
      const filePath = document.uri.fsPath;
      const fileUri = document.uri.toString();
      const fileName = path.basename(filePath);
      const languageId = document.languageId;
      const sourceCode = document.getText();
      const lineCount = document.lineCount;
      logger.info("Analyzing file", {
        fileName,
        languageId,
        filePath,
        lineCount,
        sourceLength: sourceCode.length
      });
      if (!SUPPORTED_LANGUAGES.has(languageId)) {
        logger.warn("Unsupported language detected", { languageId });
        vscode5.window.showWarningMessage(
          `IRIS: Unsupported language "${languageId}". Supported: ${Array.from(SUPPORTED_LANGUAGES).join(", ")}`
        );
        return;
      }
      const sourceWithLineNumbers = sourceCode.split("\n").map((line, idx) => `${idx + 1} | ${line}`).join("\n");
      const payload = {
        filename: fileName,
        language: languageId,
        source_code: sourceWithLineNumbers,
        metadata: {
          filepath: filePath,
          line_count: lineCount
        }
      };
      stateManager.startAnalysis(fileUri);
      await vscode5.window.withProgress(
        {
          location: vscode5.ProgressLocation.Notification,
          title: "IRIS",
          cancellable: false
        },
        async (progress) => {
          progress.report({ message: "Analyzing file..." });
          try {
            logger.info("Sending analysis request");
            const response = await apiClient.analyze(payload);
            if (response.responsibility_blocks.length === 0) {
              logger.warn("Server returned empty responsibility blocks");
              vscode5.window.showWarningMessage("IRIS: No responsibility blocks found in file.");
              stateManager.setError("No responsibility blocks found", fileUri);
              return;
            }
            const normalizedBlocks = response.responsibility_blocks.map((block) => ({
              ...block,
              blockId: generateBlockId(block)
              // Deterministic blockId generation per Phase 6
            }));
            stateManager.setAnalyzed({
              fileIntent: response.file_intent,
              metadata: response.metadata,
              responsibilityBlocks: normalizedBlocks,
              rawResponse: {
                file_intent: response.file_intent,
                metadata: response.metadata,
                responsibility_blocks: response.responsibility_blocks
              },
              analyzedFileUri: fileUri,
              analyzedAt: /* @__PURE__ */ new Date()
            });
            logger.info("Analysis completed successfully", {
              blockCount: normalizedBlocks.length,
              fileIntent: response.file_intent.substring(0, 50)
            });
            vscode5.window.showInformationMessage("IRIS: Analysis completed successfully.");
          } catch (error) {
            if (error instanceof APIError) {
              const userMessage = IRISAPIClient.getUserMessage(error);
              logger.error("API error during analysis", {
                type: error.type,
                statusCode: error.statusCode,
                message: error.message
              });
              stateManager.setError(error.message, fileUri);
              vscode5.window.showErrorMessage(`IRIS: ${userMessage}`);
            } else {
              const message = error instanceof Error ? error.message : "Unknown error";
              logger.errorWithException("Unexpected error during analysis", error);
              stateManager.setError(message, fileUri);
              vscode5.window.showErrorMessage("IRIS: Analysis failed due to an unexpected error.");
            }
          }
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.errorWithException("Command execution failed", error);
      stateManager.setError(message);
      vscode5.window.showErrorMessage("IRIS: Analysis failed.");
    }
  });
  context.subscriptions.push(disposable);
  context.subscriptions.push(
    vscode5.workspace.onDidChangeTextDocument((event) => {
      const currentState = stateManager.getCurrentState();
      if (currentState !== "ANALYZED" /* ANALYZED */) {
        return;
      }
      const analyzedFileUri = stateManager.getAnalyzedFileUri();
      if (!analyzedFileUri || event.document.uri.toString() !== analyzedFileUri) {
        return;
      }
      if (event.contentChanges.length === 0) {
        return;
      }
      logger.info("File modification detected - invalidating analysis", {
        changedFile: event.document.uri.toString(),
        changeCount: event.contentChanges.length,
        transition: "ANALYZED \u2192 STALE"
      });
      stateManager.setStale();
      logger.info("Analysis invalidated - state updated to STALE");
    })
  );
  context.subscriptions.push(
    vscode5.window.onDidChangeActiveTextEditor((editor) => {
      if (stateManager.isFocusModeActive()) {
        logger.info("Active editor changed - exiting Focus Mode");
        stateManager.clearFocus();
        if (editor) {
          decorationManager.clearFocusMode(editor);
        }
      }
    })
  );
  logger.info("Extension activation complete", {
    supportedLanguages: Array.from(SUPPORTED_LANGUAGES)
  });
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
