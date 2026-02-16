import type { AnalysisData, AnalysisMetadata, NormalizedResponsibilityBlock } from '@iris/core';
import type { Logger } from '@iris/core';

/**
 * Single cache entry storing analysis results keyed by fileUri + contentHash
 */
export interface CacheEntry {
  fileUri: string;
  contentHash: string;
  data: AnalysisData;
  timestamp: number;  // Date.now() when cached
}

/**
 * Serializable cache entry for workspaceState persistence.
 * Excludes rawResponse to save space, converts Date to ISO string.
 */
export interface SerializedCacheEntry {
  fileUri: string;
  contentHash: string;
  fileIntent: string;
  metadata: AnalysisMetadata;
  responsibilityBlocks: NormalizedResponsibilityBlock[];
  analyzedFileUri: string;
  analyzedAt: string;  // ISO timestamp
  timestamp: number;
}

const DEFAULT_MAX_SIZE = 10;

/**
 * In-memory LRU cache for analysis results.
 * Provides instant file-switching without re-analysis.
 *
 * - Cache key: fileUri
 * - Cache validation: contentHash must match (detects file edits)
 * - LRU eviction: oldest-accessed entry removed when size exceeds maxSize
 * - Serialization: serialize/deserialize for workspaceState persistence
 */
export class AnalysisCache {
  private cache: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private logger: Logger;

  constructor(logger: Logger, maxSize: number = DEFAULT_MAX_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.logger = logger;

    this.logger.info('Analysis cache initialized', { maxSize });
  }

  /**
   * Get cached analysis data if contentHash matches.
   * Returns null on cache miss or hash mismatch.
   * Promotes entry to most-recently-used on hit.
   */
  get(fileUri: string, contentHash: string): AnalysisData | null {
    const entry = this.cache.get(fileUri);
    if (!entry) {
      this.logger.debug('Cache miss (not found)', { fileUri });
      return null;
    }

    if (entry.contentHash !== contentHash) {
      this.logger.debug('Cache miss (hash mismatch)', { fileUri });
      this.cache.delete(fileUri);
      return null;
    }

    // LRU: promote to most-recently-used by re-inserting
    this.cache.delete(fileUri);
    this.cache.set(fileUri, entry);

    this.logger.info('Cache hit', { fileUri, contentHash: contentHash.substring(0, 8) });
    return entry.data;
  }

  /**
   * Store analysis result in cache.
   * Evicts least-recently-used entry if cache is full.
   */
  set(fileUri: string, contentHash: string, data: AnalysisData): void {
    // Remove existing entry first (for LRU ordering)
    if (this.cache.has(fileUri)) {
      this.cache.delete(fileUri);
    }

    // LRU eviction: remove oldest entry (first key in Map iteration order)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.logger.info('Cache evicted (LRU)', { evictedUri: oldestKey, cacheSize: this.cache.size });
      }
    }

    this.cache.set(fileUri, {
      fileUri,
      contentHash,
      data,
      timestamp: Date.now()
    });

    this.logger.info('Cache set', {
      fileUri,
      contentHash: contentHash.substring(0, 8),
      cacheSize: this.cache.size
    });
  }

  /**
   * Remove a specific file from cache (e.g., on file edit / STALE transition)
   */
  invalidate(fileUri: string): void {
    const deleted = this.cache.delete(fileUri);
    if (deleted) {
      this.logger.info('Cache invalidated', { fileUri, cacheSize: this.cache.size });
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.logger.info('Cache cleared', { previousSize });
  }

  /**
   * Get all cache entries (for serialization)
   */
  getAll(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Serialize cache entries for workspaceState persistence.
   * Excludes rawResponse to save space.
   */
  serialize(): SerializedCacheEntry[] {
    return this.getAll().map(entry => ({
      fileUri: entry.fileUri,
      contentHash: entry.contentHash,
      fileIntent: entry.data.fileIntent,
      metadata: entry.data.metadata,
      responsibilityBlocks: entry.data.responsibilityBlocks,
      analyzedFileUri: entry.data.analyzedFileUri,
      analyzedAt: entry.data.analyzedAt.toISOString(),
      timestamp: entry.timestamp
    }));
  }

  /**
   * Restore cache from serialized entries (workspaceState).
   * Entries are added without validation; caller should validate content hashes.
   */
  deserialize(entries: SerializedCacheEntry[]): void {
    let restored = 0;

    for (const entry of entries) {
      // Reconstruct AnalysisData from serialized form
      const data: AnalysisData = {
        fileIntent: entry.fileIntent,
        metadata: entry.metadata,
        responsibilityBlocks: entry.responsibilityBlocks,
        rawResponse: {
          file_intent: entry.fileIntent,
          metadata: entry.metadata,
          responsibility_blocks: entry.responsibilityBlocks
        },
        analyzedFileUri: entry.analyzedFileUri,
        analyzedAt: new Date(entry.analyzedAt)
      };

      this.cache.set(entry.fileUri, {
        fileUri: entry.fileUri,
        contentHash: entry.contentHash,
        data,
        timestamp: entry.timestamp
      });

      restored++;

      // Respect max size during restore
      if (this.cache.size >= this.maxSize) {
        break;
      }
    }

    this.logger.info('Cache restored from persistence', {
      restoredCount: restored,
      totalProvided: entries.length,
      cacheSize: this.cache.size
    });
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();
  }
}
