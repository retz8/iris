import * as crypto from 'crypto';

/**
 * Compute a deterministic SHA-256 content hash for file content.
 * Used as cache key to detect file changes between analyses.
 */
export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
