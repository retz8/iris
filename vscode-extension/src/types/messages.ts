/**
 * Message Protocol Type Definitions for IRIS Extension
 * Phase 6: Webview ↔ Extension Messaging per GOAL-006
 * 
 * All interactions use blockId as sole identity per REQ-005
 */

import { IRISAnalysisState, AnalysisMetadata, NormalizedResponsibilityBlock } from '../state/irisState';

// ========================================
// WEBVIEW → EXTENSION MESSAGES
// ========================================

/**
 * Sent by webview when it's fully initialized and ready to receive data
 */
export interface WebviewReadyMessage {
  type: 'WEBVIEW_READY';
}

/**
 * Sent when user hovers over a responsibility block in webview
 * Triggers editor decorations for the specified block
 */
export interface BlockHoverMessage {
  type: 'BLOCK_HOVER';
  blockId: string;
}

/**
 * Sent when user clicks on a responsibility block to select/pin it
 * UI Refinement 2: Pin/unpin selection model
 * Per REQ-029: Replaces BLOCK_CLICK
 */
export interface BlockSelectedMessage {
  type: 'BLOCK_SELECTED';
  blockId: string;
}

/**
 * Sent when user clicks on an already-selected block to deselect/unpin it
 * UI Refinement 2: Pin/unpin toggle model
 * Per REQ-030: Block deselection/unpin on repeat click (replaces BLOCK_DOUBLE_CLICK)
 */
export interface BlockDeselectedMessage {
  type: 'BLOCK_DESELECTED';
  blockId: string;
}

/**
 * Sent when user navigates between segments of a scattered block
 * UI Refinement 2: Segment navigation with keyboard or buttons
 * Per REQ-031: Replaces BLOCK_SELECT
 */
export interface SegmentNavigatedMessage {
  type: 'SEGMENT_NAVIGATED';
  blockId: string;
  segmentIndex: number;
  totalSegments: number;
}

/**
 * Sent when user clears hover or exits focus
 * Removes decorations from editor
 */
export interface BlockClearMessage {
  type: 'BLOCK_CLEAR';
}

/**
 * Sent when user presses Escape key to deselect current block
 * UI Refinement 2: Simplified escape handling for pin/unpin model
 * Per REQ-032: Replaces FOCUS_CLEAR
 */
export interface EscapePressedMessage {
  type: 'ESCAPE_PRESSED';
}

/**
 * Union type for all messages from Webview to Extension
 * Per TASK-0063: Strict TypeScript discriminated unions
 * UI Refinement 2: Updated for pin/unpin selection model
 */
export type WebviewMessage = 
  | WebviewReadyMessage
  | BlockHoverMessage
  | BlockSelectedMessage
  | BlockDeselectedMessage
  | SegmentNavigatedMessage
  | BlockClearMessage
  | EscapePressedMessage;

// ========================================
// EXTENSION → WEBVIEW MESSAGES
// ========================================

/**
 * Sent when extension state changes
 * Webview uses this to update UI state per UX-001
 */
export interface StateUpdateMessage {
  type: 'STATE_UPDATE';
  state: IRISAnalysisState;
}

/**
 * Sent when analysis completes successfully (ANALYZED state)
 * Contains full analysis data with blockId attached to each block
 */
export interface AnalysisDataMessage {
  type: 'ANALYSIS_DATA';
  payload: {
    fileIntent: string;
    metadata: AnalysisMetadata;
    responsibilityBlocks: NormalizedResponsibilityBlock[];  // Includes blockId
    analyzedFileUri: string;
    analyzedAt: string;  // ISO timestamp
  };
}

/**
 * Sent when analysis becomes stale due to file modification
 * Per STATE-003, UX-001: Webview displays "Outdated analysis" indicator
 */
export interface AnalysisStaleMessage {
  type: 'ANALYSIS_STALE';
}

/**
 * Sent when analysis or operation fails
 * Webview displays error state
 */
export interface ErrorMessage {
  type: 'ERROR';
  message: string;
}

/**
 * Sent from extension to webview to trigger segment navigation
 * REQ-079, REQ-080: Keyboard shortcuts trigger navigation via extension commands
 */
export interface NavigateSegmentMessage {
  type: 'NAVIGATE_SEGMENT';
  direction: 'prev' | 'next';
}

/**
 * Union type for all messages from Extension to Webview
 * Per TASK-0063: Strict TypeScript discriminated unions
 */
export type ExtensionMessage = 
  | StateUpdateMessage
  | AnalysisDataMessage
  | AnalysisStaleMessage
  | ErrorMessage
  | NavigateSegmentMessage;

// ========================================
// TYPE GUARDS
// ========================================

/**
 * Type guard for WebviewMessage validation
 * Per TASK-0067: Validate message types before processing
 */
export function isWebviewMessage(message: any): message is WebviewMessage {
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    return false;
  }

  switch (message.type) {
    case 'WEBVIEW_READY':
      return true;
    
    case 'BLOCK_HOVER':
    case 'BLOCK_SELECTED':
    case 'BLOCK_DESELECTED':
      return typeof message.blockId === 'string' && message.blockId.length > 0;
    
    case 'SEGMENT_NAVIGATED':
      return typeof message.blockId === 'string' && 
             typeof message.segmentIndex === 'number' &&
             typeof message.totalSegments === 'number';
    
    case 'BLOCK_CLEAR':
    case 'ESCAPE_PRESSED':
      return true;
    
    default:
      return false;
  }
}

/**
 * Type guard for ExtensionMessage validation
 */
export function isExtensionMessage(message: any): message is ExtensionMessage {
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    return false;
  }

  switch (message.type) {
    case 'STATE_UPDATE':
      return typeof message.state === 'string';
    
    case 'ANALYSIS_DATA':
      return message.payload && 
             typeof message.payload.fileIntent === 'string' &&
             Array.isArray(message.payload.responsibilityBlocks);
    
    case 'ANALYSIS_STALE':
    case 'ERROR':
      return true;
    
    case 'NAVIGATE_SEGMENT':
      return typeof message.direction === 'string' &&
             (message.direction === 'prev' || message.direction === 'next');
    
    default:
      return false;
  }
}
