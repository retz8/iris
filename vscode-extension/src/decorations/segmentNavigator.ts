import * as vscode from 'vscode';
import { createLogger, Logger } from '../utils/logger';

/**
 * Segment Navigator Component
 *
 * Floating navigation controls for navigating between scattered segments of a block.
 * Uses after-contentText decorations to render UI elements.
 * Vertical stack: [up] [X/Y] [down]
 */
export class SegmentNavigator implements vscode.Disposable {
  private outputChannel: vscode.OutputChannel;
  private logger: Logger;
  
  // Decoration types for navigation UI components
  private upButtonDecorationType: vscode.TextEditorDecorationType | null = null;
  private downButtonDecorationType: vscode.TextEditorDecorationType | null = null;
  private indicatorDecorationType: vscode.TextEditorDecorationType | null = null;
  
  // Current navigation state
  private isVisible: boolean = false;
  private currentBlockId: string | null = null;
  private currentSegment: number = 0;
  private totalSegments: number = 0;
  
  // Virtual line position for floating UI (placed after last visible line)
  private virtualLinePosition: number = 0;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.logger = createLogger(outputChannel, 'SegmentNavigator');
    this.logger.info('Segment navigator initialized');
  }

  /**
   * Show segment navigator with current position indicator
   */
  showNavigator(blockId: string, currentSegment: number, totalSegments: number): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.logger.warn('Cannot show navigator: no active editor');
      return;
    }

    this.logger.info('Showing segment navigator', { blockId, currentSegment, totalSegments });
    
    this.currentBlockId = blockId;
    this.currentSegment = currentSegment;
    this.totalSegments = totalSegments;
    this.isVisible = true;

    this.renderNavigator(editor);
  }

  /**
   * Update navigator with new segment position
   */
  updateNavigator(currentSegment: number, totalSegments: number): void {
    if (!this.isVisible) {
      this.logger.warn('Cannot update navigator: not visible');
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      this.logger.warn('Cannot update navigator: no active editor');
      return;
    }

    this.logger.debug('Updating segment navigator', { currentSegment, totalSegments });
    
    this.currentSegment = currentSegment;
    this.totalSegments = totalSegments;

    this.renderNavigator(editor);
  }

  /**
   * Hide navigator and clear all decorations
   */
  hideNavigator(): void {
    if (!this.isVisible) {
      return;
    }

    this.logger.info('Hiding segment navigator', { blockId: this.currentBlockId });
    
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.clearDecorations(editor);
    }

    this.disposeDecorationTypes();
    
    this.isVisible = false;
    this.currentBlockId = null;
    this.currentSegment = 0;
    this.totalSegments = 0;
  }

  /**
   * Render navigator UI in editor using decorations
   */
  private renderNavigator(editor: vscode.TextEditor): void {
    // Clear existing decorations before re-rendering
    this.clearDecorations(editor);
    this.disposeDecorationTypes();

    // Calculate virtual position at end of document
    const lastLine = editor.document.lineCount - 1;
    this.virtualLinePosition = lastLine;

    // Create decorations for each UI element
    this.createUpButtonDecoration(editor);
    this.createIndicatorDecoration(editor);
    this.createDownButtonDecoration(editor);

    this.logger.debug('Navigator rendered', {
      currentSegment: this.currentSegment,
      totalSegments: this.totalSegments,
      virtualLine: this.virtualLinePosition
    });
  }

  /**
   * Create up arrow button decoration
   * Disabled when at first segment
   */
  private createUpButtonDecoration(editor: vscode.TextEditor): void {
    const isDisabled = this.currentSegment === 0;
    const opacity = isDisabled ? '0.3' : '1.0';
    const cursor = isDisabled ? 'not-allowed' : 'pointer';
    
    // Get theme colors for consistent styling
    const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
                        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
    const textColor = isDarkTheme ? '#CCCCCC' : '#333333';
    const bgColor = isDarkTheme ? 'rgba(60, 60, 60, 0.9)' : 'rgba(245, 245, 245, 0.9)';
    const hoverBgColor = isDarkTheme ? 'rgba(80, 80, 80, 0.95)' : 'rgba(230, 230, 230, 0.95)';

    this.upButtonDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: '↑',
        color: textColor,
        backgroundColor: bgColor,
        margin: '0 2px',
        width: '24px',
        height: '24px',
        textDecoration: `none; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          border-radius: 4px; 
          opacity: ${opacity}; 
          cursor: ${cursor};
          font-size: 16px;
          font-weight: bold;
          box-sizing: border-box;
          border: 1px solid ${isDarkTheme ? 'rgba(100, 100, 100, 0.5)' : 'rgba(200, 200, 200, 0.5)'};`
      },
      isWholeLine: false,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });

    // Apply decoration to virtual position
    const range = new vscode.Range(
      this.virtualLinePosition, 0,
      this.virtualLinePosition, 0
    );
    
    editor.setDecorations(this.upButtonDecorationType, [range]);
  }

  /**
   * Create segment indicator decoration (e.g., "2/5")
   * Shows current position among total segments
   */
  private createIndicatorDecoration(editor: vscode.TextEditor): void {
    const displayText = `${this.currentSegment + 1}/${this.totalSegments}`;
    
    // Get theme colors
    const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
                        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
    const textColor = isDarkTheme ? '#CCCCCC' : '#333333';
    const bgColor = isDarkTheme ? 'rgba(50, 50, 50, 0.9)' : 'rgba(250, 250, 250, 0.9)';

    this.indicatorDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: displayText,
        color: textColor,
        backgroundColor: bgColor,
        margin: '0 2px',
        textDecoration: `none; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          padding: 2px 8px;
          border-radius: 4px; 
          font-family: monospace;
          font-size: 12px;
          font-weight: 500;
          box-sizing: border-box;
          border: 1px solid ${isDarkTheme ? 'rgba(100, 100, 100, 0.5)' : 'rgba(200, 200, 200, 0.5)'};
          min-width: 40px;`
      },
      isWholeLine: false,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });

    // Apply decoration to virtual position (offset for stacking)
    const range = new vscode.Range(
      this.virtualLinePosition, 30,
      this.virtualLinePosition, 30
    );
    
    editor.setDecorations(this.indicatorDecorationType, [range]);
  }

  /**
   * Create down arrow button decoration
   * Disabled when at last segment
   */
  private createDownButtonDecoration(editor: vscode.TextEditor): void {
    const isDisabled = this.currentSegment >= this.totalSegments - 1;
    const opacity = isDisabled ? '0.3' : '1.0';
    const cursor = isDisabled ? 'not-allowed' : 'pointer';
    
    // Get theme colors
    const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
                        vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
    const textColor = isDarkTheme ? '#CCCCCC' : '#333333';
    const bgColor = isDarkTheme ? 'rgba(60, 60, 60, 0.9)' : 'rgba(245, 245, 245, 0.9)';

    this.downButtonDecorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: '↓',
        color: textColor,
        backgroundColor: bgColor,
        margin: '0 2px',
        width: '24px',
        height: '24px',
        textDecoration: `none; 
          display: inline-flex; 
          align-items: center; 
          justify-content: center; 
          border-radius: 4px; 
          opacity: ${opacity}; 
          cursor: ${cursor};
          font-size: 16px;
          font-weight: bold;
          box-sizing: border-box;
          border: 1px solid ${isDarkTheme ? 'rgba(100, 100, 100, 0.5)' : 'rgba(200, 200, 200, 0.5)'};`
      },
      isWholeLine: false,
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });

    // Apply decoration to virtual position (offset for stacking)
    const range = new vscode.Range(
      this.virtualLinePosition, 75,
      this.virtualLinePosition, 75
    );
    
    editor.setDecorations(this.downButtonDecorationType, [range]);
  }

  /**
   * Clear all navigator decorations from editor
   */
  private clearDecorations(editor: vscode.TextEditor): void {
    if (this.upButtonDecorationType) {
      editor.setDecorations(this.upButtonDecorationType, []);
    }
    if (this.indicatorDecorationType) {
      editor.setDecorations(this.indicatorDecorationType, []);
    }
    if (this.downButtonDecorationType) {
      editor.setDecorations(this.downButtonDecorationType, []);
    }
  }

  /**
   * Dispose all decoration types to prevent memory leaks
   */
  private disposeDecorationTypes(): void {
    if (this.upButtonDecorationType) {
      this.upButtonDecorationType.dispose();
      this.upButtonDecorationType = null;
    }
    if (this.indicatorDecorationType) {
      this.indicatorDecorationType.dispose();
      this.indicatorDecorationType = null;
    }
    if (this.downButtonDecorationType) {
      this.downButtonDecorationType.dispose();
      this.downButtonDecorationType = null;
    }
  }

  /**
   * Check if navigator is currently visible
   */
  isNavigatorVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get current segment index
   */
  getCurrentSegment(): number {
    return this.currentSegment;
  }

  /**
   * Get total segments count
   */
  getTotalSegments(): number {
    return this.totalSegments;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.logger.info('Disposing segment navigator');
    
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.clearDecorations(editor);
    }
    
    this.disposeDecorationTypes();
    
    this.isVisible = false;
    this.currentBlockId = null;
  }
}
