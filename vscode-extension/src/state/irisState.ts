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
 * Focus state for Phase 8: Focus Mode
 * Per TASK-0081, GOAL-008
 */
export interface FocusState {
  activeBlockId: string | null;  // null = no focus mode active
}

/**
 * Fold state for Phase 5: Double-Click Fold Behavior
 * Per TASK-035
 */
export interface FoldState {
  foldedBlockId: string | null;         // null = no block currently folded
  foldedRanges: Array<[number, number]> | null; // ZERO-based line ranges of folded gaps
}

/**
 * Complete extension state container
 * Per STATE-001: Single source of truth
 */
interface ExtensionState {
  currentState: IRISAnalysisState;
  analysisData: AnalysisData | null;
  activeFileUri: string | null;  // Currently active file being tracked
  focusState: FocusState;         // Phase 8: Focus Mode state
  foldState: FoldState;           // Phase 5: Fold state tracking
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
      focusState: { activeBlockId: null },
      foldState: { foldedBlockId: null, foldedRanges: null }
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
   */
  public setError(error: string, fileUri?: string): void {
    const previousState = this.state.currentState;
    
    this.state.currentState = IRISAnalysisState.IDLE;
    this.state.analysisData = null;
    
    this.logStateTransition(previousState, IRISAnalysisState.IDLE, fileUri, { error });
    this.stateChangeEmitter.fire(IRISAnalysisState.IDLE);
  }

  /**
   * Transition to STALE state when file is modified
   * Per STATE-003
   * Phase 8: Exit Focus Mode per TASK-0086
   * Phase 5: Clear Fold State per TASK-039
   */
  public setStale(): void {
    const previousState = this.state.currentState;
    
    if (previousState !== IRISAnalysisState.ANALYZED) {
      // Only transition to STALE from ANALYZED state
      return;
    }

    const fileUri = this.state.analysisData?.analyzedFileUri;
    this.state.currentState = IRISAnalysisState.STALE;
    
    // Exit Focus Mode per TASK-0086
    this.clearFocus();
    
    // Clear Fold State per TASK-039
    this.clearFold();
    
    this.logStateTransition(previousState, IRISAnalysisState.STALE, fileUri);
    this.stateChangeEmitter.fire(IRISAnalysisState.STALE);
  }

  /**
   * Reset to IDLE state (user-initiated or editor change)
   * Phase 8: Exit Focus Mode per TASK-0086
   * Phase 5: Clear Fold State per TASK-039
   */
  public reset(): void {
    const previousState = this.state.currentState;
    
    this.state.currentState = IRISAnalysisState.IDLE;
    this.state.analysisData = null;
    this.state.activeFileUri = null;
    
    // Exit Focus Mode per TASK-0086
    this.clearFocus();
    
    // Clear Fold State per TASK-039
    this.clearFold();
    
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
  // FOCUS STATE MANAGEMENT (Phase 8)
  // ========================================

  /**
   * Enter Focus Mode for a specific block
   * Per TASK-0081, GOAL-008
   */
  public setFocusedBlock(blockId: string): void {
    const previousBlockId = this.state.focusState.activeBlockId;
    this.state.focusState.activeBlockId = blockId;
    
    this.logger.info('Entered Focus Mode', { 
      blockId, 
      previousBlockId 
    });
  }

  /**
   * Exit Focus Mode
   * Per TASK-0085
   */
  public clearFocus(): void {
    const previousBlockId = this.state.focusState.activeBlockId;
    
    if (previousBlockId === null) {
      return; // Already not focused
    }
    
    this.state.focusState.activeBlockId = null;
    
    this.logger.info('Exited Focus Mode', { 
      previousBlockId 
    });
  }

  /**
   * Get current focused block ID
   */
  public getFocusedBlockId(): string | null {
    return this.state.focusState.activeBlockId;
  }

  /**
   * Check if Focus Mode is active
   */
  public isFocusModeActive(): boolean {
    return this.state.focusState.activeBlockId !== null;
  }

  // ========================================
  // FOLD STATE MANAGEMENT (Phase 5)
  // ========================================

  /**
   * Set fold state for a block with folded ranges
   * Per TASK-035, GOAL-005
   */
  public setFoldedBlock(blockId: string, foldedRanges: Array<[number, number]>): void {
    this.state.foldState.foldedBlockId = blockId;
    this.state.foldState.foldedRanges = foldedRanges;
    
    this.logger.info('Set fold state', { 
      blockId, 
      foldedRangeCount: foldedRanges.length 
    });
  }

  /**
   * Clear fold state
   * Per TASK-037, TASK-039
   */
  public clearFold(): void {
    const previousBlockId = this.state.foldState.foldedBlockId;
    
    if (previousBlockId === null) {
      return; // Already not folded
    }
    
    this.state.foldState.foldedBlockId = null;
    this.state.foldState.foldedRanges = null;
    
    this.logger.info('Cleared fold state', { 
      previousBlockId 
    });
  }

  /**
   * Get current folded block ID
   */
  public getFoldedBlockId(): string | null {
    return this.state.foldState.foldedBlockId;
  }

  /**
   * Get current folded ranges (ZERO-based line numbers)
   */
  public getFoldedRanges(): Array<[number, number]> | null {
    return this.state.foldState.foldedRanges;
  }

  /**
   * Check if a specific block is currently folded
   */
  public isBlockFolded(blockId: string): boolean {
    return this.state.foldState.foldedBlockId === blockId;
  }

  /**
   * Check if any block is folded
   */
  public isFoldActive(): boolean {
    return this.state.foldState.foldedBlockId !== null;
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
