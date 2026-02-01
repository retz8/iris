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
 * Sent when user clicks on a responsibility block
 * Triggers scroll to first line and enters focus mode without folding
 * Per Phase 4, REQ-006, TASK-026
 */
export interface BlockClickMessage {
  type: 'BLOCK_CLICK';
  blockId: string;
}

/**
 * Sent when user double-clicks on a responsibility block
 * Triggers scroll to first line, enters focus mode, and folds gaps between scattered ranges
 * Per Phase 5, REQ-007, TASK-033
 */
export interface BlockDoubleClickMessage {
  type: 'BLOCK_DOUBLE_CLICK';
  blockId: string;
}

/**
 * Sent when user selects a responsibility block for Focus Mode
 * Triggers enhanced decoration and dims other blocks per Phase 8
 */
export interface BlockSelectMessage {
  type: 'BLOCK_SELECT';
  blockId: string;
}

/**
 * Sent when user clears hover or exits focus
 * Removes decorations from editor
 */
export interface BlockClearMessage {
  type: 'BLOCK_CLEAR';
}

/**
 * Sent when user explicitly exits Focus Mode
 * Phase 8: Focus Mode per TASK-0085
 */
export interface FocusClearMessage {
  type: 'FOCUS_CLEAR';
}

/**
 * Union type for all messages from Webview to Extension
 * Per TASK-0063: Strict TypeScript discriminated unions
 */
export type WebviewMessage = 
  | WebviewReadyMessage
  | BlockHoverMessage
  | BlockClickMessage
  | BlockDoubleClickMessage
  | BlockSelectMessage
  | BlockClearMessage
  | FocusClearMessage;

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
 * Union type for all messages from Extension to Webview
 * Per TASK-0063: Strict TypeScript discriminated unions
 */
export type ExtensionMessage = 
  | StateUpdateMessage
  | AnalysisDataMessage
  | AnalysisStaleMessage
  | ErrorMessage;

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
    case 'BLOCK_CLICK':
    case 'BLOCK_DOUBLE_CLICK':
    case 'BLOCK_SELECT':
      return typeof message.blockId === 'string' && message.blockId.length > 0;
    
    case 'BLOCK_CLEAR':
    case 'FOCUS_CLEAR':
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
    
    default:
      return false;
  }
}
