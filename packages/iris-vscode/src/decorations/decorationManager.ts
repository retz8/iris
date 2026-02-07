import * as vscode from 'vscode';
import type { NormalizedResponsibilityBlock } from '@iris/core';
import { createLogger, Logger } from '../utils/logger';
import { generateBlockColor, generateBlockColorOpaque } from '../utils/colorAssignment';

/**
 * Decoration range in ZERO-based VS Code format
 * Converted from ONE-based API ranges
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
 * Decoration Manager for block highlighting and selection
 *
 * Responsibilities:
 * - Create and cache decorations per blockId
 * - Generate deterministic colors from blockId
 * - Convert ONE-based API ranges to ZERO-based VS Code ranges
 * - Apply decorations on BLOCK_HOVER
 * - Clear decorations on BLOCK_CLEAR, IDLE, STALE
 * - Dispose all decoration types
 * - Pin/unpin block selection with persistent highlighting
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
   * Uses golden ratio distribution for visual distinctiveness and WCAG AA compliance
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
    
    // Use 0.25 alpha for all block highlighting (single alpha for hover and selection)
    const baseColor = generateBlockColor(blockId, isDarkTheme);
    // Adjust alpha to 0.25 for consistent highlighting (same for hover and selection)
    const backgroundColor = baseColor.replace(/,\s*[\d.]+\)$/, ', 0.25)');
    const opaqueColor = generateBlockColorOpaque(blockId, isDarkTheme);
    
    // Use backgroundColor only (overlay-only), no borders/before/after
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
  // BLOCK SELECTION
  // ========================================

  /**
   * Prepare decoration data for a responsibility block
   * Converts ranges and creates/caches decoration type
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
   * Hover is disabled while a block is selected (pin/unpin model)
   */
  public applyBlockHover(
    editor: vscode.TextEditor, 
    block: NormalizedResponsibilityBlock
  ): void {
    // Disable hover decorations while block is selected
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
  // BLOCK SELECTION - Pin/Unpin model
  // ========================================

  /**
   * Apply block selection highlighting
   * Applies persistent highlighting to all segments with consistent color
   */
  public applyBlockSelection(
    editor: vscode.TextEditor,
    block: NormalizedResponsibilityBlock
  ): void {
    // Clear any existing hover first
    this.clearCurrentHighlight(editor);

    // Clear previous block selection before applying new one
    this.clearBlockSelection(editor);

    // Prepare and apply decoration using same style as hover (0.25 alpha)
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
   * Called on state transitions (STALE, IDLE) or extension deactivation
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
   */
  public dispose(): void {
    this.disposeAllDecorations();
    this.logger.info('Decoration manager disposed');
  }
}
