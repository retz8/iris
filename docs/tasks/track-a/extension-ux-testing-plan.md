---
goal: Manual Testing Plan for Track A Extension UX Improvements
date_created: 2026-02-16
status: Planned
tags: [testing, manual, error-handling, caching, persistence]
---

# Extension UX Testing Plan

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Manual testing plan for the two major Track A features: Error UI and Multi-file Cache + Persistence.

## Prerequisites

1. Open the `iris` project in VS Code
2. Run `npm run build` from root
3. Press **F5** to launch the Extension Development Host
4. Open the IRIS sidebar panel (click the IRIS icon in the activity bar)
5. Open a supported file (`.ts`, `.py`, `.js`, `.tsx`, `.jsx`)

## Part 1: Error UI Testing

### TEST-E01: Network Error Display

**Setup:** Stop local backend. Set endpoint to `http://localhost:8080/api/iris/analyze` in `packages/iris-core/src/config/endpoints.ts`. Rebuild and press F5.

**Steps:**
1. Open any `.ts` file
2. Run command: `IRIS: Run Analysis` (Cmd+Shift+P)

**Expected:**
- Sidebar shows error banner with red/error styling
- Badge shows **Network**
- Message: "Unable to connect to IRIS server..."
- Large **Retry Analysis** button visible
- No "Configure API Key" button
- Error persists in sidebar (not just a toast)

| Check | Pass |
|-------|------|
| Error banner visible in sidebar | |
| Badge text is "Network" | |
| Retry Analysis button present | |
| No Configure API Key button | |
| Error toast also shown | |

### TEST-E02: Auth Error (401) Display

**Setup:** Set endpoint to production `https://api.iris-codes.com/api/iris/analyze`. Set `iris.apiKey` to `wrong-key-123` in VS Code settings. Rebuild and press F5.

**Steps:**
1. Open any `.ts` file
2. Run `IRIS: Run Analysis`

**Expected:**
- Sidebar shows error banner with **yellow/warning** styling (not red)
- Badge shows **Auth**
- Both **Retry Analysis** and **Configure API Key** buttons visible
- Clicking "Configure API Key" opens VS Code settings filtered to `iris.apiKey`

| Check | Pass |
|-------|------|
| Error banner has warning (yellow) styling | |
| Badge text is "Auth" | |
| Both buttons visible | |
| Configure API Key opens settings | |

### TEST-E03: Timeout Error Display

**Setup:** Start local backend. Set `DEFAULT_IRIS_API_TIMEOUT = 100` in `packages/iris-core/src/config/endpoints.ts` (100ms will timeout). Set endpoint to localhost. Rebuild and press F5.

**Steps:**
1. Open any `.ts` file
2. Run `IRIS: Run Analysis`

**Expected:**
- Sidebar shows error banner with **Timeout** badge
- Message about timeout
- Retry Analysis button visible
- No Configure API Key button

**Cleanup:** Reset timeout to original value after testing.

| Check | Pass |
|-------|------|
| Badge text is "Timeout" | |
| Retry button present | |
| No Configure API Key button | |

### TEST-E04: Retry Button Triggers New Analysis

**Setup:** Trigger any error (TEST-E01 is easiest).

**Steps:**
1. Verify error UI in sidebar
2. Fix the error condition (e.g., start backend)
3. Click **Retry Analysis** button in sidebar

**Expected:**
- Analysis starts (sidebar shows spinner/loading)
- On success: error UI replaced by analysis results
- Error details fully cleared from state

| Check | Pass |
|-------|------|
| Clicking Retry triggers analysis | |
| Spinner appears during analysis | |
| Success clears error completely | |

### TEST-E05: Error Clears on Manual Re-analysis

**Steps:**
1. Trigger an error
2. Fix the error condition
3. Instead of clicking Retry, run `IRIS: Run Analysis` from command palette

**Expected:**
- Error UI immediately replaced by "Analyzing..." spinner
- Success shows normal analysis results

| Check | Pass |
|-------|------|
| Manual command clears error state | |
| Results render normally after | |

### TEST-E06: Auto-analysis Error (Silent Mode)

**Setup:** Enable `iris.autoAnalyze` (default true). Stop backend. Set endpoint to localhost. Rebuild and press F5.

**Steps:**
1. Switch to a supported file tab

**Expected:**
- After ~1 second debounce, auto-analysis fires
- Error UI renders in sidebar (same as manual trigger)
- No toast notification (silent mode)

| Check | Pass |
|-------|------|
| Auto-analysis triggers on file switch | |
| Error renders in sidebar | |
| No toast shown for silent errors | |

### TEST-E07: Theme Compatibility

**Steps:**
1. Trigger an auth error (TEST-E02)
2. Switch between dark theme and light theme (Cmd+K Cmd+T)
3. Trigger a network error (TEST-E01)
4. Switch themes again

**Expected:**
- Error banner readable in both themes
- Badge and buttons contrast properly
- Auth warning (yellow) distinguishable from network error (red)

| Check | Pass |
|-------|------|
| Dark theme: error banner readable | |
| Light theme: error banner readable | |
| Auth vs network styling distinguishable | |

## Part 2: Multi-file Cache + Persistence Testing

### TEST-C01: Cache Hit on File Switch

**Setup:** Backend running. Valid API key configured. Rebuild and press F5.

**Steps:**
1. Open `fileA.ts`, run `IRIS: Run Analysis` (or wait for auto-analysis)
2. Verify analysis results appear
3. Open `fileB.ts`, run analysis
4. Switch back to `fileA.ts` tab

**Expected:**
- `fileA.ts` results appear **instantly** (no spinner, no API call)
- Check IRIS output channel: should log "Cache hit" (not "Sending analysis request")

| Check | Pass |
|-------|------|
| File A results appear instantly on switch-back | |
| Output channel shows "Cache hit" | |
| No new API call made for cached file | |

### TEST-C02: Manual Analysis Bypasses Cache

**Steps:**
1. Analyze `fileA.ts` (now cached)
2. While still on `fileA.ts`, run `IRIS: Run Analysis` manually

**Expected:**
- Full API call is made (cache bypassed)
- Output channel shows "Sending analysis request" (not "Cache hit")
- Results update normally

| Check | Pass |
|-------|------|
| Manual command triggers API call | |
| Output channel shows API request, not cache hit | |

### TEST-C03: Cache Invalidation on File Edit

**Steps:**
1. Analyze `fileA.ts` (cached)
2. Make any edit to `fileA.ts` (add a space, type a character)
3. Check sidebar: should show STALE state
4. Switch to `fileB.ts`, then switch back to `fileA.ts`

**Expected:**
- After edit: state transitions to STALE, cache invalidated
- Switching back: auto-analysis triggers new API call (not cache hit)
- Output channel shows "Cache invalidated" and then "Sending analysis request"

| Check | Pass |
|-------|------|
| Edit triggers STALE transition | |
| Cache entry removed on edit | |
| Re-analysis triggered on switch-back | |

### TEST-C04: LRU Eviction

**Steps:**
1. Analyze 11 different supported files sequentially (file1 through file11)
2. Switch back to file1

**Expected:**
- file1 was evicted (it was the oldest)
- Switching to file1 triggers new API call (cache miss)
- Output channel shows "Cache evicted (LRU)" during the 11th file analysis

| Check | Pass |
|-------|------|
| 11th file evicts oldest entry | |
| Oldest file re-analyzed on revisit | |
| Output channel logs eviction | |

### TEST-C05: Persistence Across Extension Reload

**Steps:**
1. Analyze `fileA.ts` and `fileB.ts`
2. Verify both have results
3. Run `Developer: Reload Window` (Cmd+Shift+P)
4. Open `fileA.ts`

**Expected:**
- `fileA.ts` results appear **instantly** after reload (restored from workspaceState)
- Output channel shows "Cache restored from workspaceState"
- No new API call for `fileA.ts`

| Check | Pass |
|-------|------|
| Results appear instantly after reload | |
| Output channel shows cache restore | |
| No API call for restored file | |

### TEST-C06: Stale Persistence Detection (External Edit)

**Steps:**
1. Analyze `fileA.ts`
2. Edit `fileA.ts` outside VS Code (e.g., in a terminal: `echo "// comment" >> fileA.ts`)
3. Run `Developer: Reload Window`
4. Open `fileA.ts`

**Expected:**
- Stale cache entry discarded during restore (hash mismatch)
- Output channel shows "Discarded stale cache entry (hash mismatch)"
- Auto-analysis triggers fresh API call

| Check | Pass |
|-------|------|
| Stale entry discarded on restore | |
| Output channel logs hash mismatch | |
| Fresh analysis triggered | |

### TEST-C07: Activation Performance

**Steps:**
1. Analyze 5-10 files to populate cache
2. Run `Developer: Reload Window`
3. Observe extension activation time

**Expected:**
- Extension activates without noticeable delay
- Cache restore runs asynchronously (non-blocking)
- No freeze or lag in editor

| Check | Pass |
|-------|------|
| No noticeable activation delay | |
| Editor responsive during restore | |

### TEST-C08: Auto-analysis Uses Cache

**Setup:** Enable `iris.autoAnalyze` (default). Backend running.

**Steps:**
1. Analyze `fileA.ts`, `fileB.ts`, `fileC.ts`
2. Switch between the three file tabs rapidly

**Expected:**
- Each file shows results instantly on switch (cache hit)
- No spinners or loading states for cached files
- Output channel logs "Cache hit" for each switch

| Check | Pass |
|-------|------|
| All three files show instant results | |
| No loading spinners for cached files | |
| Output channel confirms cache hits | |
