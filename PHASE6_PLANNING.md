# Phase 6: Semantic Intent Overlay - Planning Document

**Status:** 🔜 **PLANNING**  
**Date:** January 4, 2026  
**Prerequisite:** ✅ Noise Eraser v1 Complete

---

## 📋 Objective

Move beyond structural noise reduction to **semantic understanding** by overlaying LLM-generated explanations of code intent, purpose, and "why" decisions on GitHub code pages.

**User Need:** "I can see WHAT this code does, but WHY is it doing it?"

---

## 🎯 Core Features

### 1. Intent Chip Display
- **Visual:** Small, unobtrusive chips/badges above functions or critical code blocks
- **Content:** 1-2 sentence LLM-generated intent summary
- **Interaction:** 
  - Hover → expand to full explanation
  - Click → pin explanation
  - Right-click → regenerate, edit, or hide

### 2. Code Segmentation
- **Strategy:** Break files into analyzable chunks
  - **Function-level** (preferred): Each function analyzed separately
  - **Block-level**: Critical blocks (loops, conditionals with comments)
  - **File-level**: Small files (<100 lines) analyzed as whole
- **Context preservation:** Include function signature + docstring for better LLM understanding

### 3. LLM Integration
- **Primary API:** OpenAI GPT-4o or Claude Sonnet
- **Prompt engineering:**
  ```
  You are analyzing code from a GitHub repository.
  Explain the PRIMARY INTENT of this function in 1-2 sentences.
  Focus on WHY this code exists, not WHAT it does line-by-line.
  
  Code:
  [function code here]
  
  Response format: {"intent": "...", "complexity": "low|medium|high"}
  ```

### 4. Caching System
- **Hash-based:** SHA-256 of code block → cached intent
- **Storage:** IndexedDB (browser-side) or backend Redis
- **Invalidation:** File modification detected via GitHub API
- **TTL:** 30 days for inactive entries

---

## 🏗️ Architecture Plan

```
Extension (content.js)
  ↓
Extract code segments (functions, blocks)
  ↓
Check cache (IndexedDB) → HIT? Display intent chip
  ↓ MISS
Send to backend /analyze-intent
  ↓
Backend (Flask)
  ↓
Check Redis cache → HIT? Return cached
  ↓ MISS
Call OpenAI/Claude API
  ↓
Parse response → Store in Redis → Return
  ↓
Extension receives intent → Display chip → Cache in IndexedDB
```

---

## 📊 Cost Analysis

### API Costs (Estimated)
| Model | Cost per 1M tokens | Avg function (~200 tokens) | Cost per function |
|-------|-------------------|----------------------------|-------------------|
| GPT-4o | $2.50 input, $10 output | ~400 tokens total | $0.005 |
| Claude Sonnet | $3.00 input, $15 output | ~400 tokens total | $0.007 |
| GPT-3.5 Turbo | $0.50 input, $1.50 output | ~400 tokens total | $0.0008 |

**Real-world estimate:**
- 100 functions per PR review
- With 90% cache hit rate → 10 API calls
- Cost per PR: **$0.05 - $0.07** (GPT-4o)
- Monthly (50 PRs): **$2.50 - $3.50**

**Optimization strategies:**
1. Start with GPT-3.5 Turbo for cost savings
2. Aggressive caching (90%+ hit rate goal)
3. User-configurable: "Analyze only changed functions in PR"

---

## 🎨 UI/UX Design

### Intent Chip Mockup
```
┌─────────────────────────────────────────────┐
│  function calculateDiscount(price, tier) {  │ ← Function signature
│  📘 Applies tiered pricing model based...   │ ← Intent chip (collapsible)
│                                             │
│    if (tier === 'premium') {               │
│      return price * 0.8;                   │
│    }                                       │
│    ...                                     │
│  }                                         │
└─────────────────────────────────────────────┘
```

### Expanded Intent View (Hover)
```
┌──────────────────────────────────────────────────────────┐
│ 💡 Intent Analysis                                       │
│                                                          │
│ This function implements a tiered discount strategy     │
│ where premium customers receive 20% off while standard  │
│ customers get 10% off. The logic centralizes pricing    │
│ rules to ensure consistency across the checkout flow.   │
│                                                          │
│ Complexity: Medium                                       │
│ Confidence: 95%                                          │
│ ────────────────────────────────────────────────────── │
│ [🔄 Regenerate]  [✏️ Edit]  [🗑️ Hide]  [📋 Copy]      │
└──────────────────────────────────────────────────────────┘
```

### Color System
- **Blue (📘)**: Intent/purpose explanation
- **Yellow (⚠️)**: Potential issue or warning
- **Green (✨)**: Optimization suggestion
- **Gray (🔧)**: Technical note

### Position Strategy
1. **Above function** (preferred) - Clear visual separation
2. **Inline comment style** - Looks native to code
3. **Sidebar** (alternative) - Doesn't disrupt code flow

---

## 🛠️ Implementation Phases

### Phase 6.1: Backend LLM Integration (Week 1)
- [ ] Add OpenAI SDK to `requirements.txt`
- [ ] Create `/api/analyze-intent` endpoint
- [ ] Implement prompt engineering module
- [ ] Add Redis caching layer (optional - can use dict for MVP)
- [ ] Rate limiting (10 requests/min per user)
- [ ] Error handling (API failures, timeout)

### Phase 6.2: Code Segmentation (Week 1-2)
- [ ] Function extraction logic (regex + heuristics)
- [ ] AST parsing for better accuracy (optional)
- [ ] Context builder (include docstrings, nearby comments)
- [ ] Multi-language support (JS, Python, Go priority)

### Phase 6.3: Extension UI (Week 2)
- [ ] Intent chip component creation
- [ ] Positioning logic (above function signature)
- [ ] Hover expansion functionality
- [ ] Click-to-pin state management
- [ ] Hide/show toggle per function

### Phase 6.4: Caching System (Week 2-3)
- [ ] IndexedDB schema design
- [ ] Hash generation for code blocks
- [ ] Cache hit/miss logging
- [ ] Cache invalidation strategy
- [ ] Manual cache clear option in settings

### Phase 6.5: Testing & Optimization (Week 3)
- [ ] Test with real PRs (JavaScript, Python, Go)
- [ ] Measure cache hit rate
- [ ] Optimize prompt for shorter responses (token savings)
- [ ] A/B test chip positions
- [ ] Performance benchmarks

---

## 📝 API Endpoint Specification

### POST /api/analyze-intent

**Request:**
```json
{
  "code": "function calculateDiscount(price, tier) { ... }",
  "language": "javascript",
  "context": {
    "filename": "checkout.js",
    "surrounding_code": "// Previous lines for context",
    "function_name": "calculateDiscount"
  }
}
```

**Response:**
```json
{
  "success": true,
  "intent": "Applies tiered pricing model based on customer membership level",
  "complexity": "medium",
  "confidence": 0.95,
  "tokens_used": 387,
  "cache_hit": false,
  "hash": "sha256:abc123..."
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "API rate limit exceeded",
  "retry_after": 30
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Code segmentation accuracy (extract all functions)
- [ ] Hash generation consistency
- [ ] Cache hit/miss logic
- [ ] LLM response parsing

### Integration Tests
- [ ] End-to-end flow (extension → backend → LLM → cache → display)
- [ ] Cache persistence across sessions
- [ ] Error handling (API down, timeout, invalid response)

### Manual Testing
- [ ] Test on popular repos (React, Django, Kubernetes)
- [ ] Validate intent accuracy (does it make sense?)
- [ ] UX feedback (is chip placement intuitive?)
- [ ] Performance (does it slow down page load?)

---

## 🚧 Technical Challenges & Solutions

### Challenge 1: Function Extraction Accuracy
**Problem:** Regex-based extraction may fail on complex syntax  
**Solution:**
- Primary: Regex with tested patterns
- Fallback: AST parsing with Tree-sitter
- Edge case: Manual marking by user (future)

### Challenge 2: LLM Cost Management
**Problem:** Costs can spiral with heavy usage  
**Solution:**
- Aggressive caching (target 95% hit rate)
- User opt-in per PR (don't auto-analyze everything)
- Budget cap per user (10 analyses/day free tier)

### Challenge 3: Response Time
**Problem:** API latency (1-3 seconds per function)  
**Solution:**
- Asynchronous loading (show spinner)
- Batch processing (analyze multiple functions in parallel)
- Progressive disclosure (analyze visible functions first)

### Challenge 4: Context Window Limits
**Problem:** Very long functions exceed token limits  
**Solution:**
- Truncate to first 500 tokens + last 100 tokens
- Summarize function signature + docstring only
- Warn user "Function too large for analysis"

---

## 📊 Success Metrics

### Quantitative
- **Cache hit rate:** >90%
- **Average response time:** <2 seconds
- **Accuracy:** >80% of intents deemed "helpful" by users
- **Cost per PR:** <$0.10

### Qualitative
- User feedback: "Now I understand WHY this code exists"
- Reduced time to PR approval (self-reported)
- Adoption rate: >50% of Noise Eraser users enable Intent Overlay

---

## 🔐 Privacy & Security

### Data Handling
- **No storage of proprietary code** on our servers (pass-through to OpenAI)
- **Caching:** Store hash + intent only, not full code
- **User consent:** Clear disclosure in settings about LLM usage

### OpenAI Terms Compliance
- Check OpenAI Terms of Service for code analysis use case
- Ensure no PII leakage in code samples
- Implement data retention policy (30 days)

---

## 🎯 MVP Scope (Minimum Viable Product)

To ship Phase 6 quickly, focus on:
1. ✅ JavaScript function analysis only
2. ✅ OpenAI GPT-3.5 Turbo (cheapest)
3. ✅ Basic intent chip (no color coding yet)
4. ✅ Simple hover expansion
5. ✅ In-memory caching (no Redis initially)
6. ✅ Manual trigger (button to analyze current function)

**Deferred to v1.1:**
- Multi-language support
- Complexity scoring
- Optimization suggestions
- IndexedDB persistence
- Auto-analysis on page load

---

## 📅 Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 6.1 Backend LLM Integration | 3 days | OpenAI API key |
| 6.2 Code Segmentation | 4 days | Pattern research |
| 6.3 Extension UI | 3 days | Phase 6.2 complete |
| 6.4 Caching System | 2 days | Phase 6.1 complete |
| 6.5 Testing & Optimization | 3 days | All phases complete |
| **Total** | **15 days** | ~3 weeks |

**Realistic timeline with military service constraints:** 4-6 weeks

---

## 🚀 Next Actions

1. **Research Phase:**
   - [ ] Sign up for OpenAI API (get API key)
   - [ ] Study function extraction techniques (regex vs AST)
   - [ ] Review similar tools (GitHub Copilot, Sourcegraph Cody)

2. **Prototype Phase:**
   - [ ] Build standalone script to extract functions from JS file
   - [ ] Test OpenAI API with sample functions
   - [ ] Measure token usage and costs

3. **Integration Phase:**
   - [ ] Add backend endpoint
   - [ ] Create intent chip component
   - [ ] Implement basic caching

4. **Documentation:**
   - [ ] Update README with Phase 6 features
   - [ ] Create user guide for Intent Overlay
   - [ ] Document API costs and caching strategy

---

## 💡 Innovation Ideas (Future)

1. **Diff-aware analysis**: Analyze only changed functions in PRs
2. **Interactive refinement**: User can chat with LLM to clarify intent
3. **Team knowledge base**: Share intent annotations across team
4. **Learning mode**: Train custom model on team's codebase
5. **Intent history**: Track how function intent evolved over time

---

**Status:** Ready to begin Phase 6 implementation  
**Next Step:** Obtain OpenAI API key and begin backend integration  
**Timeline:** Start Week of January 6, 2026
