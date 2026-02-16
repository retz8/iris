/**
 * File Intent is a simple string describing file purpose
 */
export type FileIntent = string;

/**
 * Responsibility Block structure matching API response format
 */
export interface ResponsibilityBlock {
  description: string;
  label: string;
  ranges: Array<[number, number]>;  // ONE-based line numbers from API
}

/**
 * Analysis metadata with optional standard fields and extensibility
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
  blockId: string;
}

/**
 * Raw server response structure matching API contract
 */
export interface IRISAnalysisResponse {
  file_intent: string;
  metadata: AnalysisMetadata;
  responsibility_blocks: ResponsibilityBlock[];
}

/**
 * Internal analysis data structure storing both raw and normalized data
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
 * Selection state for pin/unpin block selection
 */
export interface SelectionState {
  selectedBlockId: string | null;  // null = no block selected
  currentSegmentIndex: number;      // Current segment being viewed (0-based)
}

/**
 * Structured error details for display in UI
 * Uses string type field to stay decoupled from API module (values match APIErrorType enum)
 */
export interface ErrorDetails {
  type: string;           // Error category (e.g., 'NETWORK_ERROR', 'TIMEOUT', 'HTTP_ERROR')
  message: string;        // User-friendly error message
  statusCode?: number;    // HTTP status code (if applicable)
}
