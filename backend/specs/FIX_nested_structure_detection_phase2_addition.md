# Phase 2: Prompt Enhancement for Nested Structure

## Problem

Phase 1 (AST enhancement) is **WORKING** - the Shallow AST now shows nested functions as `children`.

However, the agent still groups all 11 functions into ONE responsibility block because it lacks guidance on **how to interpret nested structure**.

---

## Solution

Add container file guidance to `TOOL_CALLING_SYSTEM_PROMPT` in `backend/src/iris_agent/prompts.py`.

---

## Exact Prompt Text to Add

### Location: `backend/src/iris_agent/prompts.py`

### Insert After: The "## PHASE 1: STRUCTURAL HYPOTHESIS" section header

### Text to Add:

```python
TOOL_CALLING_SYSTEM_PROMPT = """
You are **IRIS**, a code comprehension assistant.

### THE IRIS MISSION
... [existing text remains] ...

---

## PHASE 1: STRUCTURAL HYPOTHESIS (Mental Mapping)

**CRITICAL: DO NOT call any tools in this phase.**
Scan the provided Shallow AST metadata...

### **IMPORTANT: Container File Detection**

**What is a Container File?**
A file where most logic is **nested inside** a single parent function, class, or IIFE.

**How to Identify:**
If you see a node (function/class) with many `children` that are function/method declarations,
this is a Container File.

**Example Container AST Pattern:**
```json
{
  "type": "function_declaration",
  "name": "buildComplexEntity",
  "line_range": [1, 500],
  "children": [
    {"type": "function_declaration", "name": "initializeComponentA", "line_range": [10, 50]},
    {"type": "function_declaration", "name": "processComponentA", "line_range": [52, 80]},
    {"type": "function_declaration", "name": "initializeComponentB", "line_range": [82, 120]},
    {"type": "function_declaration", "name": "processComponentB", "line_range": [122, 180]},
    {"type": "function_declaration", "name": "validateInputs", "line_range": [182, 210]},
    {"type": "function_declaration", "name": "assembleComponents", "line_range": [212, 280]},
    ... more nested functions
  ]
}
```

**How to Analyze Container Files:**

1. **DO NOT treat the parent as atomic**
   - ✗ WRONG: Single block "Complex Entity Builder" containing all nested functions
   - ✓ RIGHT: Analyze nested children and group by logical purpose

2. **Identify patterns in nested function names**
   
   **Pattern Detection:**
   - **Prefix clustering**: `initialize*`, `process*`, `validate*`, `assemble*`
   - **Domain clustering**: Functions operating on same entity (ComponentA, ComponentB)
   - **Stage clustering**: Functions representing sequential phases (init → process → validate → assemble)
   
   **Example Grouping Logic:**
   ```
   "initializeComponentA" + "processComponentA" → Component A Lifecycle
   "initializeComponentB" + "processComponentB" → Component B Lifecycle
   "validateInputs" → Input Validation
   "assembleComponents" → Assembly Orchestration
   ```

3. **Separate orchestration from subsystems**
   - The parent function's **main body** (after nested function definitions) is often orchestration
   - This is a distinct responsibility: "Orchestrator" or "Coordinator"

**Generic Analysis Process:**

Given ANY container with nested functions:

**Step 1: Scan function names for patterns**
- Common prefixes? (create*, init*, validate*, process*, render*, handle*)
- Common suffixes? (*Handler, *Manager, *Builder, *Processor)
- Shared domain terms? (User*, Order*, Payment*, Component*)

**Step 2: Group by logical purpose**
- Functions that work together toward a single goal → One block
- Functions that operate on the same entity → One block
- Functions at different abstraction levels → Separate blocks

**Step 3: Identify orchestration**
- The parent function's main logic (variable setup, function calls, return) → Separate block
- Label: "[Domain] Orchestrator/Coordinator/Pipeline"

**Example Output (Generic Pattern):**

**Responsibility Blocks:**
1. **Component A Lifecycle**
   - Functions: initializeComponentA, processComponentA
   - Purpose: Complete lifecycle management for Component A entity

2. **Component B Lifecycle**
   - Functions: initializeComponentB, processComponentB
   - Purpose: Complete lifecycle management for Component B entity

3. **Input Validation Layer**
   - Functions: validateInputs
   - Purpose: Pre-processing validation and sanitization

4. **Assembly Orchestration**
   - Functions: assembleComponents, buildComplexEntity (main body only)
   - Purpose: Coordinates subsystems into final output

**What NOT to Do:**

✗ Single block "Helper Functions" containing all nested functions
✗ One block per function (over-fragmentation)
✗ Generic labels without domain context ("Utilities", "Functions", "Logic")
✗ Ignoring name patterns (grouping unrelated functions)

---

### **Multi-Domain Container Examples**

To ensure this pattern transfers across domains, here are examples from different code types:

#### **Example 1: React Component Container**
```json
{
  "type": "function_declaration",
  "name": "UserDashboard",
  "children": [
    {"name": "handleLogin", "line_range": [10, 25]},
    {"name": "handleLogout", "line_range": [27, 35]},
    {"name": "fetchUserData", "line_range": [37, 60]},
    {"name": "validateSession", "line_range": [62, 80]},
    {"name": "renderProfile", "line_range": [82, 120]},
    {"name": "renderSettings", "line_range": [122, 180]}
  ]
}
```

**Expected Grouping:**
- **Authentication Handlers** (handleLogin, handleLogout, validateSession)
- **Data Management** (fetchUserData)
- **UI Rendering** (renderProfile, renderSettings)

#### **Example 2: Data Pipeline Container**
```json
{
  "type": "function_declaration",
  "name": "processDataPipeline",
  "children": [
    {"name": "extractFromSource", "line_range": [5, 30]},
    {"name": "validateSchema", "line_range": [32, 50]},
    {"name": "transformRecords", "line_range": [52, 100]},
    {"name": "enrichWithMetadata", "line_range": [102, 140]},
    {"name": "loadToDestination", "line_range": [142, 180]}
  ]
}
```

**Expected Grouping:**
- **Extraction Layer** (extractFromSource)
- **Validation Layer** (validateSchema)
- **Transformation Engine** (transformRecords, enrichWithMetadata)
- **Loading Layer** (loadToDestination)

#### **Example 3: Class with Methods Container**
```json
{
  "type": "class_declaration",
  "name": "OrderProcessor",
  "children": [
    {"type": "method_definition", "name": "validateOrder", "line_range": [10, 40]},
    {"type": "method_definition", "name": "calculateTax", "line_range": [42, 60]},
    {"type": "method_definition", "name": "calculateShipping", "line_range": [62, 80]},
    {"type": "method_definition", "name": "applyDiscounts", "line_range": [82, 120]},
    {"type": "method_definition", "name": "chargePayment", "line_range": [122, 180]},
    {"type": "method_definition", "name": "sendConfirmation", "line_range": [182, 200]}
  ]
}
```

**Expected Grouping:**
- **Order Validation** (validateOrder)
- **Price Calculation** (calculateTax, calculateShipping, applyDiscounts)
- **Payment Processing** (chargePayment)
- **Notification System** (sendConfirmation)

---

### **Key Takeaway**

The pattern is **always the same** regardless of domain:
1. Scan nested function names for patterns (prefixes, domains, stages)
2. Group by logical purpose (not alphabetically or by line order)
3. Separate orchestration from subsystems
4. Use domain-specific labels (not generic "Helpers")

---

1. **System Role & Domain**: Analyze `import_details` to identify the tech stack...
[... rest of existing Phase 1 content ...]
"""
```

---

## Implementation Instructions for Copilot

**File:** `backend/src/iris_agent/prompts.py`

**Task:** Insert the "Container File Detection" section after the Phase 1 header

**Before:**
```python
## PHASE 1: STRUCTURAL HYPOTHESIS (Mental Mapping)

**CRITICAL: DO NOT call any tools in this phase.**
Scan the provided Shallow AST metadata...

1. **System Role & Domain**: Analyze `import_details`...
```

**After:**
```python
## PHASE 1: STRUCTURAL HYPOTHESIS (Mental Mapping)

**CRITICAL: DO NOT call any tools in this phase.**
Scan the provided Shallow AST metadata...

### **IMPORTANT: Container File Detection**
[INSERT THE FULL SECTION FROM ABOVE]

1. **System Role & Domain**: Analyze `import_details`...
```

---

## Expected Result

After this change, when analyzing container files:

**Pattern Recognition:**
- Agent detects nested function patterns (prefix clustering, domain clustering, stage clustering)
- Groups related functions into logical ecosystems
- Separates orchestration from subsystems
- Uses domain-specific labels

**Example: Wheelchair File**

**Current Output (WRONG):**
- 1 responsibility block: "Geometry Creation Engine" [1-919]
  - All 11 functions grouped together

**Expected Output (CORRECT):**
- 4-5 responsibility blocks based on function name patterns:
  - **Seat Construction** (create*Seat*, create*Seatrest*)
  - **Backrest Assembly** (create*Backrest*)
  - **Wheel Integration** (create*Wheel*, create*WheelHandle*)
  - **Legrest Construction** (create*Legrest*)
  - **Final Assembly** (createManualWheelchair main logic)

**Example: React Component File**

**Current Output (WRONG):**
- 1 block: "Component Functions" with all handlers

**Expected Output (CORRECT):**
- 3-4 blocks based on function patterns:
  - **Authentication** (handle*Login*, handle*Logout*, validate*Session*)
  - **Data Layer** (fetch*UserData*)
  - **UI Rendering** (render*Profile*, render*Settings*)

**Example: Class File**

**Current Output (WRONG):**
- 1 block: "Class Methods" with all methods

**Expected Output (CORRECT):**
- 3-4 blocks based on method patterns:
  - **Validation** (validate*Order*)
  - **Pricing** (calculate*Tax*, calculate*Shipping*, apply*Discounts*)
  - **Payment** (charge*Payment*)
  - **Notifications** (send*Confirmation*)

---

## Why This Works

1. **Explicit Detection**: Tells agent what a container file looks like
2. **Concrete Example**: Shows the AST structure they'll see
3. **Step-by-Step Process**: How to analyze (don't treat as atomic, group children, separate orchestration)
4. **Negative Examples**: Shows what NOT to do
5. **Concrete Output Example**: Shows the exact structure expected

The agent now has both:
- ✅ **The data** (nested functions visible in AST - Phase 1)
- ✅ **The interpretation guide** (how to group nested functions - Phase 2)

---