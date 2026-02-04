import * as vscode from 'vscode';
import { createLogger, Logger } from '../utils/logger';

/**
 * Extension state machine enum per STATE-001
 * Defines all possible analysis states
 */
export enum IRISAnalysisState {
  IDLE = 'IDLE',                 // No analysis in progress or completed
  ANALYZING = 'ANALYZING',       // Analysis request in flight
  ANALYZED = 'ANALYZED',         // Valid analysis results available
  STALE = 'STALE'                // Analysis outdated due to file modifications
}

/**
 * File Intent is a simple string describing file purpose (not an object)
 * Per TASK-0043
 */
export type FileIntent = string;

/**
 * Responsibility Block structure matching API response format
 * Per TASK-0043
 */
export interface ResponsibilityBlock {
  description: string;
  label: string;
  ranges: Array<[number, number]>;  // ONE-based line numbers from API
}

/**
 * Analysis metadata with optional standard fields and extensibility
 * Per TASK-0043
 */
export interface AnalysisMetadata {
  filepath?: string;
  url?: string;
  [key: string]: any;  // Allow arbitrary additional fields
}

/**
 * Normalized responsibility block with extension-generated blockId
 * Used internally after API response normalization
 */
export interface NormalizedResponsibilityBlock extends ResponsibilityBlock {
  blockId: string;  // Added during Phase 6 normalization
}

/**
 * Raw server response structure matching API contract from Phase 3
 */
export interface IRISAnalysisResponse {
  file_intent: string;
  metadata: AnalysisMetadata;
  responsibility_blocks: ResponsibilityBlock[];
}

/**
 * Internal analysis data structure storing both raw and normalized data
 * Per TASK-0044
 */
export interface AnalysisData {
  fileIntent: FileIntent;
  metadata: AnalysisMetadata;
  responsibilityBlocks: NormalizedResponsibilityBlock[];
  rawResponse: IRISAnalysisResponse;  // Preserve original server response
  analyzedFileUri: string;             // URI of the analyzed file
  analyzedAt: Date;                    // Timestamp of analysis completion
}

/**
 * Selection state for UI Refinement 2: Pin/Unpin Block Selection
 * Per REQ-003
 */
export interface SelectionState {
  selectedBlockId: string | null;  // null = no block selected
  currentSegmentIndex: number;      // Current segment being viewed (0-based)
}

/**
 * Complete extension state container
 * Per STATE-001: Single source of truth
 */
interface ExtensionState {
  currentState: IRISAnalysisState;
  analysisData: AnalysisData | null;
  activeFileUri: string | null;  // Currently active file being tracked
  selectionState: SelectionState;  // UI Refinement 2: Pin/Unpin selection tracking
}

/**
 * Centralized state manager implementing STATE-001 (single source of truth)
 * Manages all state transitions and enforces STATE-002 (explicit transitions)
 * 
 * Responsibilities:
 * - Maintain single in-memory state container
 * - Enforce explicit state transitions with validation
 * - Log all transitions per LOG-001, LOG-002
 * - Provide read-only access per REQ-004
 */
export class IRISStateManager {
  private state: ExtensionState;
  private outputChannel: vscode.OutputChannel;
  private logger: Logger;
  private stateChangeEmitter: vscode.EventEmitter<IRISAnalysisState>;
  
  /**
   * Event fired when state changes
   * Allows UI components to react to state transitions
   */
  public readonly onStateChange: vscode.Event<IRISAnalysisState>;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.logger = createLogger(outputChannel, 'StateManager');
    this.stateChangeEmitter = new vscode.EventEmitter<IRISAnalysisState>();
    this.onStateChange = this.stateChangeEmitter.event;
    
    this.state = {
      currentState: IRISAnalysisState.IDLE,
      analysisData: null,
      activeFileUri: null,
      selectionState: { selectedBlockId: null, currentSegmentIndex: 0 }
    };
    
    this.logger.info('State manager initialized', { initialState: IRISAnalysisState.IDLE });
  }
  
  /**
   * Dispose resources
   */
  public dispose(): void {
    this.stateChangeEmitter.dispose();
  }

  /**
   * Transition to ANALYZING state when analysis request starts
   * Per STATE-002, TASK-0045
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
    this.stateChangeEmitter.fire(IRISAnalysisState.ANALYZING);
  }

  /**
   * Transition to ANALYZED state on successful analysis with valid schema
   * Per STATE-002, TASK-0046
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
    this.stateChangeEmitter.fire(IRISAnalysisState.ANALYZED);
  }

  /**
   * Transition to IDLE state on error or invalid schema
   * Per STATE-002, TASK-0047, API-002
   * 
   * REQ-007: Clear selection state when analysis fails
   * Rationale: Selected block becomes invalid when analysis data is cleared
   * This ensures UI doesn't show stale selection for non-existent blocks
   */
  public setError(error: string, fileUri?: string): void {
    const previousState = this.state.currentState;
    
    this.state.currentState = IRISAnalysisState.IDLE;
    this.state.analysisData = null;
    
    // Clear selection state per REQ-007
    this.deselectBlock();
    
    this.logStateTransition(previousState, IRISAnalysisState.IDLE, fileUri, { error });
    this.stateChangeEmitter.fire(IRISAnalysisState.IDLE);
  }

  /**
   * Transition to STALE state when file is modified
   * Per STATE-003
   * 
   * REQ-008: Clear selection state when analysis becomes stale
   * Rationale: File modifications may invalidate block ranges, so deselect to prevent
   * highlighting incorrect code regions. User must re-analyze to select blocks again.
   */
  public setStale(): void {
    const previousState = this.state.currentState;
    
    if (previousState !== IRISAnalysisState.ANALYZED) {
      // Only transition to STALE from ANALYZED state
      return;
    }

    const fileUri = this.state.analysisData?.analyzedFileUri;
    this.state.currentState = IRISAnalysisState.STALE;
    
    // Clear selection state per REQ-008
    this.deselectBlock();
    
    this.logStateTransition(previousState, IRISAnalysisState.STALE, fileUri);
    this.stateChangeEmitter.fire(IRISAnalysisState.STALE);
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
    this.stateChangeEmitter.fire(IRISAnalysisState.IDLE);
  }

  // ========================================
  // READ-ONLY SELECTORS per REQ-004
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
  // SELECTION STATE MANAGEMENT (UI Refinement 2)
  // ========================================

  /**
   * Select a block (pin/unpin model)
   * Per REQ-005
   * CON-001: Log selection with structured logging
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
   * Per REQ-005
   * CON-001: Log deselection with structured logging
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
   * Per REQ-005
   */
  public getCurrentSegmentIndex(): number {
    return this.state.selectionState.currentSegmentIndex;
  }

  /**
   * Set current segment index for navigation
   * Per REQ-005
   * CON-001: Log segment navigation with structured logging
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
   * Per REQ-006
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
  // LOGGING per LOG-001, LOG-002
  // ========================================

  /**
   * Log state transition with structured metadata
   * Per STATE-002, LOG-001, LOG-002
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
