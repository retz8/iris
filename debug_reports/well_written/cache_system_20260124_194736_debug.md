# IRIS Debug Report

**File:** `cache_system.js`  
**Language:** `javascript`  
**Execution Path:** 🔧 Tool-Calling with Signature Graph  

---

## Source Code Overview

### Stage 1: Original Source Code

**Total Lines:** 208  
**Size:** 5,254 bytes

```javascript
/**
 * Event-Driven Cache System
 * 
 * LRU cache with TTL support, event notifications, and automatic cleanup.
 * Emits events for cache operations (...(truncated)
```

### Signature Graph Snapshot

**Entities:** 17

```json
{
  "entities": [
    {
      "id": "entity_0",
      "name": "CacheEntry",
      "type": "class",
      "signature": "class CacheEntry",
      "line_range": [
        14,
        46
      ],
      "depth": 0,
      "scope": "module",
      "parent_id": null,
      "children_ids": [
        "entity_1",
        "entity_2",
        "entity_3"
      ],
      "calls": [],
      "leading_comment": "/**\n * Event-Driven Cache System\n * \n * LRU cache with TTL support, event notifications, and automatic cleanup.\n * Emits events for cache operations (set, get, evict, expire).\n */\n// Cache event types",
      "inline_comment": null,
      "trailing_comment": "/**\n   * Create a cache entry with value and metadata\n   * @param {*} value - Value to cache\n   * @param {number} ttl - Time-to-live in milliseconds\n   */",
      "docstring": null
    },
    {
      "id": "entity_1",
      "name": "constructor",
      "type": "method",
      "signature": "constructor(value, ttl)",
  ...(truncated for readability)
```

---

## LLM Processing Metrics

### 🔧 Tool-Calling Execution

Single-stage analysis with dynamic source reading: LLM analyzes shallow AST and calls `refer_to_source_code()` tool when needed.

#### Summary

| Metric | Value |
|--------|-------|
| Total Input Tokens | 405 |
| Total Output Tokens | 1,279 |
| Total Tokens | 1,684 |
| Total Time | 20.73s |
| Stages | 1 |

#### Stage Details

**Tool Calling Analysis**

| Metric | Value |
|--------|-------|
| Input Tokens | 405 |
| Output Tokens | 1,279 |
| Total Tokens | 1,684 |
| Time | 20.73s |

**Throughput:**

- Tokens/Second: 81.2 tok/s
- Input: 405 tok | Output: 1,279 tok | Total: 1,684 tok

<details>
<summary><strong>📄 Full LLM Response</strong> (click to expand)</summary>

```json
{
  "file_intent": "Event-driven cache system that manages key-value pairs with expiration and automatic cleanup, ensuring efficient memory usage and event notifications.",
  "initial_hypothesis": "The file defines a cache system with classes for cache entries and an event-driven cache manager, handling storage, retrieval, and expiration of cached data.",
  "entity_count_validation": {
    "total_entities": 15,
    "responsibilities_count": 2,
    "required_range": "2-5",
    "passes_anti_collapse_rule": true
  },
  "verification_processes": [
    {
      "read_entities": [
        {
          "id": "entity_1",
          "name": "constructor",
          "reason": "Constructor initializes cache entry with value and TTL."
        },
        {
          "id": "entity_2",
          "name": "isExpired",
          "reason": "Checks if the cache entry has expired based on TTL."
        },
        {
          "id": "entity_3",
          "name": "recordAccess",
          "reason": "Updates access metadata when the entry is retrieved."
        },
        {
          "id": "entity_5",
          "name": "constructor",
          "reason": "Constructor initializes the event-driven cache with size limit and default TTL."
        },
        {
          "id": "entity_6",
          "name": "set",
          "reason": "Stores a value in the cache with optional TTL override."
        },
        {
          "id": "entity_7",
          "name": "get",
          "reason": "Retrieves a value from the cache, handling expiration."
        },
        {
          "id": "entity_8",
          "name": "_evictLeastRecentlyUsed",
          "reason": "Removes the least recently used entry to make space."
        },
        {
          "id": "entity_9",
          "name": "_startAutomaticCleanup",
          "reason": "Starts a background task to remove expired entries."
        },
        {
          "id": "entity_10",
          "name": "_removeExpiredEntries",
          "reason": "Scans the cache and removes all expired entries."
        },
        {
          "id": "entity_11",
          "name": "addEventListener",
          "reason": "Registers an event listener for cache operations."
        },
        {
          "id": "entity_12",
          "name": "_emitEvent",
          "reason": "Triggers an event and notifies all registered listeners."
        },
        {
          "id": "entity_13",
          "name": "getStats",
          "reason": "Gets cache statistics and metadata."
        },
        {
          "id": "entity_14",
          "name": "destroy",
          "reason": "Clears all entries and stops the cleanup task."
        }
      ]
    }
  ],
  "responsibilities": [
    {
      "id": "cache-entry-management",
      "label": "Cache Entry Management",
      "description": "Handles individual cache entries, including creation, expiration checks, and access tracking.",
      "elements": {
        "functions": [
          "constructor",
          "isExpired",
          "recordAccess"
        ],
        "state": [
          "value",
          "createdAt",
          "expiresAt",
          "lastAccessedAt",
          "accessCount"
        ],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          14,
          46
        ]
      ]
    },
    {
      "id": "event-driven-cache-management",
      "label": "Event-Driven Cache Management",
      "description": "Manages the overall cache system, including storage, retrieval, eviction, and event handling.",
      "elements": {
        "functions": [
          "constructor",
          "set",
          "get",
          "_evictLeastRecentlyUsed",
          "_startAutomaticCleanup",
          "_removeExpiredEntries",
          "addEventListener",
          "_emitEvent",
          "getStats",
          "destroy"
        ],
        "state": [
          "maxSize",
          "defaultTTL",
          "cache",
          "eventListeners",
          "cleanupIntervalId"
        ],
        "imports": [],
        "types": [],
        "constants": []
      },
      "ranges": [
        [
          48,
          208
        ]
      ]
    }
  ],
  "metadata": {
    "logical_depth": "Deep",
    "notes": "The cache system is designed to efficiently manage memory and notify users of cache events."
  }
}
```

</details>

---

## Tool Call Records

**Total Tool Calls:** 13

### Tool Call Summary

| # | Tool | Line Range | Size | Duration | Timestamp |
|---|------|-----------|------|----------|-----------|
| 1 | `refer_to_source_code` | 20-26 | 212B | 0.00s | 19:47:21 |
| 2 | `refer_to_source_code` | 32-37 | 120B | 0.00s | 19:47:21 |
| 3 | `refer_to_source_code` | 42-45 | 84B | 0.00s | 19:47:21 |
| 4 | `refer_to_source_code` | 54-62 | 255B | 0.00s | 19:47:21 |
| 5 | `refer_to_source_code` | 70-81 | 380B | 0.00s | 19:47:21 |
| 6 | `refer_to_source_code` | 88-105 | 369B | 0.00s | 19:47:21 |
| 7 | `refer_to_source_code` | 111-127 | 509B | 0.00s | 19:47:21 |
| 8 | `refer_to_source_code` | 133-137 | 152B | 0.00s | 19:47:21 |
| 9 | `refer_to_source_code` | 143-156 | 317B | 0.00s | 19:47:21 |
| 10 | `refer_to_source_code` | 163-168 | 199B | 0.00s | 19:47:21 |
| 11 | `refer_to_source_code` | 176-181 | 183B | 0.00s | 19:47:21 |
| 12 | `refer_to_source_code` | 187-193 | 171B | 0.00s | 19:47:21 |
| 13 | `refer_to_source_code` | 198-204 | 159B | 0.00s | 19:47:21 |

### Tool Call Details

#### Call #1: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 20,
  "end_line": 26
}
```

**Result Size:** 212 bytes

**Source Code Retrieved:**

```javascript
  constructor(value, ttl) {
    this.value = value;
    this.createdAt = Date.now();
    this.expiresAt = ttl ? this.createdAt + ttl : null;
    this.lastAccessedAt = this.createdAt;
    this.accessCount = 0;
  }
```

#### Call #2: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 32,
  "end_line": 37
}
```

**Result Size:** 120 bytes

**Source Code Retrieved:**

```javascript
  isExpired() {
    if (this.expiresAt === null) {
      return false;
    }
    return Date.now() > this.expiresAt;
  }
```

#### Call #3: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 42,
  "end_line": 45
}
```

**Result Size:** 84 bytes

**Source Code Retrieved:**

```javascript
  recordAccess() {
    this.lastAccessedAt = Date.now();
    this.accessCount++;
  }
```

#### Call #4: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 54,
  "end_line": 62
}
```

**Result Size:** 255 bytes

**Source Code Retrieved:**

```javascript
  constructor(maxSize = 100, defaultTTL = null) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    this.eventListeners = new Map();
    this.cleanupIntervalId = null;
    
    this._startAutomaticCleanup();
  }
```

#### Call #5: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 70,
  "end_line": 81
}
```

**Result Size:** 380 bytes

**Source Code Retrieved:**

```javascript
  set(key, value, ttl = null) {
    const effectiveTTL = ttl !== null ? ttl : this.defaultTTL;
    
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this._evictLeastRecentlyUsed();
    }

    const entry = new CacheEntry(value, effectiveTTL);
    this.cache.set(key, entry);
    
    this._emitEvent(CACHE_EVENT_SET, { key, value, ttl: effectiveTTL });
  }
```

#### Call #6: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 88,
  "end_line": 105
}
```

**Result Size:** 369 bytes

**Source Code Retrieved:**

```javascript
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
```

#### Call #7: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 111,
  "end_line": 127
}
```

**Result Size:** 509 bytes

**Source Code Retrieved:**

```javascript
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
```

#### Call #8: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 133,
  "end_line": 137
}
```

**Result Size:** 152 bytes

**Source Code Retrieved:**

```javascript
  _startAutomaticCleanup() {
    this.cleanupIntervalId = setInterval(() => {
      this._removeExpiredEntries();
    }, 60000); // Run every minute
  }
```

#### Call #9: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 143,
  "end_line": 156
}
```

**Result Size:** 317 bytes

**Source Code Retrieved:**

```javascript
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
```

#### Call #10: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 163,
  "end_line": 168
}
```

**Result Size:** 199 bytes

**Source Code Retrieved:**

```javascript
  addEventListener(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(callback);
  }
```

#### Call #11: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 176,
  "end_line": 181
}
```

**Result Size:** 183 bytes

**Source Code Retrieved:**

```javascript
  _emitEvent(eventType, eventData) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(eventData));
    }
  }
```

#### Call #12: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 187,
  "end_line": 193
}
```

**Result Size:** 171 bytes

**Source Code Retrieved:**

```javascript
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: (this.cache.size / this.maxSize * 100).toFixed(2) + '%'
    };
  }
```

#### Call #13: refer_to_source_code

**Timestamp:** 19:47:21.841  
**Arguments:**

```json
{
  "start_line": 198,
  "end_line": 204
}
```

**Result Size:** 159 bytes

**Source Code Retrieved:**

```javascript
  destroy() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    this.cache.clear();
    this.eventListeners.clear();
  }
```

---

*Report generated for IRIS AST transformation analysis*