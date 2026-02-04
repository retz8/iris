import * as vscode from 'vscode';
import * as crypto from 'crypto';
import type { NormalizedResponsibilityBlock } from '../state/irisState';
import { createLogger, Logger } from '../utils/logger';
import { generateBlockColor, generateBlockColorOpaque } from '../utils/colorAssignment';

/**
 * Decoration range in ZERO-based VS Code format
 * Converted from ONE-based API ranges per TASK-0073
 */
interface DecorationRange {
  startLine: number;  // ZERO-based
  endLine: number;    // ZERO-based
}

/**
 * Decoration data for a single responsibility block
 */
interface BlockDecorationData {
  blockId: string;
  ranges: DecorationRange[];
  decorationType: vscode.TextEditorDecorationType;
}

/**
 * Decoration Manager implementing GOAL-007 and UI Refinement 2: Block Selection
 * 
 * Responsibilities:
 * - Create and cache decorations per blockId (TASK-0071)
 * - Generate deterministic colors from blockId (ED-002, TASK-0072)
 * - Convert ONE-based API ranges to ZERO-based VS Code ranges (TASK-0073)
 * - Apply decorations on BLOCK_HOVER (TASK-0074)
 * - Clear decorations on BLOCK_CLEAR, IDLE, STALE (TASK-0075, ED-003)
 * - Dispose all decoration types (TASK-0076, ED-003)
 * - Log decoration lifecycle (TASK-0077, LOG-001)
 * - UI Refinement 2: Pin/unpin block selection with persistent highlighting (REQ-053, REQ-054)
 * 
 * Constraints:
 * - ED-001: Use only TextEditorDecorationType (overlay-only)
 * - ED-002: Deterministic color generation from blockId
 * - ED-003: Immediate disposal to prevent memory leaks
 */
export class DecorationManager implements vscode.Disposable {
  private decorationCache: Map<string, BlockDecorationData>;
  private currentlyHighlightedBlockId: string | null;
  private currentlyFocusedBlockId: string | null;  // UI Refinement 2: Tracks selected/pinned block
  private outputChannel: vscode.OutputChannel;
  private logger: Logger;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.logger = createLogger(outputChannel, 'DecorationManager');
    this.decorationCache = new Map();
    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    
    this.logger.info('Decoration manager initialized');
  }

  /**
   * Generate deterministic color from blockId using smart color assignment
   * Phase 7: Smart Color Assignment (TASK-051)
   * 
   * Uses golden ratio distribution for visual distinctiveness and WCAG AA compliance
   * Delegates to colorAssignment utility for intelligent color generation
   */
  private generateColorFromBlockId(blockId: string): string {
    // Detect current theme (dark vs light)
    const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
                        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
    
    // Generate visually distinct, accessible color
    const color = generateBlockColor(blockId, isDarkTheme);
    
    this.logger.debug(`Generated color for blockId`, { blockId, color, isDarkTheme });
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
  private convertRangesToVSCode(apiRanges: Array<[number, number]>): DecorationRange[] {
    const vscodeRanges = apiRanges.map(([start, end]) => ({
      startLine: start - 1,  // Convert ONE-based to ZERO-based
      endLine: end - 1       // Convert ONE-based to ZERO-based
    }));
    
    this.logger.debug(`Converted ${apiRanges.length} ranges from ONE-based to ZERO-based`);
    return vscodeRanges;
  }

  /**
   * Create or retrieve cached decoration type for a blockId
   * Per TASK-0071, ED-001, Phase 7 (TASK-051)
   * 
   * Uses TextEditorDecorationType for overlay-only highlighting
   * Caches decoration types to prevent redundant creation
   * Phase 7: Uses smart color assignment with alpha transparency
   */
  private getOrCreateDecorationType(blockId: string): vscode.TextEditorDecorationType {
    const cached = this.decorationCache.get(blockId);
    if (cached) {
      this.logger.debug( 'Using cached decoration type', { blockId });
      return cached.decorationType;
    }

    // Detect current theme
    const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
                        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
    
    // REQ-055: Use 0.25 alpha for all block highlighting (single alpha for hover and selection)
    const baseColor = generateBlockColor(blockId, isDarkTheme);
    // Adjust alpha to 0.25 for consistent highlighting (same for hover and selection)
    const backgroundColor = baseColor.replace(/,\s*[\d.]+\)$/, ', 0.25)');
    const opaqueColor = generateBlockColorOpaque(blockId, isDarkTheme);
    
    // Create decoration type per ED-001 (overlay-only)
    // TASK-055, TASK-056: Use backgroundColor only, no borders/before/after
    // TASK-057: Set rangeBehavior to ClosedClosed for precise highlighting
    // CON-003: 0.25 alpha maintains WCAG AA contrast compliance for both light and dark themes
    const decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: backgroundColor,  // rgba with 0.25 alpha - renders behind text
      isWholeLine: true,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      overviewRulerColor: opaqueColor,   // Opaque for ruler visibility only
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });

    this.logger.info( 'Created new decoration type', { blockId, backgroundColor });
    return decorationType;
  }

  // ========================================
  // BLOCK SELECTION (UI Refinement 2: Phase 4)
  // REQ-049 to REQ-055: Replaced focus mode with pin/unpin selection model
  // ========================================

  /**
   * Prepare decoration data for a responsibility block
   * Converts ranges and creates/caches decoration type
   * Per TASK-0071, TASK-0073
   */
  private prepareBlockDecoration(block: NormalizedResponsibilityBlock): BlockDecorationData {
    const cached = this.decorationCache.get(block.blockId);
    if (cached) {
      return cached;
    }

    const decorationType = this.getOrCreateDecorationType(block.blockId);
    const ranges = this.convertRangesToVSCode(block.ranges);

    const decorationData: BlockDecorationData = {
      blockId: block.blockId,
      ranges,
      decorationType
    };

    this.decorationCache.set(block.blockId, decorationData);
    
    this.logger.info( 'Prepared block decoration', { 
      blockId: block.blockId, 
      rangeCount: ranges.length,
      label: block.label 
    });

    return decorationData;
  }

  /**
   * Apply decorations for a specific block on BLOCK_HOVER
   * Per TASK-0074
   * Per TASK-0084: Disable hover while block is selected (pin/unpin model)
   * 
   * @param editor - The text editor to apply decorations to
   * @param block - The responsibility block to highlight
   */
  public applyBlockHover(
    editor: vscode.TextEditor, 
    block: NormalizedResponsibilityBlock
  ): void {
    // TASK-0084: Disable hover decorations while block is selected
    if (this.currentlyFocusedBlockId !== null) {
      this.logger.info('Hover disabled while block selected', { 
        blockId: block.blockId,
        selectedBlockId: this.currentlyFocusedBlockId
      });
      return;
    }

    // Clear any existing highlights first
    this.clearCurrentHighlight(editor);

    const decorationData = this.prepareBlockDecoration(block);
    
    // Convert decoration ranges to VS Code Range objects
    const vscodeRanges = decorationData.ranges.map(range => 
      new vscode.Range(
        new vscode.Position(range.startLine, 0),
        new vscode.Position(range.endLine, Number.MAX_SAFE_INTEGER)
      )
    );

    // Apply decorations using VS Code API
    editor.setDecorations(decorationData.decorationType, vscodeRanges);
    
    this.currentlyHighlightedBlockId = block.blockId;
    
    this.logger.info( 'Applied block hover decorations', { 
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
  public clearCurrentHighlight(editor: vscode.TextEditor): void {
    if (!this.currentlyHighlightedBlockId) {
      return;
    }

    const decorationData = this.decorationCache.get(this.currentlyHighlightedBlockId);
    if (decorationData) {
      editor.setDecorations(decorationData.decorationType, []);
      this.logger.info( 'Cleared block highlight', { 
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
  public clearAllDecorations(editor?: vscode.TextEditor): void {
    if (editor) {
      // Clear all decorations from specific editor
      for (const decorationData of this.decorationCache.values()) {
        editor.setDecorations(decorationData.decorationType, []);
      }
      
      this.logger.info('Cleared all decorations from editor', { 
        editorUri: editor.document.uri.toString() 
      });
    }

    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    this.logger.info('Cleared all decoration state');
  }

  // ========================================
  // BLOCK SELECTION (UI Refinement 2: Phase 4)
  // REQ-053, REQ-054: Pin/Unpin selection model
  // ========================================

  /**
   * Apply block selection highlighting
   * REQ-053: Applies persistent highlighting to all segments with consistent color
   * 
   * Block selection (pin/unpin model):
   * - Uses same 0.25 alpha decoration as hover for visual consistency (REQ-055)
   * - Applies highlighting to ALL segments of the block simultaneously
   * - Persists until block is deselected (unlike hover which clears on mouse out)
   * - No dimming of other blocks (simplified from focus mode)
   * 
   * Replaces focus mode - no dimming, just persistent highlighting on selected block
   * 
   * @param editor - The text editor to apply selection decorations
   * @param block - The selected responsibility block to highlight
   */
  public applyBlockSelection(
    editor: vscode.TextEditor,
    block: NormalizedResponsibilityBlock
  ): void {
    // Clear any existing hover first
    this.clearCurrentHighlight(editor);

    // Prepare and apply decoration using same style as hover (0.25 alpha per REQ-055)
    const decorationData = this.prepareBlockDecoration(block);
    
    const vscodeRanges = decorationData.ranges.map(range => 
      new vscode.Range(
        new vscode.Position(range.startLine, 0),
        new vscode.Position(range.endLine, Number.MAX_SAFE_INTEGER)
      )
    );

    // Apply selection highlighting across all segments
    editor.setDecorations(decorationData.decorationType, vscodeRanges);
    
    this.currentlyFocusedBlockId = block.blockId;  // Track selected block

    this.logger.info('Applied block selection', {
      blockId: block.blockId,
      rangeCount: vscodeRanges.length,
      label: block.label
    });
  }

  /**
   * Clear block selection highlighting
   * REQ-054: Clears selection highlights for a specific block
   * 
   * @param editor - The text editor to clear selection decorations from
   * @param blockId - The block ID to clear (optional, clears current if not provided)
   */
  public clearBlockSelection(editor: vscode.TextEditor, blockId?: string): void {
    const targetBlockId = blockId || this.currentlyFocusedBlockId;
    
    if (!targetBlockId) {
      return; // No block selected
    }

    const decorationData = this.decorationCache.get(targetBlockId);
    if (decorationData) {
      editor.setDecorations(decorationData.decorationType, []);
      this.logger.info('Cleared block selection', { blockId: targetBlockId });
    }

    this.currentlyFocusedBlockId = null;
  }

  /**
   * Dispose all decoration types
   * Per TASK-0076, ED-003
   * 
   * Called on state transitions (STALE, IDLE) or extension deactivation
   * Prevents memory leaks by properly disposing TextEditorDecorationType instances
   */
  public disposeAllDecorations(): void {
    const decorationCount = this.decorationCache.size;
    
    // Dispose all decorations
    for (const decorationData of this.decorationCache.values()) {
      decorationData.decorationType.dispose();
    }
    
    this.decorationCache.clear();
    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    
    this.logger.info('Disposed all decoration types', { 
      decorationCount
    });
  }

  /**
   * Get currently highlighted block ID
   */
  public getCurrentlyHighlightedBlockId(): string | null {
    return this.currentlyHighlightedBlockId;
  }

  /**
   * Check if decorations exist for a block
   */
  public hasDecorationsForBlock(blockId: string): boolean {
    return this.decorationCache.has(blockId);
  }

  /**
   * Get count of cached decorations
   */
  public getCachedDecorationCount(): number {
    return this.decorationCache.size;
  }

  /**
   * Dispose manager and all resources
   * Per ED-003, TASK-0105
   */
  public dispose(): void {
    this.disposeAllDecorations();
    this.logger.info('Decoration manager disposed');
  }
}
