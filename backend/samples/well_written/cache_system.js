/**
 * Event-Driven Cache System
 * 
 * LRU cache with TTL support, event notifications, and automatic cleanup.
 * Emits events for cache operations (set, get, evict, expire).
 */

// Cache event types
const CACHE_EVENT_SET = 'set';
const CACHE_EVENT_GET = 'get';
const CACHE_EVENT_EVICT = 'evict';
const CACHE_EVENT_EXPIRE = 'expire';

class CacheEntry {
  /**
   * Create a cache entry with value and metadata
   * @param {*} value - Value to cache
   * @param {number} ttl - Time-to-live in milliseconds
   */
  constructor(value, ttl) {
    this.value = value;
    this.createdAt = Date.now();
    this.expiresAt = ttl ? this.createdAt + ttl : null;
    this.lastAccessedAt = this.createdAt;
    this.accessCount = 0;
  }

  /**
   * Check if entry has expired based on TTL
   * @returns {boolean} - True if entry is expired
   */
  isExpired() {
    if (this.expiresAt === null) {
      return false;
    }
    return Date.now() > this.expiresAt;
  }

  /**
   * Update access metadata when entry is retrieved
   */
  recordAccess() {
    this.lastAccessedAt = Date.now();
    this.accessCount++;
  }
}

class EventDrivenCache {
  /**
   * Initialize cache with size limit and default TTL
   * @param {number} maxSize - Maximum number of entries
   * @param {number} defaultTTL - Default time-to-live in milliseconds
   */
  constructor(maxSize = 100, defaultTTL = null) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    this.eventListeners = new Map();
    this.cleanupIntervalId = null;
    
    this._startAutomaticCleanup();
  }

  /**
   * Store a value in cache with optional TTL override
   * @param {string} key - Cache key
   * @param {*} value - Value to store
   * @param {number} ttl - Optional TTL override
   */
  set(key, value, ttl = null) {
    const effectiveTTL = ttl !== null ? ttl : this.defaultTTL;
    
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this._evictLeastRecentlyUsed();
    }

    const entry = new CacheEntry(value, effectiveTTL);
    this.cache.set(key, entry);
    
    this._emitEvent(CACHE_EVENT_SET, { key, value, ttl: effectiveTTL });
  }

  /**
   * Retrieve a value from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or undefined if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.isExpired()) {
      this.cache.delete(key);
      this._emitEvent(CACHE_EVENT_EXPIRE, { key });
      return undefined;
    }

    entry.recordAccess();
    this._emitEvent(CACHE_EVENT_GET, { key, value: entry.value });
    
    return entry.value;
  }

  /**
   * Remove least recently used entry to make space
   * @private
   */
  _evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestAccessTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestAccessTime) {
        oldestAccessTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      const evictedValue = this.cache.get(oldestKey).value;
      this.cache.delete(oldestKey);
      this._emitEvent(CACHE_EVENT_EVICT, { key: oldestKey, value: evictedValue });
    }
  }

  /**
   * Start background task to remove expired entries
   * @private
   */
  _startAutomaticCleanup() {
    this.cleanupIntervalId = setInterval(() => {
      this._removeExpiredEntries();
    }, 60000); // Run every minute
  }

  /**
   * Scan cache and remove all expired entries
   * @private
   */
  _removeExpiredEntries() {
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this._emitEvent(CACHE_EVENT_EXPIRE, { key });
    }
  }

  /**
   * Register event listener for cache operations
   * @param {string} eventType - Event type to listen for
   * @param {Function} callback - Handler function
   */
  addEventListener(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }

  /**
   * Trigger event and notify all registered listeners
   * @private
   * @param {string} eventType - Type of event
   * @param {Object} eventData - Event payload
   */
  _emitEvent(eventType, eventData) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(eventData));
    }
  }

  /**
   * Get cache statistics and metadata
   * @returns {Object} - Cache status information
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize * 100).toFixed(2) + '%'
    };
  }

  /**
   * Clear all entries and stop cleanup task
   */
  destroy() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    this.cache.clear();
    this.eventListeners.clear();
  }
}

// Export cache system components
export { EventDrivenCache, CACHE_EVENT_SET, CACHE_EVENT_GET, CACHE_EVENT_EVICT, CACHE_EVENT_EXPIRE };