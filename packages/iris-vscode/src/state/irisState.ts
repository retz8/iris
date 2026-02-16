import * as vscode from 'vscode';
import {
  IRISCoreState,
  IRISAnalysisState,
  type AnalysisData,
  type FileIntent,
  type AnalysisMetadata,
  type NormalizedResponsibilityBlock,
  type IRISAnalysisResponse,
  type SelectionState,
  type ErrorDetails
} from '@iris/core';
import { createLogger } from '../utils/logger';

// Re-export core types so existing local imports don't break during migration
export { IRISAnalysisState } from '@iris/core';
export type {
  FileIntent,
  ResponsibilityBlock,
  AnalysisMetadata,
  NormalizedResponsibilityBlock,
  IRISAnalysisResponse,
  AnalysisData,
  SelectionState,
  ErrorDetails
} from '@iris/core';

/**
 * VS Code adapter wrapping IRISCoreState
 * Bridges core callback listener → vscode.EventEmitter/vscode.Event
 * Injects VS Code logger implementation
 */
export class IRISStateManager {
  private core: IRISCoreState;
  private stateChangeEmitter: vscode.EventEmitter<IRISAnalysisState>;
  public readonly onStateChange: vscode.Event<IRISAnalysisState>;

  constructor(outputChannel: vscode.OutputChannel) {
    const logger = createLogger(outputChannel, 'StateManager');
    this.core = new IRISCoreState(logger);

    this.stateChangeEmitter = new vscode.EventEmitter<IRISAnalysisState>();
    this.onStateChange = this.stateChangeEmitter.event;

    // Bridge core callbacks → vscode.EventEmitter
    this.core.onStateChange((state) => {
      this.stateChangeEmitter.fire(state);
    });
  }

  // State transitions
  startAnalysis(fileUri: string): void { this.core.startAnalysis(fileUri); }
  setAnalyzed(data: AnalysisData): void { this.core.setAnalyzed(data); }
  setError(errorDetails: ErrorDetails, fileUri?: string): void { this.core.setError(errorDetails, fileUri); }
  setStale(): void { this.core.setStale(); }
  reset(): void { this.core.reset(); }

  // Selectors
  getCurrentState(): IRISAnalysisState { return this.core.getCurrentState(); }
  getAnalysisData(): Readonly<AnalysisData> | null { return this.core.getAnalysisData(); }
  getFileIntent(): FileIntent | null { return this.core.getFileIntent(); }
  getResponsibilityBlocks(): readonly NormalizedResponsibilityBlock[] | null { return this.core.getResponsibilityBlocks(); }
  getMetadata(): Readonly<AnalysisMetadata> | null { return this.core.getMetadata(); }
  getAnalyzedFileUri(): string | null { return this.core.getAnalyzedFileUri(); }
  getActiveFileUri(): string | null { return this.core.getActiveFileUri(); }
  hasAnalysisData(): boolean { return this.core.hasAnalysisData(); }
  isAnalyzing(): boolean { return this.core.isAnalyzing(); }
  isStale(): boolean { return this.core.isStale(); }
  getErrorDetails(): Readonly<ErrorDetails> | null { return this.core.getErrorDetails(); }
  hasError(): boolean { return this.core.hasError(); }
  getRawResponse(): Readonly<IRISAnalysisResponse> | null { return this.core.getRawResponse(); }

  // Selection
  selectBlock(blockId: string): void { this.core.selectBlock(blockId); }
  deselectBlock(): void { this.core.deselectBlock(); }
  getCurrentSegmentIndex(): number { return this.core.getCurrentSegmentIndex(); }
  setCurrentSegmentIndex(index: number): void { this.core.setCurrentSegmentIndex(index); }
  getSelectedBlockId(): string | null { return this.core.getSelectedBlockId(); }
  isBlockSelected(): boolean { return this.core.isBlockSelected(); }

  // Lifecycle
  dispose(): void {
    this.core.dispose();
    this.stateChangeEmitter.dispose();
  }
}
