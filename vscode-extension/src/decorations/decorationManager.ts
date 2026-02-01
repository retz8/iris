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
 * Decoration Manager implementing GOAL-007 and Phase 8: Focus Mode
 * 
 * Responsibilities:
 * - Create and cache decorations per blockId (TASK-0071)
 * - Generate deterministic colors from blockId (ED-002, TASK-0072)
 * - Convert ONE-based API ranges to ZERO-based VS Code ranges (TASK-0073)
 * - Apply decorations on BLOCK_HOVER (TASK-0074)
 * - Clear decorations on BLOCK_CLEAR, IDLE, STALE (TASK-0075, ED-003)
 * - Dispose all decoration types (TASK-0076, ED-003)
 * - Log decoration lifecycle (TASK-0077, LOG-001)
 * - Phase 8: Implement Focus Mode with enhanced decorations (TASK-0082, TASK-0083)
 * 
 * Constraints:
 * - ED-001: Use only TextEditorDecorationType (overlay-only)
 * - ED-002: Deterministic color generation from blockId
 * - ED-003: Immediate disposal to prevent memory leaks
 */
export class DecorationManager implements vscode.Disposable {
  private decorationCache: Map<string, BlockDecorationData>;
  private focusedDecorationCache: Map<string, vscode.TextEditorDecorationType>;
  private dimmingDecorationType: vscode.TextEditorDecorationType | null;
  private currentlyHighlightedBlockId: string | null;
  private currentlyFocusedBlockId: string | null;
  private outputChannel: vscode.OutputChannel;
  private logger: Logger;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.logger = createLogger(outputChannel, 'DecorationManager');
    this.decorationCache = new Map();
    this.focusedDecorationCache = new Map();
    this.dimmingDecorationType = null;
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
    
    // Generate background color with 0.2 alpha for subtle hover (TASK-058)
    const baseColor = generateBlockColor(blockId, isDarkTheme);
    // Adjust alpha to 0.2 for hover state (highlights behind text)
    const backgroundColor = baseColor.replace(/,\s*[\d.]+\)$/, ', 0.2)');
    const opaqueColor = generateBlockColorOpaque(blockId, isDarkTheme);
    
    // Create decoration type per ED-001 (overlay-only)
    // TASK-055, TASK-056: Use backgroundColor only, no borders/before/after
    // TASK-057: Set rangeBehavior to ClosedClosed for precise highlighting
    const decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: backgroundColor,  // rgba with 0.2 alpha - renders behind text
      isWholeLine: true,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      overviewRulerColor: opaqueColor,   // Opaque for ruler visibility only
      overviewRulerLane: vscode.OverviewRulerLane.Right
    });

    this.logger.info( 'Created new decoration type', { blockId, backgroundColor });
    return decorationType;
  }

  /**
   * Create focused decoration type for a blockId
   * Per TASK-0082: Implement focused decoration style distinct from hover
   * Phase 7 (TASK-051): Uses smart color assignment with enhanced alpha
   * 
   * Focused decorations have enhanced emphasis compared to hover
   */
  private getOrCreateFocusedDecorationType(blockId: string): vscode.TextEditorDecorationType {
    const cached = this.focusedDecorationCache.get(blockId);
    if (cached) {
      return cached;
    }

    // Detect current theme
    const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
                        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
    
    // Generate background color with 0.3 alpha for prominent focus (TASK-058)
    const baseColor = generateBlockColor(blockId, isDarkTheme);
    // Use 0.3 alpha for focus mode (more prominent than hover, still behind text)
    const backgroundColor = baseColor.replace(/,\s*[\d.]+\)$/, ', 0.3)');
    const opaqueColor = generateBlockColorOpaque(blockId, isDarkTheme);
    
    // Create enhanced decoration for focus mode
    // TASK-055, TASK-056: Use backgroundColor only, no borders/before/after
    // TASK-057: Set rangeBehavior to ClosedClosed for precise highlighting
    const decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: backgroundColor,  // rgba with 0.3 alpha - renders behind text
      isWholeLine: true,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      overviewRulerColor: opaqueColor,   // Opaque for ruler visibility only
      overviewRulerLane: vscode.OverviewRulerLane.Center
    });

    this.focusedDecorationCache.set(blockId, decorationType);
    this.logger.info( 'Created focused decoration type', { blockId, backgroundColor });
    return decorationType;
  }

  /**
   * Get or create dimming decoration type
   * Per TASK-0083: Apply selective dimming to non-focused blocks
   */
  private getOrCreateDimmingDecorationType(): vscode.TextEditorDecorationType {
    if (this.dimmingDecorationType) {
      return this.dimmingDecorationType;
    }

    this.dimmingDecorationType = vscode.window.createTextEditorDecorationType({
      opacity: '0.4',
      isWholeLine: true
    });

    this.logger.info( 'Created dimming decoration type');
    return this.dimmingDecorationType;
  }

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
   * Per TASK-0084: Disable hover while in Focus Mode
   * 
   * @param editor - The text editor to apply decorations to
   * @param block - The responsibility block to highlight
   */
  public applyBlockHover(
    editor: vscode.TextEditor, 
    block: NormalizedResponsibilityBlock
  ): void {
    // TASK-0084: Disable hover decorations while focused
    if (this.currentlyFocusedBlockId !== null) {
      this.logger.info( 'Hover disabled while in Focus Mode', { 
        blockId: block.blockId,
        focusedBlockId: this.currentlyFocusedBlockId
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
      // Clear hover decorations from specific editor
      for (const decorationData of this.decorationCache.values()) {
        editor.setDecorations(decorationData.decorationType, []);
      }
      
      // Clear focused decorations
      for (const decorationType of this.focusedDecorationCache.values()) {
        editor.setDecorations(decorationType, []);
      }
      
      // Clear dimming
      if (this.dimmingDecorationType) {
        editor.setDecorations(this.dimmingDecorationType, []);
      }
      
      this.logger.info( 'Cleared all decorations from editor', { 
        editorUri: editor.document.uri.toString() 
      });
    }

    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    this.logger.info( 'Cleared all decoration state');
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
  public applyFocusMode(
    editor: vscode.TextEditor,
    focusedBlock: NormalizedResponsibilityBlock,
    allBlocks: readonly NormalizedResponsibilityBlock[]
  ): void {
    // Clear any existing decorations first
    this.clearCurrentHighlight(editor);
    this.clearFocusMode(editor);

    // Create focused decoration for the active block
    const focusedDecorationType = this.getOrCreateFocusedDecorationType(focusedBlock.blockId);
    const focusedData = this.prepareBlockDecoration(focusedBlock);
    
    const focusedRanges = focusedData.ranges.map(range => 
      new vscode.Range(
        new vscode.Position(range.startLine, 0),
        new vscode.Position(range.endLine, Number.MAX_SAFE_INTEGER)
      )
    );

    // Apply enhanced decoration to focused block
    editor.setDecorations(focusedDecorationType, focusedRanges);

    // Apply dimming to all other blocks (TASK-0083)
    const dimmingDecorationType = this.getOrCreateDimmingDecorationType();
    const dimmingRanges: vscode.Range[] = [];

    for (const block of allBlocks) {
      if (block.blockId !== focusedBlock.blockId) {
        const blockData = this.prepareBlockDecoration(block);
        const blockRanges = blockData.ranges.map(range => 
          new vscode.Range(
            new vscode.Position(range.startLine, 0),
            new vscode.Position(range.endLine, Number.MAX_SAFE_INTEGER)
          )
        );
        dimmingRanges.push(...blockRanges);
      }
    }

    if (dimmingRanges.length > 0) {
      editor.setDecorations(dimmingDecorationType, dimmingRanges);
    }

    this.currentlyFocusedBlockId = focusedBlock.blockId;

    this.logger.info( 'Applied Focus Mode', {
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
  public clearFocusMode(editor: vscode.TextEditor): void {
    if (this.currentlyFocusedBlockId === null) {
      return; // Not in focus mode
    }

    const previousFocusedBlockId = this.currentlyFocusedBlockId;

    // Clear focused decorations
    for (const decorationType of this.focusedDecorationCache.values()) {
      editor.setDecorations(decorationType, []);
    }

    // Clear dimming
    if (this.dimmingDecorationType) {
      editor.setDecorations(this.dimmingDecorationType, []);
    }

    this.currentlyFocusedBlockId = null;

    this.logger.info( 'Cleared Focus Mode', {
      previousFocusedBlockId
    });
  }

  /**
   * Check if currently in Focus Mode
   */
  public isFocusModeActive(): boolean {
    return this.currentlyFocusedBlockId !== null;
  }

  /**
   * Get currently focused block ID
   */
  public getFocusedBlockId(): string | null {
    return this.currentlyFocusedBlockId;
  }

  /**
   * Dispose all decoration types
   * Per TASK-0076, ED-003
   * 
   * Called on state transitions (STALE, IDLE) or extension deactivation
   * Prevents memory leaks by properly disposing TextEditorDecorationType instances
   */
  public disposeAllDecorations(): void {
    const hoverCount = this.decorationCache.size;
    const focusCount = this.focusedDecorationCache.size;
    
    // Dispose hover decorations
    for (const decorationData of this.decorationCache.values()) {
      decorationData.decorationType.dispose();
    }
    
    // Dispose focused decorations
    for (const decorationType of this.focusedDecorationCache.values()) {
      decorationType.dispose();
    }
    
    // Dispose dimming decoration
    if (this.dimmingDecorationType) {
      this.dimmingDecorationType.dispose();
      this.dimmingDecorationType = null;
    }
    
    this.decorationCache.clear();
    this.focusedDecorationCache.clear();
    this.currentlyHighlightedBlockId = null;
    this.currentlyFocusedBlockId = null;
    
    this.logger.info( 'Disposed all decoration types', { 
      hoverCount, 
      focusCount 
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
