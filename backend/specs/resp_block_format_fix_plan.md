### Phase 1: Update Response Schema in `prompts.py`

**Goal:** Redefine the expected output format in all analyzer/critic prompts

#### TASK-BE-001: Update `ANALYZER_OUTPUT_SCHEMA` 
**File:** `backend/src/prompts.py`

**Current Schema:**
```python
"responsibility_blocks": [
    {
        "id": "kebab-case-id",
        "label": "string",
        "description": "string",
        "elements": {
            "functions": ["list"],
            "state": ["list"],
            "imports": ["list"],
            "types": ["list"],
            "constants": ["list"],
        },
        "ranges": [[1, 10], [50, 60]],
    }
]
```

**Required Changes:**
- Already correct in prompts.py (lines seen in search results)
- ✅ No changes needed - schema is already properly defined

#### TASK-BE-002: Verify `ANALYSIS_OUTPUT_SCHEMA` for fast-path
**File:** `backend/src/prompts.py` (line ~70)

**Action:** Ensure the fast-path schema matches the two-agent schema exactly
- Verify it includes `elements` structure (not flat `entities`)
- Verify it includes `ranges` field
- Verify it includes `id` field

---

### Phase 2: Fix Analyzer Response Parsing in `analyzer.py`

**Goal:** Parse the new response format correctly and preserve structured data

#### TASK-BE-003: Update `_to_hypothesis()` method
**File:** `backend/src/agents/analyzer.py` (around line 170-210)

**Current Problem:**
```python
# Current code flattens elements into a single entities list
entities = block.get("entities", [])
if not entities and "elements" in block:
    elements = block["elements"]
    entities = (
        elements.get("functions", [])
        + elements.get("state", [])
        + # ... flattens everything
    )

responsibility_blocks.append(
    ResponsibilityBlock(
        title=block.get("label") or block.get("title", ""),
        description=block.get("description", ""),
        entities=entities,  # ❌ Loses type information
    )
)
```

**Required Fix:**
```python
def _to_hypothesis(self, parsed: Dict[str, Any], iteration: int) -> Hypothesis:
    """Convert parsed JSON response to Hypothesis dataclass."""
    file_intent = parsed.get("file_intent", "")
    raw_blocks = parsed.get("responsibility_blocks") or parsed.get("responsibilities", [])
    
    responsibility_blocks: List[ResponsibilityBlock] = []
    for block in raw_blocks:
        # NEW: Preserve structured elements instead of flattening
        elements = block.get("elements", {
            "functions": [],
            "state": [],
            "imports": [],
            "types": [],
            "constants": []
        })
        
        # NEW: Extract ranges
        ranges = block.get("ranges", [])
        
        # NEW: Extract or generate ID
        block_id = block.get("id", "")
        
        responsibility_blocks.append(
            ResponsibilityBlock(
                id=block_id,
                label=block.get("label", ""),
                description=block.get("description", ""),
                elements=elements,  # ✅ Preserve structure
                ranges=ranges,      # ✅ Include ranges
            )
        )
    
    # ... rest of method
```

---

### Phase 3: Update `ResponsibilityBlock` Schema in `schemas.py`

**Goal:** Update the dataclass to match new response format

#### TASK-BE-004: Redefine `ResponsibilityBlock` dataclass
**File:** `backend/src/agents/schemas.py`

**Current Definition:**
```python
@dataclass
class ResponsibilityBlock:
    title: str
    description: str
    entities: List[str]  # ❌ Flat list
```

**Required Fix:**
```python
@dataclass
class ResponsibilityBlock:
    id: str
    label: str
    description: str
    elements: Dict[str, List[str]]  # ✅ Structured: {functions: [], state: [], ...}
    ranges: List[List[int]]          # ✅ Line ranges: [[1,10], [50,60]]
```

---

### Phase 4: Update Orchestrator to Pass Structured Data Through

**Goal:** Ensure orchestrator doesn't flatten or lose data when logging/returning

#### TASK-BE-005: Update orchestrator logging
**File:** `backend/src/agents/orchestrator.py` (around line 150-180)

**Current Problem:**
```python
# Orchestrator logs only title, description, entities
self.debugger.log_agent_iteration(
    iteration=current_iteration + 1,
    agent="analyzer",
    hypothesis={
        "file_intent": hypothesis.file_intent,
        "responsibility_blocks": [
            {
                "title": block.title,  # ❌ Wrong field name
                "description": block.description,
                "entities": block.entities,  # ❌ Flat list
            }
            for block in hypothesis.responsibility_blocks
        ],
    },
)
```

**Required Fix:**
```python
self.debugger.log_agent_iteration(
    iteration=current_iteration + 1,
    agent="analyzer",
    hypothesis={
        "file_intent": hypothesis.file_intent,
        "responsibility_blocks": [
            {
                "id": block.id,                    # ✅ Include ID
                "label": block.label,               # ✅ Correct field name
                "description": block.description,
                "elements": block.elements,         # ✅ Structured elements
                "ranges": block.ranges,             # ✅ Line ranges
            }
            for block in hypothesis.responsibility_blocks
        ],
    },
)
```

---

### Phase 5: Update Final API Response Construction

**Goal:** Return the correct format to frontend in `/api/iris/analyze` endpoint

#### TASK-BE-006: Update `agent.py` or API route handler
**File:** `backend/src/agent.py` or wherever final response is constructed

**Current Problem:**
Likely returns:
```python
{
    "file_intent": "...",
    "responsibilities": [
        {
            "title": "...",
            "description": "...",
            "entities": ["flat", "list"]
        }
    ]
}
```

**Required Fix:**
```python
{
    "file_intent": hypothesis.file_intent,
    "responsibility_blocks": [  # ✅ Use correct field name
        {
            "id": block.id,
            "label": block.label,
            "description": block.description,
            "elements": block.elements,  # ✅ Already structured
            "ranges": block.ranges,
        }
        for block in hypothesis.responsibility_blocks
    ],
    "metadata": {
        "final_confidence": final_confidence,
        "iterations": total_iterations,
        # ... other metadata
    }
}
```

---

### Phase 6: Update Critic to Validate New Format

**Goal:** Ensure Critic evaluates based on structured elements, not flat entities

#### TASK-BE-007: Update `CRITIC_SYSTEM_PROMPT` validation logic
**File:** `backend/src/prompts.py`

**Action:** 
- Update examples in Critic prompt to reference `elements.functions`, not `entities`
- Update "Missing entities" feedback to specify which element category is missing
- Example: "Missing from elements.functions: calculateTotal"

---

## Summary of Files to Modify

| File | Primary Changes | Priority |
|------|----------------|----------|
| `backend/src/agents/schemas.py` | Redefine `ResponsibilityBlock` dataclass | P0 (Critical) |
| `backend/src/agents/analyzer.py` | Fix `_to_hypothesis()` to preserve structure | P0 (Critical) |
| `backend/src/agents/orchestrator.py` | Update logging to use new fields | P1 (High) |
| `backend/src/agent.py` | Update final API response construction | P0 (Critical) |
| `backend/src/prompts.py` | Verify schemas, update Critic examples | P1 (High) |

