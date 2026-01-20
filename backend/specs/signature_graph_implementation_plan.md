---
goal: Implement Signature Graph Algorithm to Replace Shallow AST for IRIS Code Analysis
version: 1.0
date_created: 2026-01-20
last_updated: 2026-01-20
owner: IRIS Development Team
status: 'Planned'
tags: ['feature', 'architecture', 'refactor', 'performance']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This implementation plan defines the step-by-step process to build the **Signature Graph Algorithm**, a new data structure and extraction system that will replace the current Shallow AST pipeline in IRIS. The Signature Graph solves the critical **nested structure problem** where IRIS fails to analyze files with deeply nested functions (e.g., factory patterns, React components with nested hooks, class methods with helpers) by extracting ALL entities regardless of nesting depth while maintaining hierarchy context.

**Key Benefits:**
- Extract ALL entities regardless of nesting depth (no `max_depth` limit)
- Single-pass extraction (2-3x faster than current multi-pass approach)
- Flat structure with explicit hierarchy metadata (`parent_id`, `children_ids`, `depth`)
- Built-in call graph for understanding relationships
- Immediate comment attachment (leading, inline, trailing, docstring)
- 30x reduction in LLM tokens (no forced `refer_to_source_code()` calls)

## 1. Requirements & Constraints

### Functional Requirements

- **REQ-001**: Extract ALL declaration entities from source code regardless of nesting depth (functions, classes, methods, variables, imports/exports)
- **REQ-002**: Generate unique sequential IDs for each entity in format `entity_N` (e.g., `entity_0`, `entity_1`)
- **REQ-003**: Extract function/method signatures including parameters and return types (where available)
- **REQ-004**: Track hierarchy metadata: `depth`, `parent_id`, `children_ids`, `scope`
- **REQ-005**: Build call graph by scanning function bodies for call expressions
- **REQ-006**: Capture four comment types per entity: `leading_comment`, `inline_comment`, `trailing_comment`, `docstring`
- **REQ-007**: Support JavaScript, TypeScript, and Python as initial target languages
- **REQ-008**: Produce flat array output structure (not nested JSON tree)
- **REQ-009**: Preserve line range information for each entity (`line_range: [start, end]`)

### Performance Requirements

- **PER-001**: Single-pass AST traversal (eliminate separate comment scan pass)
- **PER-002**: Prune 90-95% of AST nodes by visiting only declaration-relevant subtrees
- **PER-003**: Total time complexity: O(n + d) where n = source chars, d = declaration nodes
- **PER-004**: Peak memory: ~10-20 MB per 1000 lines of code (same as current Shallow AST)

### Constraints

- **CON-001**: Must use existing Tree-sitter infrastructure (`parser.ast_parser.ASTParser`)
- **CON-002**: Must integrate with existing `CommentExtractor` or provide equivalent functionality
- **CON-003**: Must produce JSON-serializable output compatible with IRIS agent pipeline
- **CON-004**: Must not break existing API contracts in `routes.py` (gradual migration)
- **CON-005**: Python 3.10+ compatibility required

### Guidelines

- **GUD-001**: Follow existing code style in `backend/src/iris_agent/` (PEP 8)
- **GUD-002**: Use type hints for all public methods and function signatures
- **GUD-003**: Include docstrings with Args/Returns for all public methods
- **GUD-004**: Handle edge cases gracefully (anonymous functions, destructuring, etc.)

### Patterns to Follow

- **PAT-001**: Use Tree-sitter node navigation via `child_by_field_name()` and `children` properties
- **PAT-002**: Follow existing pattern from `ast_processor.py` for line range extraction
- **PAT-003**: Use stack-based traversal state (similar to existing comment extractor pattern)

## 2. Implementation Steps

### Implementation Phase 1: Core Data Structures and Configuration

- GOAL-001: Define the SignatureGraph output schema and language-specific declaration type mappings

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create new file `backend/src/iris_agent/signature_graph/__init__.py` with module exports | | |
| TASK-002 | Create `backend/src/iris_agent/signature_graph/types.py` with TypedDict definitions for `SignatureEntity` and `SignatureGraph` output schema | | |
| TASK-003 | Create `backend/src/iris_agent/signature_graph/config.py` with `DECLARATION_TYPES` mapping for JavaScript, TypeScript, and Python | | |
| TASK-004 | Create `backend/src/iris_agent/signature_graph/config.py` with `CONTAINER_NODE_TYPES` that may contain nested declarations | | |
| TASK-005 | Create `backend/src/iris_agent/signature_graph/config.py` with `FUNCTION_NODE_TYPES` for identifying callable entities | | |

**Phase 1 Completion Criteria:**
- All type definitions compile without errors
- Configuration maps include all Tree-sitter node types for JS/TS/Python
- Module can be imported: `from iris_agent.signature_graph import SignatureEntity, DECLARATION_TYPES`

---

### Implementation Phase 2: Signature Extractor Core

- GOAL-002: Implement the main `SignatureGraphExtractor` class with unified single-pass traversal

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create `backend/src/iris_agent/signature_graph/extractor.py` with `SignatureGraphExtractor` class skeleton | | |
| TASK-007 | Implement `__init__(self, language: str)` method that initializes `ASTParser`, sets `declaration_types` from config | | |
| TASK-008 | Implement `extract(self, source_code: str) -> Dict[str, List]` public method that parses code and calls `_unified_traversal` | | |
| TASK-009 | Implement `_unified_traversal(self, root_node, source_code)` method with traversal state initialization: `entities`, `entity_id_counter`, `parent_stack`, `depth_stack`, `pending_comments` | | |
| TASK-010 | Implement inner `make_entity_id()` function that generates `entity_N` format IDs | | |
| TASK-011 | Implement inner `find_entity_by_id(entity_id)` function for parent lookup | | |
| TASK-012 | Implement inner `visit(node)` recursive function with comment capture logic | | |
| TASK-013 | Implement inner `visit(node)` recursive function with declaration node detection and entity creation | | |
| TASK-014 | Implement parent-child relationship tracking: update `parent.children_ids` when creating nested entity | | |
| TASK-015 | Implement context stack push/pop: push `entity_id` and increment depth before recursing into declaration children, pop after | | |

**Phase 2 Completion Criteria:**
- `SignatureGraphExtractor` can be instantiated for JavaScript, TypeScript, Python
- Basic traversal visits all nodes without errors
- Entities array is populated with declaration nodes
- `entity_id`, `depth`, `parent_id`, `children_ids` are correctly populated

---

### Implementation Phase 3: Name and Signature Extraction

- GOAL-003: Implement helper methods to extract entity names and clean signatures

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Implement `_extract_name(self, node) -> str` method that extracts name from `name`, `identifier`, `id` field children | | |
| TASK-017 | Handle anonymous functions in `_extract_name`: return `"anonymous"` or infer from parent variable declarator | | |
| TASK-018 | Implement `_extract_signature(self, node, source_code) -> str` method for function nodes | | |
| TASK-019 | For JavaScript/TypeScript functions: extract `(param1, param2, ...) => ReturnType` or `functionName(params): ReturnType` format | | |
| TASK-020 | For Python functions: extract `def name(params) -> ReturnType` format, include type annotations if present | | |
| TASK-021 | For class declarations: extract `class ClassName extends BaseClass` or `class ClassName(BaseClass)` format | | |
| TASK-022 | For variable declarations: extract `variableName: Type = value` format (simplified value for primitives) | | |
| TASK-023 | Implement `_map_node_type(self, tree_sitter_type) -> str` to map Tree-sitter types to semantic types: `function`, `method`, `class`, `variable`, `import`, `export` | | |

**Phase 3 Completion Criteria:**
- Names extracted correctly for all declaration types
- Signatures are clean (no implementation body content)
- Type annotations included in signatures where available
- Anonymous functions handled gracefully

---

### Implementation Phase 4: Comment Capture System

- GOAL-004: Implement comment detection and attachment during traversal

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-024 | Implement comment node detection in `visit(node)`: check `node.type == 'comment'` | | |
| TASK-025 | Implement `_extract_text(self, node, source_code) -> str` to extract raw text from node byte range | | |
| TASK-026 | Implement inline comment detection: if comment is on same line as last entity's end line, set `last_entity['inline_comment']` | | |
| TASK-027 | Implement trailing comment detection: if comment is 0-1 lines after last entity's end line, set `last_entity['trailing_comment']` | | |
| TASK-028 | Implement leading comment accumulation: if comment is before any declaration, append to `pending_comments['leading']` | | |
| TASK-029 | Implement leading comment attachment: when creating new entity, join `pending_comments['leading']` with newlines and clear | | |
| TASK-030 | Implement `_extract_docstring(self, node, source_code) -> Optional[str]` for Python functions (first child string literal in body) | | |
| TASK-031 | Implement JSDoc detection: check for block comment starting with `/**` immediately before declaration | | |
| TASK-032 | Handle comment deduplication: if leading comment equals trailing comment from previous entity, prefer leading | | |

**Phase 4 Completion Criteria:**
- Leading comments attached to correct entities
- Inline comments detected on same line
- Trailing comments detected within 1 line gap
- Docstrings extracted for Python functions
- JSDoc comments extracted for JavaScript/TypeScript

---

### Implementation Phase 5: Call Graph Builder

- GOAL-005: Extract call relationships by scanning function bodies for call expressions

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-033 | Implement `_is_function_node(self, node) -> bool` to check if node is a function/method declaration | | |
| TASK-034 | Implement `_get_function_body(self, node) -> Optional[Node]` to get body child from function node | | |
| TASK-035 | Implement `_extract_calls(self, body_node, entities, source_code) -> List[str]` method | | |
| TASK-036 | In `_extract_calls`: recursively traverse body node looking for `call_expression` nodes | | |
| TASK-037 | Extract call target name from `call_expression.function` field (identifier or member expression) | | |
| TASK-038 | For member expressions (e.g., `obj.method()`), extract full path: `"obj.method"` | | |
| TASK-039 | Match call names against existing entity names in `entities` array to resolve internal references to `entity_N` format | | |
| TASK-040 | For unmatched calls, keep as external reference string (e.g., `"CSG.cube"`, `"console.log"`) | | |
| TASK-041 | Handle recursive calls: entity may reference itself in `calls` array | | |
| TASK-042 | Skip dynamic calls (computed property access like `obj[funcName]()`) - not statically analyzable | | |

**Phase 5 Completion Criteria:**
- `calls` array populated for all function entities
- Internal calls resolved to entity IDs
- External calls preserved as readable strings
- Recursive self-calls detected correctly
- Member expression calls properly extracted

---

### Implementation Phase 6: Scope and Hierarchy Inference

- GOAL-006: Implement scope type inference and verify hierarchy correctness

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-043 | Implement `_infer_scope(self, node, parent_id) -> str` method | | |
| TASK-044 | Return `"module"` if `parent_id is None` (top-level declaration) | | |
| TASK-045 | Return `"function"` if parent node type is function/arrow_function/method | | |
| TASK-046 | Return `"class"` if parent node type is class declaration | | |
| TASK-047 | Return `"block"` for other nested contexts (if/while/for blocks) | | |
| TASK-048 | Implement line range extraction using existing `extract_line_range(node)` from `ast_utils.py` or equivalent | | |
| TASK-049 | Verify `depth` increments correctly: module-level = 0, first nesting = 1, etc. | | |
| TASK-050 | Verify `children_ids` populated in correct order (declaration order in source) | | |

**Phase 6 Completion Criteria:**
- Scope types correctly identified for all entities
- Depth values consistent with actual nesting level
- Parent-child relationships bidirectionally consistent

---

### Implementation Phase 7: Pruning Optimization

- GOAL-007: Implement AST pruning to skip non-declaration subtrees for performance

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-051 | Implement `_might_contain_declarations(self, node) -> bool` method | | |
| TASK-052 | Return `True` for container types: `program`, `module`, `function_body`, `class_body`, `block`, `statement_block` | | |
| TASK-053 | Return `True` for any node type in `DECLARATION_TYPES` | | |
| TASK-054 | Return `False` for expression nodes, literals, operators, punctuation | | |
| TASK-055 | Add node type exclusion list: `['string', 'number', 'identifier', 'binary_expression', 'unary_expression', 'template_string', 'array', 'object']` | | |
| TASK-056 | Integrate pruning check in `visit(node)`: only recurse into children if `_might_contain_declarations(node)` returns True | | |
| TASK-057 | Add metrics tracking: count total nodes visited vs pruned for performance validation | | |

**Phase 7 Completion Criteria:**
- Pruning reduces visited nodes by 90-95% for typical files
- All declarations still extracted correctly
- Performance improvement measurable on large files

---

### Implementation Phase 8: Edge Case Handling

- GOAL-008: Handle special cases and language-specific edge cases

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-058 | Handle anonymous functions: use parent variable name if available, else `"anonymous_N"` | | |
| TASK-059 | Handle multiple declarations in one statement (`const a=1, b=2, c=3`): create separate entities for each | | |
| TASK-060 | Handle destructuring declarations (`const {x, y} = obj`): create single entity with destructuring pattern as name | | |
| TASK-061 | Handle arrow functions in variable declarations: use variable name as entity name, signature includes arrow syntax | | |
| TASK-062 | Handle class expressions (`const Foo = class {...}`): use variable name as class name | | |
| TASK-063 | Handle import statements: create entity with type `"import"`, name as import clause, signature as full statement | | |
| TASK-064 | Handle export statements: create entity with type `"export"`, name as export clause | | |
| TASK-065 | Handle TypeScript type annotations: include in signatures, create entities for type aliases and interfaces | | |
| TASK-066 | Handle Python decorators: include decorator in signature or as part of leading comment | | |
| TASK-067 | Handle IIFE patterns: detect immediately invoked function expressions, extract internal declarations | | |

**Phase 8 Completion Criteria:**
- All edge cases from specification document handled
- No crashes on malformed or unusual code patterns
- Graceful degradation for unsupported patterns

---

### Implementation Phase 9: Integration with IRIS Pipeline

- GOAL-009: Integrate SignatureGraphExtractor into IRIS analysis pipeline

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-068 | Update `backend/src/iris_agent/__init__.py` to export `SignatureGraphExtractor` | | |
| TASK-069 | Create `backend/src/iris_agent/routes.py` flag: `_use_signature_graph = os.environ.get("USE_SIGNATURE_GRAPH", "false").lower() == "true"` | | |
| TASK-070 | Add `/debug` endpoint toggle for `_use_signature_graph` flag | | |
| TASK-071 | Modify `/api/iris/analyze` route to use `SignatureGraphExtractor` when flag is enabled | | |
| TASK-072 | Update `IrisAgent.analyze()` to accept `signature_graph` parameter as alternative to `shallow_ast` | | |
| TASK-073 | Create prompt template in `prompts.py` for signature graph input format | | |
| TASK-074 | Update debugger to capture and display signature graph in debug reports | | |
| TASK-075 | Add signature graph JSON export to debug report generation | | |
| TASK-076 | Add `/api/iris/analyze` response field indicating whether signature graph or shallow AST was used | | |

**Phase 9 Completion Criteria:**
- Signature graph can be enabled via environment variable
- Debug endpoint allows runtime toggle
- Analysis results include execution path metadata
- Debugger captures signature graph output

---

### Implementation Phase 10: Performance Validation and Optimization

- GOAL-010: Validate performance gains and optimize hot paths

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-077 | Add timing instrumentation to `SignatureGraphExtractor.extract()`: parse time, traversal time, total time | | |
| TASK-078 | Add node count metrics: total AST nodes, visited nodes, declaration nodes found, entities created | | |
| TASK-079 | Create benchmark script comparing Shallow AST vs Signature Graph on same files | | |
| TASK-080 | Profile memory usage using `tracemalloc` for large files (1000+ lines) | | |
| TASK-081 | Optimize hot paths identified by profiling (likely: string operations, node navigation) | | |
| TASK-082 | Validate pruning effectiveness: track pruned vs visited node ratio | | |
| TASK-083 | Document performance characteristics in code comments and spec | | |

**Phase 10 Completion Criteria:**
- 2-3x faster traversal than Shallow AST on large files
- Peak memory within acceptable bounds (~10-20 MB per 1000 lines)
- Performance metrics logged and accessible in debug mode

## 3. Alternatives

- **ALT-001**: Modify existing Shallow AST to increase `max_depth` - Rejected because it would exponentially increase output size and still requires arbitrary depth cutoff
- **ALT-002**: Use existing Tree-sitter queries for pattern matching - Rejected because queries are language-specific and harder to maintain; procedural traversal is more flexible
- **ALT-003**: Keep nested JSON structure instead of flat array - Rejected because flat structure is easier for LLM to parse and reduces JSON depth complexity
- **ALT-004**: Build call graph as separate pass - Rejected because single-pass approach is more efficient and avoids double traversal

## 4. Dependencies

- **DEP-001**: `tree-sitter` (existing) - Core parsing library
- **DEP-002**: `tree_sitter_javascript` (existing) - JavaScript grammar
- **DEP-003**: `tree_sitter_python` (existing) - Python grammar  
- **DEP-004**: `tree_sitter_typescript` (existing) - TypeScript grammar
- **DEP-005**: `parser.ast_parser.ASTParser` (existing) - Unified parser wrapper
- **DEP-006**: `iris_agent.ast_utils` (existing) - Line range extraction utilities

## 5. Files

### New Files

- **FILE-001**: `backend/src/iris_agent/signature_graph/__init__.py` - Module initialization and exports
- **FILE-002**: `backend/src/iris_agent/signature_graph/types.py` - TypedDict definitions for SignatureEntity and SignatureGraph
- **FILE-003**: `backend/src/iris_agent/signature_graph/config.py` - Declaration type mappings and configuration constants
- **FILE-004**: `backend/src/iris_agent/signature_graph/extractor.py` - Main SignatureGraphExtractor class implementation

### Modified Files

- **FILE-005**: `backend/src/iris_agent/__init__.py` - Add SignatureGraphExtractor export
- **FILE-006**: `backend/src/iris_agent/routes.py` - Add environment flag and integration logic
- **FILE-007**: `backend/src/iris_agent/agent.py` - Add signature_graph parameter support
- **FILE-008**: `backend/src/iris_agent/prompts.py` - Add signature graph prompt template
- **FILE-009**: `backend/src/iris_agent/debugger.py` - Add signature graph capture and display

## 6. Testing

*Testing phase will be defined in a separate implementation plan as per user request.*

## 7. Risks & Assumptions

### Risks

- **RISK-001**: Tree-sitter node type names may differ between grammar versions - Mitigation: Test against current grammar versions, add fallback handling
- **RISK-002**: Performance regression on very large files (10,000+ lines) - Mitigation: Implement progressive pruning, add file size limits if needed
- **RISK-003**: Call graph extraction may miss some call patterns (dynamic calls, eval) - Mitigation: Document limitations, focus on static analysis only
- **RISK-004**: Integration may require prompt template changes that affect LLM output quality - Mitigation: A/B test with existing Shallow AST approach

### Assumptions

- **ASSUMPTION-001**: Tree-sitter grammars for JS/TS/Python are stable and won't have breaking changes
- **ASSUMPTION-002**: Single-pass traversal will be faster than current multi-pass approach
- **ASSUMPTION-003**: Flat array structure is preferable for LLM consumption
- **ASSUMPTION-004**: Call graph resolution only needs to handle static, syntactic calls
- **ASSUMPTION-005**: Existing `CommentExtractor` logic can be adapted/reused for signature graph

## 8. Related Specifications / Further Reading

- [Signature Graph Algorithm Specification](../backend/specs/signature_graph_algorithm.md) - Detailed algorithm design
- [Signature Graph Architecture](../backend/specs/signature_graph.md) - High-level architecture and motivation
- [AST Fix Specification](../backend/specs/ast_fix_spec.md) - Related Shallow AST improvements
- [Single Stage Tool Calling Spec](../backend/specs/single_stage_tool_calling_spec.md) - IRIS agent architecture
- [Tree-sitter Documentation](https://tree-sitter.github.io/tree-sitter/) - Parser library reference