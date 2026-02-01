# Implementation Plan: IRIS Caching System

---
**Plan ID**: feature-cache-system-1  
**Created**: 2026-02-01  
**Status**: PENDING  
**Priority**: HIGH  
**Estimated Effort**: 3-5 hours  
**Dependencies**: None  
---

## 1. Overview

### 1.1 Purpose
Implement a two-tier caching system for IRIS to reduce API costs, improve response times, and enhance user experience by caching analysis results locally and leveraging OpenAI's automatic prompt caching.

### 1.2 Background
Currently, IRIS makes a fresh OpenAI API call for every file analysis, even when analyzing the same unchanged file multiple times. This results in:
- Unnecessary API costs (~$0.00135 per analysis)
- Slower response times (~1 second per request)
- Poor UX for frequently accessed files

### 1.3 Goals
- **Primary**: Reduce API calls by 70-80% through local caching
- **Secondary**: Reduce API costs by 20-40% through OpenAI prompt caching
- **Tertiary**: Improve perceived performance (<1ms for cache hits)

### 1.4 Success Criteria
- Cache hit rate >70% during active coding sessions
- OpenAI prompt cache hit rate >35% (system prompt caching)
- Zero breaking changes to existing analysis workflow
- Analysis results remain accurate (content-addressed caching)

---

## 2. Technical Approach

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────┐
│  File Open/Save Event                   │
└─────────────┬───────────────────────────┘
              │
              ▼
      ┌───────────────┐
      │ Compute Hash  │ (SHA-256 of content)
      └───────┬───────┘
              │
              ▼
      ┌─────────────────┐      HIT    ┌──────────────┐
      │  Memory Cache   ├────────────▶ │ Return JSON  │
      │  (LRU, 500)     │              │ (~1ms)       │
      └────────┬────────┘              └──────────────┘
               │ MISS
               ▼
      ┌─────────────────┐      HIT    ┌──────────────┐
      │  Disk Cache     ├────────────▶ │ Promote to   │
      │  (Persistent)   │              │ Memory+Return│
      └────────┬────────┘              └──────────────┘
               │ MISS
               ▼
      ┌─────────────────┐
      │  Call LLM API   │ (with automatic prompt caching)
      │  (gpt-5-nano)   │
      └────────┬────────┘
               │
               ▼
      ┌─────────────────┐
      │  Store in Cache │ (Memory + Disk)
      │  Record Metrics │
      └────────┬────────┘
               │
               ▼
      ┌──────────────────┐
      │  Return JSON     │
      └──────────────────┘
```

### 2.2 Key Components

**COMP-001**: `CacheMonitor` - Tracks cache performance metrics  
**COMP-002**: `AnalysisCache` - Hybrid memory + disk cache with LRU eviction  
**COMP-003**: `compute_file_hash()` - Content-addressable hash function  
**COMP-004**: Integration with existing analysis service  

### 2.3 Design Decisions

| Decision | Rationale |
|----------|-----------|
| SHA-256 for hashing | Cryptographic strength prevents collisions |
| Hybrid memory + disk | Balance speed (memory) with persistence (disk) |
| LRU eviction | Optimize for recently accessed files |
| 30-day disk TTL | Balance storage vs. stale analysis risk |
| No semantic caching | Line number accuracy is critical |

---

## 3. Implementation Phases

### Phase 1: Core Cache Infrastructure ✅ DONE

**TASK-001**: Create `cache_monitor.py` module  
- Implement `CacheMonitor` class with metrics tracking
- Add methods: `record_openai_usage()`, `record_local_cache_hit/miss()`
- Add methods: `get_stats()`, `print_stats()`, `get_cost_estimate()`
- Support persistent metrics storage (JSON)
- **Deliverable**: Functional cache monitoring system

**TASK-002**: Create `AnalysisCache` class  
- Implement hybrid memory (OrderedDict) + disk (JSON) cache
- Add LRU eviction logic (max 500 entries)
- Implement `get()` and `set()` methods with proper async handling
- Add automatic cleanup of entries older than 30 days
- **Deliverable**: Functional caching layer

**TASK-003**: Create hash utility function  
- Implement `compute_file_hash(content: str) -> str` using hashlib.sha256
- Handle encoding properly (UTF-8)
- **Deliverable**: Reliable content hashing

### Phase 2: Integration with IrisAgent ✅ DONE

**TASK-004**: Modify `IrisAgent.__init__()` to initialize caches  
- Add cache directory path from config
- Initialize `self.cache_monitor = CacheMonitor(storage_path=CACHE_METRICS_PATH)`
- Initialize `self.analysis_cache = AnalysisCache(disk_cache_dir=CACHE_DIR, cache_monitor=self.cache_monitor)`
- Log cache initialization
- **Deliverable**: Caches ready on agent startup

**TASK-005**: Modify `IrisAgent.analyze()` to check cache first  
- Compute `file_hash = compute_file_hash(source_code)` before LLM call
- Add `cached_result = await self.analysis_cache.get(file_hash, len(source_code.encode()))`
- If cached_result exists, return it immediately (with proper dict format)
- Otherwise, proceed to `_analyze_with_llm()`
- **Deliverable**: Fast path for cached files

**TASK-006**: Modify `IrisAgent._analyze_with_llm()` to record metrics and cache results  
- After successful `response = self.client.responses.parse(...)` call
- Extract OpenAI usage: `self.cache_monitor.record_openai_usage(response.usage)`
- Check for `cached_input_tokens` in response.usage (OpenAI's automatic caching)
- After `content = response.output_parsed`, store in cache:
  ```python
  file_hash = compute_file_hash(source_code)
  result_obj = AnalysisResult(
      file_intent=content.file_intent,
      responsibility_blocks=content.responsibility_blocks
  )
  await self.analysis_cache.set(file_hash, result_obj)
  ```
- **Deliverable**: Full metric collection and result caching

**TASK-007**: Add cache statistics method to `IrisAgent`  
- Add method: `def get_cache_stats(self) -> Dict[str, Any]`
- Return combined stats from `cache_monitor.get_stats()` and `analysis_cache.get_cache_stats()`
- Optionally log stats periodically (e.g., every 100 analyses)
- **Deliverable**: Observable cache performance

### Phase 3: Configuration & Polish ✅ DONE

**TASK-008**: Add cache configuration to `backend/src/config.py`  
- Add imports: `from pathlib import Path`
- Add constants:
  ```python
  # Cache configuration
  CACHE_DIR = Path(__file__).parent.parent / ".iris" / "cache"
  CACHE_MAX_MEMORY_ENTRIES = 500
  CACHE_DISK_TTL_DAYS = 30
  CACHE_METRICS_PATH = Path(__file__).parent.parent / ".iris" / "metrics.json"
  ```
- **Deliverable**: Centralized cache configuration

**TASK-009**: Add logging for cache operations  
- Replace `print()` statements with Python `logging` module
- Add logger in `agent.py`: `logger = logging.getLogger(__name__)`
- Log cache hits at INFO level: `logger.info(f"Cache hit for {filename}")`
- Log cache misses at DEBUG level: `logger.debug(f"Cache miss for {filename}")`
- Log OpenAI cache metrics at DEBUG level
- **Deliverable**: Observable cache behavior via logs

**TASK-010**: Update `.gitignore` to exclude cache directory  
- Add `.iris/` to backend `.gitignore`
- Ensures cache files are not committed to git
- **Deliverable**: Clean git status

### Phase 4: Verification [By Developer, not agent]

**TASK-011**: Manual verification of OpenAI prompt caching  
- Start backend server: `cd backend && source venv/bin/activate && python src/server.py`
- Analyze same file twice in quick succession (< 1 minute apart)
- Check console logs for OpenAI usage tokens
- Verify second call shows `cached_input_tokens > 0` in logs
- Confirm ~35-40% of input tokens (~3500 out of ~9000) are cached
- **Deliverable**: Verified OpenAI automatic caching works

**TASK-012**: Manual verification of local caching  
- Analyze a file via VS Code extension or API
- Analyze same file again immediately
- Check logs for "Cache hit for <filename>"
- Verify response is instant (<10ms vs ~1000ms)
- Check `backend/.iris/cache/` directory for cached JSON file
- **Deliverable**: Verified local cache stores and retrieves results

**TASK-013**: Verify cache persistence across backend restarts  
- Analyze a file
- Stop backend server (Ctrl+C)
- Restart backend server
- Analyze same file again
- Verify cache hit (loaded from disk, not memory)
- Check logs for cache promotion from disk to memory
- **Deliverable**: Verified cross-session caching works

**TASK-014**: Verify cache invalidation on content change  
- Analyze a file
- Modify file content (e.g., add a comment)
- Analyze modified file
- Verify cache miss in logs (new hash computed)
- Verify new cached file created in `.iris/cache/`
- Check old cached file still exists (not overwritten)
- **Deliverable**: Verified content-based invalidation

---

## 4. Code Changes

### 4.1 New Files

**FILE-001**: `backend/src/cache_monitor.py` ⭐ NEW  
- Contains `CacheMonitor` class
- Contains `OpenAICacheMetrics` and `LocalCacheMetrics` dataclasses
- ~300 lines

**FILE-002**: `backend/src/analysis_cache.py` ⭐ NEW  
- Contains `AnalysisCache` class
- Contains `compute_file_hash()` function
- Contains `AnalysisResult` class for type safety
- ~200 lines

**FILE-003**: `backend/.iris/cache/` ⭐ NEW DIRECTORY  
- Storage for cached analysis results (JSON files)
- Auto-created on first cache write

**FILE-004**: `backend/.iris/metrics.json` ⭐ NEW FILE  
- Persistent cache performance metrics
- Auto-created by CacheMonitor

### 4.2 Modified Files

**FILE-005**: `backend/src/prompts.py` ✅ VERIFY ONLY  
- **Current status**: System prompt is ~3.5k tokens ✅
- **Current status**: Static content comes first ✅
- **Action**: No changes needed - already optimized for OpenAI caching

**FILE-006**: `backend/src/agent.py` 🔧 MODIFY  
- Import: `from cache_monitor import CacheMonitor`
- Import: `from analysis_cache import AnalysisCache, compute_file_hash, AnalysisResult`
- Modify `__init__()`: Initialize `CacheMonitor` and `AnalysisCache`
- Modify `analyze()`: Check cache before LLM call
- Modify `_analyze_with_llm()`: Record OpenAI usage metrics
- Modify `_analyze_with_llm()`: Store results in cache after LLM call
- **Lines changed**: ~60-80 lines

**FILE-007**: `backend/src/config.py` 🔧 MODIFY  
- Add cache configuration constants:
  - `CACHE_DIR = Path("backend/.iris/cache")`
  - `CACHE_MAX_MEMORY_ENTRIES = 500`
  - `CACHE_DISK_TTL_DAYS = 30`
  - `CACHE_METRICS_PATH = Path("backend/.iris/metrics.json")`
- **Lines added**: ~10 lines

**FILE-008**: `backend/src/__init__.py` 🔧 MODIFY (optional)  
- Export `CacheMonitor` and `AnalysisCache` if needed
- **Lines added**: ~2 lines

---

## 5. Data & Storage

### 5.1 Cache Storage Structure

```
backend/
├── .iris/
│   ├── cache/
│   │   ├── a3f5e8... .json    # Cached analysis for file with hash a3f5e8...
│   │   ├── b7c2d1....json    # Cached analysis for file with hash b7c2d1...
│   │   └── ...
│   └── metrics.json           # Cache performance metrics (persistent)
└── src/
    ├── agent.py               # IrisAgent class (modified)
    ├── cache_monitor.py       # CacheMonitor class (new)
    ├── analysis_cache.py      # AnalysisCache class (new)
    └── config.py              # Cache config constants (modified)
```

**Note**: The `.iris/` directory is git-ignored and created automatically on first use.

### 5.2 Cache Entry Format

```json
{
  "file_intent": "Authentication and authorization service",
  "responsibility_blocks": [
    {
      "label": "User authentication",
      "description": "Handles login and token generation",
      "ranges": [[15, 45], [67, 89]]
    }
  ],
  "analyzed_at": 1738444800.123
}
```

### 5.3 Metrics Format

```json
{
  "session_start": 1738444800.0,
  "total_api_calls": 127,
  "total_cached_tokens": 437515,
  "total_prompt_tokens": 1144524,
  "openai_metrics": [...],
  "local_metrics": [...]
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests (Deferred)

Testing will be performed manually initially. Unit tests can be added later:
- Test cache hit/miss scenarios
- Test LRU eviction
- Test disk persistence
- Test hash collision handling
- Test metric recording

### 6.2 Integration Tests (Deferred)

Manual verification only for MVP:
- End-to-end caching flow
- Cross-session persistence
- Cache invalidation on content change

### 6.3 Performance Tests (Deferred)

Will monitor in production:
- Cache hit rate over time
- Response time improvement
- Cost reduction

---

## 7. Risks & Assumptions

### 7.1 Risks

**RISK-001**: Cache corruption  
- **Mitigation**: Graceful fallback to API on read errors; delete corrupted files

**RISK-002**: Disk space usage  
- **Mitigation**: 30-day TTL cleanup; LRU eviction in memory

**RISK-003**: Hash collisions  
- **Mitigation**: SHA-256 has negligible collision probability for this use case

**RISK-004**: Stale analysis results  
- **Mitigation**: Content-addressed caching ensures cache invalidation on any change

### 7.2 Assumptions

**ASSUMPTION-001**: File content is the sole determinant of analysis  
- Analysis depends only on file content, not external factors

**ASSUMPTION-002**: System prompt remains static  
- Prompt changes invalidate OpenAI cache automatically (different prefix)

**ASSUMPTION-003**: 500 entries fits in memory  
- Average entry ~5-10KB = ~2.5-5MB total (acceptable)

**ASSUMPTION-004**: Disk I/O is acceptable  
- Disk reads ~5-20ms are acceptable vs 1000ms API calls
