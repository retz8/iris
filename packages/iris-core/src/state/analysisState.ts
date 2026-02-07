import type { Logger } from '../types/logger';
import type { AnalysisData, FileIntent, NormalizedResponsibilityBlock,
  AnalysisMetadata, IRISAnalysisResponse, SelectionState } from '../models/types';

/**
 * Extension state machine enum
 */
export enum IRISAnalysisState {
  IDLE = 'IDLE',                 // No analysis in progress or completed
  ANALYZING = 'ANALYZING',       // Analysis request in flight
  ANALYZED = 'ANALYZED',         // Valid analysis results available
  STALE = 'STALE'                // Analysis outdated due to file modifications
}

type StateChangeListener = (state: IRISAnalysisState) => void;

/**
 * Complete extension state container (single source of truth)
 */
interface CoreState {
  currentState: IRISAnalysisState;
  analysisData: AnalysisData | null;
  activeFileUri: string | null;  // Currently active file being tracked
  selectionState: SelectionState;
}

/**
 * Platform-agnostic state manager (single source of truth)
 * Manages all state transitions with validation and logging
 */
export class IRISCoreState {
  private state: CoreState;
  private logger: Logger;
  private listeners: StateChangeListener[] = [];

  constructor(logger: Logger) {
    this.logger = logger;

    this.state = {
      currentState: IRISAnalysisState.IDLE,
      analysisData: null,
      activeFileUri: null,
      selectionState: { selectedBlockId: null, currentSegmentIndex: 0 }
    };

    this.logger.info('State manager initialized', { initialState: IRISAnalysisState.IDLE });
  }

  onStateChange(listener: StateChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(state: IRISAnalysisState): void {
    this.listeners.forEach(l => l(state));
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.listeners = [];
  }

  // ========================================
  // STATE TRANSITIONS
  // ========================================

  /**
   * Transition to ANALYZING state when analysis request starts
   */
  public startAnalysis(fileUri: string): void {
    const previousState = this.state.currentState;

    if (previousState === IRISAnalysisState.ANALYZING) {
      this.logger.warn('Analysis already in progress, ignoring duplicate trigger', { fileUri });
      return;
    }

    this.state.currentState = IRISAnalysisState.ANALYZING;
    this.state.activeFileUri = fileUri;
    this.state.analysisData = null;  // Clear previous data

    this.logStateTransition(previousState, IRISAnalysisState.ANALYZING, fileUri);
    this.emit(IRISAnalysisState.ANALYZING);
  }

  /**
   * Transition to ANALYZED state on successful analysis with valid schema
   */
  public setAnalyzed(data: AnalysisData): void {
    const previousState = this.state.currentState;

    if (previousState !== IRISAnalysisState.ANALYZING) {
      this.logger.warn('Received analysis data without being in ANALYZING state', {
        currentState: previousState,
        fileUri: data.analyzedFileUri
      });
      return;
    }

    this.state.currentState = IRISAnalysisState.ANALYZED;
    this.state.analysisData = data;

    this.logStateTransition(previousState, IRISAnalysisState.ANALYZED, data.analyzedFileUri, {
      blockCount: data.responsibilityBlocks.length,
      fileIntent: data.fileIntent.substring(0, 50) + '...'  // Truncate for logging
    });
    this.emit(IRISAnalysisState.ANALYZED);
  }

  /**
   * Transition to IDLE state on error or invalid schema
   * Clears selection state since selected block becomes invalid
   */
  public setError(error: string, fileUri?: string): void {
    const previousState = this.state.currentState;

    this.state.currentState = IRISAnalysisState.IDLE;
    this.state.analysisData = null;

    // Clear selection state
    this.deselectBlock();

    this.logStateTransition(previousState, IRISAnalysisState.IDLE, fileUri, { error });
    this.emit(IRISAnalysisState.IDLE);
  }

  /**
   * Transition to STALE state when file is modified
   * Clears selection state since block ranges may be invalidated
   */
  public setStale(): void {
    const previousState = this.state.currentState;

    if (previousState !== IRISAnalysisState.ANALYZED) {
      // Only transition to STALE from ANALYZED state
      return;
    }

    const fileUri = this.state.analysisData?.analyzedFileUri;
    this.state.currentState = IRISAnalysisState.STALE;

    // Clear selection state
    this.deselectBlock();

    this.logStateTransition(previousState, IRISAnalysisState.STALE, fileUri);
    this.emit(IRISAnalysisState.STALE);
  }

  /**
   * Reset to IDLE state (user-initiated or editor change)
   * Clear selection state on reset
   */
  public reset(): void {
    const previousState = this.state.currentState;

    this.state.currentState = IRISAnalysisState.IDLE;
    this.state.analysisData = null;
    this.state.activeFileUri = null;

    // Clear selection state
    this.deselectBlock();

    this.logStateTransition(previousState, IRISAnalysisState.IDLE, undefined, { reason: 'reset' });
    this.emit(IRISAnalysisState.IDLE);
  }

  // ========================================
  // READ-ONLY SELECTORS
  // ========================================

  /**
   * Get current state enum value
   */
  public getCurrentState(): IRISAnalysisState {
    return this.state.currentState;
  }

  /**
   * Get complete analysis data (null if not in ANALYZED state)
   */
  public getAnalysisData(): Readonly<AnalysisData> | null {
    return this.state.analysisData;
  }

  /**
   * Get file intent only
   */
  public getFileIntent(): FileIntent | null {
    return this.state.analysisData?.fileIntent ?? null;
  }

  /**
   * Get responsibility blocks only
   */
  public getResponsibilityBlocks(): readonly NormalizedResponsibilityBlock[] | null {
    return this.state.analysisData?.responsibilityBlocks ?? null;
  }

  /**
   * Get metadata only
   */
  public getMetadata(): Readonly<AnalysisMetadata> | null {
    return this.state.analysisData?.metadata ?? null;
  }

  /**
   * Get analyzed file URI
   */
  public getAnalyzedFileUri(): string | null {
    return this.state.analysisData?.analyzedFileUri ?? null;
  }

  /**
   * Get active file URI being tracked
   */
  public getActiveFileUri(): string | null {
    return this.state.activeFileUri;
  }

  /**
   * Check if analysis data is available
   */
  public hasAnalysisData(): boolean {
    return this.state.analysisData !== null;
  }

  /**
   * Check if currently analyzing
   */
  public isAnalyzing(): boolean {
    return this.state.currentState === IRISAnalysisState.ANALYZING;
  }

  /**
   * Check if analysis is stale
   */
  public isStale(): boolean {
    return this.state.currentState === IRISAnalysisState.STALE;
  }

  /**
   * Get raw server response (for debugging or advanced use)
   */
  public getRawResponse(): Readonly<IRISAnalysisResponse> | null {
    return this.state.analysisData?.rawResponse ?? null;
  }

  // ========================================
  // SELECTION STATE MANAGEMENT
  // ========================================

  /**
   * Select a block (pin/unpin model)
   */
  public selectBlock(blockId: string): void {
    const previousBlockId = this.state.selectionState.selectedBlockId;

    this.state.selectionState.selectedBlockId = blockId;
    this.state.selectionState.currentSegmentIndex = 0;  // Reset to first segment

    this.logger.info('Block selected', {
      blockId,
      previousBlockId,
      segmentIndex: 0
    });
  }

  /**
   * Deselect current block (pin/unpin model)
   */
  public deselectBlock(): void {
    const previousBlockId = this.state.selectionState.selectedBlockId;

    if (previousBlockId === null) {
      return; // Already deselected
    }

    this.state.selectionState.selectedBlockId = null;
    this.state.selectionState.currentSegmentIndex = 0;

    this.logger.info('Block deselected', {
      previousBlockId
    });
  }

  /**
   * Get current segment index for selected block
   */
  public getCurrentSegmentIndex(): number {
    return this.state.selectionState.currentSegmentIndex;
  }

  /**
   * Set current segment index for navigation
   */
  public setCurrentSegmentIndex(index: number): void {
    const previousIndex = this.state.selectionState.currentSegmentIndex;
    const blockId = this.state.selectionState.selectedBlockId;

    this.state.selectionState.currentSegmentIndex = index;

    this.logger.info('Segment navigation', {
      blockId,
      previousIndex,
      currentIndex: index
    });
  }

  /**
   * Get currently selected block ID
   */
  public getSelectedBlockId(): string | null {
    return this.state.selectionState.selectedBlockId;
  }

  /**
   * Check if a block is currently selected
   */
  public isBlockSelected(): boolean {
    return this.state.selectionState.selectedBlockId !== null;
  }

  // ========================================
  // LOGGING
  // ========================================

  /**
   * Log state transition with structured metadata
   */
  private logStateTransition(
    from: IRISAnalysisState,
    to: IRISAnalysisState,
    fileUri?: string,
    metadata?: Record<string, any>
  ): void {
    const message = `State transition: ${from} → ${to}`;
    const context = {
      from,
      to,
      fileUri,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    this.logger.info(message, context);
  }
}
