"""Signature graph extractor for declaration-focused analysis."""

from __future__ import annotations

import re
import time
import tracemalloc
from typing import Dict, List, Optional

from tree_sitter import Node

from parser.ast_parser import ASTParser
from ..ast_utils import extract_line_range
from .config import CONTAINER_NODE_TYPES, DECLARATION_TYPES, FUNCTION_NODE_TYPES
from .types import SignatureEntity, SignatureGraph


class SignatureGraphExtractor:
    """Extract a signature graph from source code using Tree-sitter.

    This is a single-pass traversal that records declaration nodes and their
    hierarchy. Signature and comment extraction are intentionally minimal
    here and will be refined in later phases.
    """

    def __init__(self, language: str, parser: Optional[ASTParser] = None) -> None:
        """Initialize the extractor for a specific language.

        Args:
            language: Language identifier ("javascript", "typescript", "python").
            parser: Optional ASTParser instance.

        Raises:
            ValueError: If the language is not supported.
        """
        self.language = language.lower()
        if self.language not in DECLARATION_TYPES:
            raise ValueError(f"Unsupported language: {language}")

        self.parser = parser or ASTParser()
        self.declaration_types = set(DECLARATION_TYPES[self.language])
        self.last_traversal_metrics: Dict[str, int] = {}
        self.last_timing_metrics: Dict[str, float] = {}
        self.last_memory_metrics: Dict[str, int] = {}

    def extract(
        self,
        source_code: str,
        track_metrics: bool = True,
        track_memory: bool = False,
    ) -> SignatureGraph:
        """Parse source code and build a signature graph.

        Args:
            source_code: Raw source code string.
            track_metrics: When True, record timing and node metrics.
            track_memory: When True, record peak memory using tracemalloc.

        Returns:
            SignatureGraph containing a flat list of entities.

        Raises:
            ValueError: If source_code is empty.
        """
        if not source_code:
            raise ValueError("Source code cannot be empty")

        timing_start = time.perf_counter()
        if track_memory:
            tracemalloc.start()

        try:
            parse_start = time.perf_counter()
            tree = self.parser.parse(source_code, self.language)
            parse_end = time.perf_counter()

            total_nodes = 0
            if track_metrics:
                total_nodes = self._count_total_nodes(tree.root_node)

            traversal_start = time.perf_counter()
            entities = self._unified_traversal(tree.root_node, source_code)
            traversal_end = time.perf_counter()
        finally:
            timing_end = time.perf_counter()
            if track_memory:
                current_bytes, peak_bytes = tracemalloc.get_traced_memory()
                tracemalloc.stop()
                self.last_memory_metrics = {
                    "current_bytes": current_bytes,
                    "peak_bytes": peak_bytes,
                }
            else:
                self.last_memory_metrics = {}

        if track_metrics:
            self.last_traversal_metrics["total_nodes"] = total_nodes
            self.last_timing_metrics = {
                "parse_seconds": parse_end - parse_start,
                "traversal_seconds": traversal_end - traversal_start,
                "total_seconds": timing_end - timing_start,
            }
        else:
            self.last_timing_metrics = {}

        return {"entities": entities}

    def convert_to_dict(self, graph: SignatureGraph) -> Dict[str, object]:
        """Convert SignatureGraph to a serializable dictionary.

        Args:
            graph: SignatureGraph instance.

        Returns:
            Dictionary representation of the signature graph.
        """
        return {"entities": [dict(entity) for entity in graph["entities"]]}

    def _count_total_nodes(self, root_node: Node) -> int:
        """Count named nodes in the AST for metrics.

        Args:
            root_node: Tree-sitter root node.

        Returns:
            Count of named nodes in the AST.
        """
        count = 0
        stack: List[Node] = [root_node]

        while stack:
            node = stack.pop()
            if not node.is_named:
                continue
            count += 1
            for child in node.children:
                if child.is_named:
                    stack.append(child)

        return count

    def _unified_traversal(
        self, root_node: Node, source_code: str
    ) -> List[SignatureEntity]:
        """Traverse the AST and extract declaration entities.

        Args:
            root_node: Tree-sitter root node.
            source_code: Raw source code string.

        Returns:
            List of extracted SignatureEntity records.
        """
        source_bytes = source_code.encode("utf-8")
        entities: List[SignatureEntity] = []
        entity_lookup: Dict[str, SignatureEntity] = {}
        function_nodes: Dict[str, Node] = {}
        parent_stack: List[str] = []
        depth_stack: List[int] = [0]
        pending_comments: Dict[str, List[Dict[str, object]]] = {"leading": []}
        last_entity: Optional[SignatureEntity] = None
        entity_id_counter = 0
        anonymous_counter = 0
        metrics: Dict[str, int] = {
            "nodes_seen": 0,
            "pruned_nodes": 0,
            "declaration_nodes": 0,
        }

        def make_entity_id() -> str:
            nonlocal entity_id_counter
            entity_id = f"entity_{entity_id_counter}"
            entity_id_counter += 1
            return entity_id

        def make_anonymous_name() -> str:
            nonlocal anonymous_counter
            name = f"anonymous_{anonymous_counter}"
            anonymous_counter += 1
            return name

        def find_entity_by_id(entity_id: str) -> Optional[SignatureEntity]:
            return entity_lookup.get(entity_id)

        def extract_text(node: Node) -> str:
            return source_bytes[node.start_byte : node.end_byte].decode(
                "utf-8", errors="replace"
            )

        def create_entity(node: Node) -> SignatureEntity:
            entity_id = make_entity_id()
            parent_id = parent_stack[-1] if parent_stack else None
            depth = depth_stack[-1] if depth_stack else 0
            start_line = node.start_point[0] + 1
            scope = self._infer_scope(node, parent_id, entity_lookup)

            name = self._extract_name(node, source_code)
            if name == "anonymous":
                name = make_anonymous_name()

            entity: SignatureEntity = {
                "id": entity_id,
                "name": name,
                "type": self._map_node_type(node),
                "signature": self._extract_signature(node, source_code, name),
                "line_range": extract_line_range(node),
                "depth": depth,
                "scope": scope,
                "parent_id": parent_id,
                "children_ids": [],
                "calls": [],
                "leading_comment": None,
                "inline_comment": None,
                "trailing_comment": None,
                "docstring": None,
            }

            if pending_comments["leading"]:
                leading_texts: List[str] = []
                for item in pending_comments["leading"]:
                    text = item.get("text")
                    if isinstance(text, str):
                        leading_texts.append(text)
                if leading_texts:
                    if last_entity and last_entity.get("trailing_comment") == "\n".join(
                        leading_texts
                    ):
                        last_entity["trailing_comment"] = None

                    last_entry = pending_comments["leading"][-1]
                    last_text = last_entry.get("text")
                    last_line = last_entry.get("end_line")
                    if (
                        isinstance(last_text, str)
                        and last_text.lstrip().startswith("/**")
                        and isinstance(last_line, int)
                        and start_line - last_line <= 1
                    ):
                        entity["leading_comment"] = last_text
                    else:
                        entity["leading_comment"] = "\n".join(leading_texts)

                pending_comments["leading"].clear()

            if self.language == "python" and entity["type"] in {"function", "method"}:
                entity["docstring"] = self._extract_docstring(node, source_code)

            entities.append(entity)
            entity_lookup[entity_id] = entity

            if self._is_function_node(node):
                function_nodes[entity_id] = node

            if parent_id:
                parent = find_entity_by_id(parent_id)
                if parent is not None:
                    parent["children_ids"].append(entity_id)

            return entity

        def visit(node: Node) -> None:
            nonlocal last_entity
            metrics["nodes_seen"] += 1
            if node.type == "comment":
                comment_text = extract_text(node).strip()
                if comment_text:
                    comment_line = node.start_point[0] + 1
                    if last_entity:
                        last_end = last_entity["line_range"][1]
                        if comment_line == last_end:
                            last_entity["inline_comment"] = comment_text
                            return
                        if comment_line <= last_end + 1:
                            last_entity["trailing_comment"] = comment_text
                            return

                    pending_comments["leading"].append(
                        {"text": comment_text, "end_line": node.end_point[0] + 1}
                    )
                return

            is_declaration = node.type in self.declaration_types
            if is_declaration:
                metrics["declaration_nodes"] += 1
                entity = create_entity(node)
                last_entity = entity
                parent_stack.append(entity["id"])
                depth_stack.append(depth_stack[-1] + 1)

            should_recurse = self._might_contain_declarations(node)
            if not should_recurse:
                metrics["pruned_nodes"] += sum(
                    1 for child in node.children if child.is_named
                )
                if is_declaration:
                    parent_stack.pop()
                    depth_stack.pop()
                return

            for child in node.children:
                if not child.is_named:
                    continue
                visit(child)

            if is_declaration:
                parent_stack.pop()
                depth_stack.pop()

        visit(root_node)
        self.last_traversal_metrics = metrics
        self._populate_calls(entities, entity_lookup, function_nodes, source_code)
        return entities

    def _might_contain_declarations(self, node: Node) -> bool:
        """Check whether a node subtree can contain declarations.

        Args:
            node: Tree-sitter node to evaluate.

        Returns:
            True if the node is a container or declaration candidate.
        """
        if node.type in self.declaration_types:
            return True

        if node.type in CONTAINER_NODE_TYPES:
            return True

        if self._is_iife_call(node):
            return True

        excluded_types = {
            "string",
            "number",
            "identifier",
            "binary_expression",
            "unary_expression",
            "template_string",
            "array",
            "object",
            "integer",
            "float",
            "null",
            "undefined",
        }
        if node.type in excluded_types:
            return False

        return False

    def _populate_calls(
        self,
        entities: List[SignatureEntity],
        entity_lookup: Dict[str, SignatureEntity],
        function_nodes: Dict[str, Node],
        source_code: str,
    ) -> None:
        """Populate call relationships for function-like entities.

        Args:
            entities: Flat list of extracted signature entities.
            entity_lookup: Entity lookup keyed by entity id.
            function_nodes: Mapping of function entity id to AST node.
            source_code: Raw source code string.
        """
        name_lookup = self._build_name_lookup(entities)
        for entity_id, node in function_nodes.items():
            body_node = self._get_function_body(node)
            if body_node is None:
                continue

            calls = self._extract_calls(body_node, name_lookup, source_code)
            entity = entity_lookup.get(entity_id)
            if entity is not None:
                entity["calls"] = calls

    def _build_name_lookup(
        self, entities: List[SignatureEntity]
    ) -> Dict[str, List[str]]:
        """Build a name-to-entity-id lookup table.

        Args:
            entities: Flat list of extracted signature entities.

        Returns:
            Mapping from entity name to list of entity ids.
        """
        lookup: Dict[str, List[str]] = {}
        for entity in entities:
            name = entity.get("name")
            entity_id = entity.get("id")
            if not isinstance(name, str) or not name:
                continue
            if not isinstance(entity_id, str):
                continue
            lookup.setdefault(name, []).append(entity_id)
        return lookup

    def _is_function_node(self, node: Node) -> bool:
        """Check whether a node represents a callable declaration."""
        if node.type == "decorated_definition":
            for child in node.children:
                if not child.is_named:
                    continue
                if child.type in FUNCTION_NODE_TYPES:
                    return True
            return False

        if node.type in {"variable_declarator", "assignment", "augmented_assignment"}:
            initializer = node.child_by_field_name("value") or node.child_by_field_name(
                "right"
            )
            if initializer is None:
                return False
            return initializer.type in FUNCTION_NODE_TYPES

        return node.type in FUNCTION_NODE_TYPES

    def _get_function_body(self, node: Node) -> Optional[Node]:
        """Get the body node for a function-like declaration.

        Args:
            node: Tree-sitter node representing a function declaration.

        Returns:
            Body node when available; otherwise None.
        """
        if node.type == "decorated_definition":
            for child in node.children:
                if not child.is_named:
                    continue
                if child.type in FUNCTION_NODE_TYPES:
                    return child.child_by_field_name("body")
            return None

        if node.type in {"variable_declarator", "assignment", "augmented_assignment"}:
            initializer = node.child_by_field_name("value") or node.child_by_field_name(
                "right"
            )
            if initializer is None:
                return None
            return initializer.child_by_field_name("body")

        return node.child_by_field_name("body")

    def _extract_calls(
        self,
        body_node: Node,
        name_lookup: Dict[str, List[str]],
        source_code: str,
    ) -> List[str]:
        """Extract call targets from a function body.

        Args:
            body_node: AST node containing function body statements.
            name_lookup: Mapping of entity names to ids for resolution.
            source_code: Raw source code string.

        Returns:
            Ordered list of call targets or resolved entity ids.
        """
        calls: List[str] = []
        stack: List[Node] = [body_node]

        while stack:
            node = stack.pop()
            if node.type == "call_expression":
                target_node = node.child_by_field_name("function")
                target_name = self._extract_call_target(target_node, source_code)
                if target_name:
                    calls.append(self._resolve_call_target(target_name, name_lookup))

            for child in node.children:
                if not child.is_named:
                    continue
                if child.type in self.declaration_types:
                    continue
                stack.append(child)

        return calls

    def _extract_call_target(self, node: Optional[Node], source_code: str) -> str:
        """Extract a readable call target name from a call expression.

        Args:
            node: AST node representing the call target.
            source_code: Raw source code string.

        Returns:
            String name for the call target, or empty when dynamic.
        """
        if node is None:
            return ""

        if node.type in {
            "identifier",
            "property_identifier",
            "private_property_identifier",
            "field_identifier",
            "scoped_identifier",
        }:
            return self._node_text(node, source_code).strip()

        if node.type in {"this", "super"}:
            return node.type

        if node.type in {"member_expression", "attribute"}:
            if self._is_computed_member(node):
                return ""
            object_node = node.child_by_field_name("object")
            property_node = node.child_by_field_name(
                "property"
            ) or node.child_by_field_name("attribute")
            object_text = self._extract_call_target(object_node, source_code)
            property_text = self._extract_call_target(property_node, source_code)
            if object_text and property_text:
                return f"{object_text}.{property_text}"
            return ""

        if node.type == "call_expression":
            return self._extract_call_target(
                node.child_by_field_name("function"), source_code
            )

        if node.type == "subscript_expression":
            return ""

        return self._node_text(node, source_code).strip()

    def _is_computed_member(self, node: Node) -> bool:
        """Check whether a member expression uses computed access."""
        if node.type not in {"member_expression", "attribute"}:
            return False

        property_node = node.child_by_field_name(
            "property"
        ) or node.child_by_field_name("attribute")
        if property_node is None:
            return True

        return property_node.type not in {
            "property_identifier",
            "identifier",
            "field_identifier",
            "private_property_identifier",
        }

    def _resolve_call_target(
        self, target_name: str, name_lookup: Dict[str, List[str]]
    ) -> str:
        """Resolve call target to entity id if available.

        Args:
            target_name: Extracted call target name.
            name_lookup: Mapping of entity names to ids.

        Returns:
            Entity id when resolved; otherwise the target name.
        """
        matches = name_lookup.get(target_name)
        if matches:
            return matches[0]
        return target_name

    def _extract_docstring(self, node: Node, source_code: str) -> Optional[str]:
        """Extract a Python docstring from the first body statement.

        Args:
            node: Tree-sitter node representing a function or method.
            source_code: Raw source code string.

        Returns:
            Extracted docstring text if present; otherwise None.
        """
        if node.type == "decorated_definition":
            inner_node = self._get_decorated_definition_node(node)
            if inner_node is None:
                return None
            node = inner_node

        body = node.child_by_field_name("body")
        if not body:
            return None

        for child in body.children:
            if not child.is_named:
                continue
            if child.type != "expression_statement":
                return None
            string_node = next(
                (grand for grand in child.children if grand.is_named), None
            )
            if string_node and string_node.type == "string":
                return self._node_text(string_node, source_code).strip()
            return None

        return None

    def _infer_scope(
        self,
        node: Node,
        parent_id: Optional[str],
        entity_lookup: Dict[str, SignatureEntity],
    ) -> str:
        """Infer the scope of a declaration based on its parent entity.

        Args:
            node: Tree-sitter node representing the declaration.
            parent_id: Optional parent entity id.
            entity_lookup: Mapping of entity ids to entities.

        Returns:
            Scope label: "module", "function", "class", or "block".
        """
        if parent_id is None:
            return "module"

        parent_entity = entity_lookup.get(parent_id)
        if not parent_entity:
            return "block"

        parent_type = parent_entity.get("type")
        if parent_type in {"function", "method"}:
            return "function"
        if parent_type == "class":
            return "class"

        return "block"

    def _extract_name(self, node: Node, source_code: str) -> str:
        """Extract the declaration name.

        Falls back to parent variable declarator name for anonymous
        functions/classes when possible.
        """
        if node.type == "decorated_definition":
            inner_node = self._get_decorated_definition_node(node)
            if inner_node is not None:
                return self._extract_name(inner_node, source_code)

        if node.type in {"import_statement", "import_from_statement"}:
            return self._extract_import_name(node, source_code)

        if node.type in {"export_statement", "export_clause"}:
            return self._extract_export_name(node, source_code)

        name_node = (
            node.child_by_field_name("name")
            or node.child_by_field_name("identifier")
            or node.child_by_field_name("id")
        )
        if name_node:
            name_value = self._node_text(name_node, source_code).strip()
            if name_value:
                return name_value

        inferred = self._infer_name_from_parent(node, source_code)
        if inferred:
            return inferred

        return "anonymous"

    def _extract_signature(self, node: Node, source_code: str, name: str) -> str:
        """Extract a declaration signature.

        Keeps only the declaration surface, omitting implementation bodies.
        """
        if node.type == "decorated_definition":
            decorators = self._extract_decorators_text(node, source_code)
            inner_node = self._get_decorated_definition_node(node)
            if inner_node is None:
                return name
            signature = self._extract_signature(inner_node, source_code, name)
            if decorators:
                return f"{decorators}\n{signature}"
            return signature

        semantic_type = self._map_node_type(node)
        target_node = node
        if node.type in {"variable_declarator", "assignment", "augmented_assignment"}:
            initializer = node.child_by_field_name("value") or node.child_by_field_name(
                "right"
            )
            if initializer is not None and semantic_type in {"function", "class"}:
                target_node = initializer

        if semantic_type in {"function", "method"}:
            return self._format_function_signature(target_node, name, source_code)

        if semantic_type == "class":
            return self._format_class_signature(target_node, name, source_code)

        if semantic_type == "variable":
            return self._format_variable_signature(node, name, source_code)

        if semantic_type in {"import", "export"}:
            return self._node_text(node, source_code).strip()

        if semantic_type in {"interface", "type", "enum", "module"}:
            return self._format_typescript_signature(node, name, source_code)

        return name

    def _map_node_type(self, node: Node) -> str:
        """Map Tree-sitter node types to semantic declaration types."""
        node_type = node.type

        if node_type == "decorated_definition":
            for child in node.children:
                if not child.is_named:
                    continue
                if child.type in {"function_definition", "class_definition"}:
                    return self._map_node_type(child)
            return "function"

        if node_type in {
            "function_declaration",
            "function_expression",
            "arrow_function",
            "generator_function",
            "generator_function_declaration",
            "function_definition",
            "lambda",
        }:
            return "function"

        if node_type in {"interface_declaration"}:
            return "interface"

        if node_type in {"type_alias_declaration"}:
            return "type"

        if node_type in {"enum_declaration"}:
            return "enum"

        if node_type in {"module_declaration", "ambient_declaration"}:
            return "module"

        if node_type in {
            "method_definition",
            "method_declaration",
            "constructor_declaration",
        }:
            return "method"

        if node_type in {"class_declaration", "class_definition"}:
            return "class"

        if node_type in {
            "variable_declarator",
            "assignment",
            "augmented_assignment",
        }:
            initializer = node.child_by_field_name("value") or node.child_by_field_name(
                "right"
            )
            if initializer is not None:
                initializer_type = initializer.type
                if initializer_type in {"arrow_function", "function_expression"}:
                    return "function"
                if initializer_type in {
                    "class_declaration",
                    "class_expression",
                    "class",
                }:
                    return "class"
            return "variable"

        if node_type in {"import_statement", "import_from_statement"}:
            return "import"

        if node_type in {"export_statement", "export_clause"}:
            return "export"

        return node_type

    def _infer_name_from_parent(self, node: Node, source_code: str) -> str:
        """Infer a declaration name from the parent node when possible."""
        parent = node.parent
        if not parent:
            return ""

        if parent.type == "variable_declarator":
            name_node = parent.child_by_field_name("name")
            if name_node:
                return self._node_text(name_node, source_code).strip()

        if parent.type in {"assignment", "augmented_assignment"}:
            left = parent.child_by_field_name("left")
            if left:
                return self._node_text(left, source_code).strip()

        return ""

    def _get_decorated_definition_node(self, node: Node) -> Optional[Node]:
        """Get the inner function or class definition of a decorator wrapper.

        Args:
            node: Decorated definition wrapper node.

        Returns:
            Inner function/class node if present; otherwise None.
        """
        for child in node.children:
            if not child.is_named:
                continue
            if child.type in {"function_definition", "class_definition"}:
                return child
        return None

    def _extract_decorators_text(self, node: Node, source_code: str) -> str:
        """Extract decorator lines for Python decorated definitions.

        Args:
            node: Decorated definition wrapper node.
            source_code: Raw source code string.

        Returns:
            Newline-joined decorator text, if present.
        """
        decorators: List[str] = []
        for child in node.children:
            if not child.is_named:
                continue
            if child.type == "decorator":
                decorators.append(self._node_text(child, source_code).strip())
        return "\n".join([item for item in decorators if item])

    def _extract_import_name(self, node: Node, source_code: str) -> str:
        """Extract a readable import clause from an import statement.

        Args:
            node: Import statement node.
            source_code: Raw source code string.

        Returns:
            Import clause text for display.
        """
        text = self._node_text(node, source_code).strip()
        if self.language == "python":
            if text.startswith("import "):
                return text[len("import ") :].strip()
            return text

        if text.startswith("import "):
            body = text[len("import ") :].strip()
            body = re.sub(r"\s+from\s+.*$", "", body).strip()
            return body.rstrip(";") or text

        return text

    def _extract_export_name(self, node: Node, source_code: str) -> str:
        """Extract a readable export clause from an export statement.

        Args:
            node: Export statement node.
            source_code: Raw source code string.

        Returns:
            Export clause text for display.
        """
        text = self._node_text(node, source_code).strip()
        if text.startswith("export "):
            body = text[len("export ") :].strip()
            body = re.sub(r"\s+from\s+.*$", "", body).strip()
            return body.rstrip(";") or text

        return text

    def _format_typescript_signature(
        self, node: Node, name: str, source_code: str
    ) -> str:
        """Format TypeScript declaration signatures.

        Args:
            node: TypeScript declaration node.
            name: Extracted declaration name.
            source_code: Raw source code string.

        Returns:
            Formatted signature text.
        """
        if node.type == "interface_declaration":
            return f"interface {name}" if name else "interface"

        if node.type == "type_alias_declaration":
            type_node = node.child_by_field_name("type") or node.child_by_field_name(
                "value"
            )
            type_text = (
                self._node_text(type_node, source_code).strip() if type_node else ""
            )
            if type_text:
                if name:
                    return f"type {name} = {type_text}"
                return f"type = {type_text}"
            return f"type {name}" if name else "type"

        if node.type == "enum_declaration":
            return f"enum {name}" if name else "enum"

        if node.type in {"module_declaration", "ambient_declaration"}:
            return f"module {name}" if name else "module"

        return name

    def _is_iife_call(self, node: Node) -> bool:
        """Check whether a node is an IIFE-style call expression.

        Args:
            node: Tree-sitter node to inspect.

        Returns:
            True when the call expression wraps a function expression.
        """
        if node.type != "call_expression":
            return False

        target = node.child_by_field_name("function")
        if target is None:
            return False

        if target.type in {
            "function_expression",
            "arrow_function",
            "generator_function",
            "lambda",
        }:
            return True

        if target.type == "parenthesized_expression":
            for child in target.children:
                if not child.is_named:
                    continue
                if child.type in {
                    "function_expression",
                    "arrow_function",
                    "generator_function",
                }:
                    return True

        return False

    def _format_function_signature(
        self, node: Node, name: str, source_code: str
    ) -> str:
        """Format a function or method signature."""
        params_text = self._extract_parameters_text(node, source_code)
        return_type = self._extract_return_type_text(node, source_code)
        return_suffix = f": {return_type}" if return_type else ""

        if node.type == "arrow_function":
            display_name = name or ""
            return f"{display_name}{params_text} =>{return_suffix}"

        if self.language == "python":
            arrow = f" -> {return_type}" if return_type else ""
            return f"def {name}{params_text}{arrow}"

        return f"{name}{params_text}{return_suffix}"

    def _format_class_signature(self, node: Node, name: str, source_code: str) -> str:
        """Format a class signature with inheritance where available."""
        if self.language == "python":
            base = self._extract_python_base_classes(node, source_code)
            return f"class {name}{base}"

        superclass = node.child_by_field_name("superclass")
        if superclass:
            base_text = self._node_text(superclass, source_code).strip()
            if base_text:
                return f"class {name} extends {base_text}"

        return f"class {name}"

    def _format_variable_signature(
        self, node: Node, name: str, source_code: str
    ) -> str:
        """Format a variable declaration signature."""
        type_text = self._extract_variable_type(node, source_code)
        value_text = self._extract_simple_value(node, source_code)

        signature = name
        if type_text:
            signature = f"{signature}: {type_text}"
        if value_text:
            signature = f"{signature} = {value_text}"

        return signature

    def _extract_parameters_text(self, node: Node, source_code: str) -> str:
        """Extract parameter list text for function nodes."""
        params_node = node.child_by_field_name(
            "parameters"
        ) or node.child_by_field_name("parameter")
        if not params_node:
            return "()"

        params_text = self._node_text(params_node, source_code).strip()
        if params_text.startswith("("):
            return params_text

        return f"({params_text})"

    def _extract_return_type_text(self, node: Node, source_code: str) -> str:
        """Extract return type annotation text if available."""
        return_node = node.child_by_field_name("return_type")
        if return_node:
            return self._node_text(return_node, source_code).strip()

        if self.language == "python":
            type_node = node.child_by_field_name("type")
            if type_node:
                return self._node_text(type_node, source_code).strip()

        return ""

    def _extract_python_base_classes(self, node: Node, source_code: str) -> str:
        """Extract base class list for Python class definitions."""
        bases = node.child_by_field_name("superclasses")
        if not bases:
            return ""

        bases_text = self._node_text(bases, source_code).strip()
        if not bases_text:
            return ""

        if bases_text.startswith("("):
            return bases_text
        return f"({bases_text})"

    def _extract_variable_type(self, node: Node, source_code: str) -> str:
        """Extract variable type annotation text when present."""
        type_node = node.child_by_field_name("type") or node.child_by_field_name(
            "type_annotation"
        )
        if not type_node:
            return ""

        return self._node_text(type_node, source_code).strip()

    def _extract_simple_value(self, node: Node, source_code: str) -> str:
        """Extract simplified literal values for variable declarations."""
        initializer = node.child_by_field_name("value")
        if not initializer:
            initializer = node.child_by_field_name("right")
        if not initializer:
            return ""

        simple_types = {
            "number",
            "string",
            "true",
            "false",
            "null",
            "undefined",
            "integer",
            "float",
            "none",
        }
        if initializer.type in simple_types:
            return self._node_text(initializer, source_code).strip()

        if initializer.type in {"array", "object"}:
            if not any(child.is_named for child in initializer.children):
                return self._node_text(initializer, source_code).strip()

        return ""

    def _node_text(self, node: Node, source_code: str) -> str:
        """Extract text for a node from the source code.

        Args:
            node: Tree-sitter node to extract text from.
            source_code: Raw source code string.

        Returns:
            UTF-8 decoded text for the node's byte range.
        """
        source_bytes = source_code.encode("utf-8")
        return source_bytes[node.start_byte : node.end_byte].decode(
            "utf-8", errors="replace"
        )
