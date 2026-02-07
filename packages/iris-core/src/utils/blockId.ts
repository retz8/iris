import * as crypto from 'crypto';
import type { ResponsibilityBlock } from '../models/types';

/**
 * Canonical signature for blockId generation per Phase 6 specification
 * Includes normalized label, description, and stringified ranges for stability
 */
interface ResponsibilityBlockSignature {
  label: string;                        // Normalized: trim, collapse whitespace
  description: string;                  // Normalized: trim, collapse whitespace
  ranges: string;                       // Stringified for consistency
}

/**
 * Normalize whitespace in text: trim and collapse multiple spaces
 * @param text Input text to normalize
 * @returns Normalized text with single spaces
 */
function normalizeWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Generate deterministic blockId from ResponsibilityBlock using SHA-1 hash
 *
 * Algorithm:
 * 1. Normalize label: trim, collapse whitespace
 * 2. Normalize description: trim, collapse whitespace
 * 3. Stringify ranges for consistency
 * 4. Generate signature object
 * 5. SHA-1 hash signature, return "rb_" + first 12 chars
 * 
 * Rationale: Including ranges ensures blockId stability across regeneration.
 * If LLM generates same block with same line coverage, ID remains stable.
 * If ranges change meaningfully, blockId changes, preventing stale mappings.
 * 
 * @param block ResponsibilityBlock from API response
 * @returns Deterministic blockId string in format "rb_<hash12>"
 */
export function generateBlockId(block: ResponsibilityBlock): string {
  // 1. Normalize label
  const normalizedLabel = normalizeWhitespace(block.label);
  
  // 2. Normalize description
  const normalizedDescription = normalizeWhitespace(block.description);
  
  // 3. Stringify ranges for consistency
  const stringifiedRanges = JSON.stringify(block.ranges);
  
  // 4. Generate signature object
  const signature: ResponsibilityBlockSignature = {
    label: normalizedLabel,
    description: normalizedDescription,
    ranges: stringifiedRanges
  };
  
  // 5. Generate SHA-1 hash and extract first 12 characters
  const signatureString = JSON.stringify(signature);
  const hash = crypto.createHash('sha1').update(signatureString).digest('hex');
  const blockId = `rb_${hash.slice(0, 12)}`;
  
  return blockId;
}

/**
 * Generate blockIds for array of ResponsibilityBlocks
 * Convenience function for batch processing
 * 
 * @param blocks Array of ResponsibilityBlocks
 * @returns Array of blocks with blockId attached
 */
export function generateBlockIds<T extends ResponsibilityBlock>(blocks: T[]): (T & { blockId: string })[] {
  return blocks.map(block => ({
    ...block,
    blockId: generateBlockId(block)
  }));
}
