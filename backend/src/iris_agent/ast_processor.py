"""Shallow AST processor for IRIS.

Transforms a full Tree-sitter AST into a shallow structure that keeps
high-level declarations while replacing implementation-heavy subtrees with
simple line range references.

NOTE: This is the actual implementation used by routes.py.
Requires: parser.ast_parser.ASTParser and comment_extractor.CommentExtractor
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, List, Optional, Set, Type

from tree_sitter import Node

from parser.ast_parser import ASTParser
from .comment_extractor import CommentExtractor

if TYPE_CHECKING:
    from .debugger import ShallowASTDebugger


class ShallowASTProcessor:
    """Convert parsed source code into a shallow AST representation.

    This processor:
    1. Parses source code using Tree-sitter (via ASTParser)
    2. Traverses the AST up to max_depth (default: 2)
    3. Replaces nested body nodes with simple line_range references
    4. Extracts comments for each node (via CommentExtractor)

    Example output:
    {
        "type": "function_declaration",
        "line_range": [10, 25],
        "name": "calculateTotal",
        "leading_comment": "// Calculate order total",
        "trailing_comment": null,
        "inline_comment": null,
        "fields": {
            "parameters": [...],
            "return_type": {...}
        },
        "children": [...]
    }
    """

    def __init__(
        self,
        parser: Optional[ASTParser] = None,
        max_depth: int = 2,
        body_field_names: Optional[Set[str]] = None,
        body_node_types: Optional[Set[str]] = None,
        comment_extractor_cls: Type[CommentExtractor] = CommentExtractor,
    ) -> None:
        """Initialize the ShallowASTProcessor.

        Args:
            parser: ASTParser instance (creates default if None)
            max_depth: Maximum depth to traverse before collapsing to line_range
            body_field_names: Set of field names to treat as body-like
            body_node_types: Set of node types to treat as body-like
            comment_extractor_cls: CommentExtractor class to use
        """
        self.parser = parser or ASTParser()
        self.max_depth = max_depth
        self.body_field_names = body_field_names or {
            "body",
            "block",
            "consequence",
            "alternative",
            "then",
            "else",
            "catch",
            "finalizer",
            "handlers",
        }
        self.body_node_types = body_node_types or {
            "block",
            "statement_block",
            "compound_statement",
        }
        self._source_bytes: bytes = b""
        self.comment_extractor_cls = comment_extractor_cls
        self.comment_extractor: Optional[CommentExtractor] = None

    def process(
        self, code: str, language: str, debugger: Optional[ShallowASTDebugger] = None
    ) -> Dict[str, Any]:
        """Parse and shallow-process source code.

        Args:
            code: Raw source code.
            language: Language identifier (e.g., "javascript", "typescript", "python")
            debugger: Optional ShallowASTDebugger instance for diagnostic capture.

        Returns:
            Dictionary representation of the shallow AST.

        Raises:
            ValueError: If code is empty
        """

        if not code:
            raise ValueError("Code cannot be empty")

        if debugger:
            debugger.capture_snapshot("raw_source", code)

        tree = self.parser.parse(code, language)
        self._source_bytes = code.encode("utf-8")
        self.comment_extractor = self.comment_extractor_cls(code, language)

        # Count nodes in full AST for metrics
        full_ast_node_count = self._count_full_ast_nodes(tree.root_node)

        # Build shallow AST
        shallow_ast = self._build_node(tree.root_node, depth=0)

        # Compute metrics if debugger is provided
        if debugger:
            debugger.compute_metrics(full_ast_node_count, shallow_ast, code)
            debugger.verify_integrity(code, shallow_ast)

        return shallow_ast

    def _build_node(self, node: Node, depth: int) -> Dict[str, Any]:
        """Build a dictionary representation of a Tree-sitter node.

        At depth >= max_depth, only includes type and line_range.
        Otherwise, recursively processes children.

        Note: Single-line nodes (start_line == end_line) have line_range set to null,
        as there is no meaningful implementation to read beyond what's in the AST.
        """
        start_line, end_line = self._line_range(node)

        # Single-line declarations have no nested implementation
        # Setting line_range to null signals "no need to read source"
        line_range_value = None if start_line == end_line else [start_line, end_line]

        representation: Dict[str, Any] = {
            "type": node.type,
            "line_range": line_range_value,
        }

        # Attach comments (omit if None)
        if self.comment_extractor:
            comments = self.comment_extractor.comments_for_range(start_line, end_line)
            # Only add non-None comment values
            for key, value in comments.items():
                if value is not None:
                    representation[key] = value

        # Extract identifier/name if present
        identifier = self._extract_identifier(node)
        if identifier:
            representation["name"] = identifier

        # Stop recursion at max depth
        if depth >= self.max_depth:
            # Signal complexity if there are hidden children
            child_count = self._count_relevant_children(node)
            if child_count > 0:
                representation["extra_children_count"] = child_count
            return representation

        # Process children - flattened into linearized structure
        linearized_children: List[Dict[str, Any]] = []
        fields: Dict[str, List[Dict[str, Any]]] = {}

        for index, child in enumerate(node.children):
            if not child.is_named:
                continue

            field_name = node.field_name_for_child(index)
            child_repr = self._represent_child(child, depth, field_name)

            # Flatten intermediate wrapper nodes
            if self._should_flatten(child):
                # Extract grandchildren instead of nesting this wrapper
                for grandchild_idx, grandchild in enumerate(child.children):
                    if not grandchild.is_named:
                        continue
                    grandchild_field = child.field_name_for_child(grandchild_idx)
                    grandchild_repr = self._represent_child(
                        grandchild, depth, grandchild_field
                    )
                    if grandchild_field:
                        fields.setdefault(grandchild_field, []).append(grandchild_repr)
                    else:
                        linearized_children.append(grandchild_repr)
            else:
                # Regular node - add to appropriate structure
                if field_name:
                    fields.setdefault(field_name, []).append(child_repr)
                else:
                    linearized_children.append(child_repr)

        if fields:
            representation["fields"] = fields
        if linearized_children:
            representation["children"] = linearized_children

        return representation

    def _represent_child(
        self, child: Node, parent_depth: int, field_name: Optional[str]
    ) -> Dict[str, Any]:
        """Represent a child node - shallow if body-like, else recursive.

        Ensures that signature information (parameters, return types) remains visible
        even when implementation bodies are collapsed.
        """
        start_line, end_line = self._line_range(child)

        # Body-like nodes: replace with line_range only (or null if single-line)
        if self._is_body_like(child, field_name):
            line_range_value = (
                None if start_line == end_line else [start_line, end_line]
            )
            return {"type": child.type, "line_range": line_range_value}

        # Otherwise, recurse
        return self._build_node(child, parent_depth + 1)

    def _extract_identifier(self, node: Node) -> Optional[str]:
        """Extract name/identifier from common field names."""
        for field_name in ("name", "identifier", "id"):
            child = node.child_by_field_name(field_name)
            if child:
                return self._slice_source(child)
        return None

    def _line_range(self, node: Node) -> List[int]:
        """Convert Tree-sitter's 0-based line numbers to 1-based."""
        return [node.start_point[0] + 1, node.end_point[0] + 1]

    def _is_body_like(self, node: Node, field_name: Optional[str]) -> bool:
        """Check if a node should be collapsed to line_range only.

        Context-aware: Preserves Python decorators and TypeScript export clauses
        as part of the declaration signature.
        """
        if field_name and field_name in self.body_field_names:
            return True
        return node.type in self.body_node_types

    def _should_flatten(self, node: Node) -> bool:
        """Check if a node is a purely structural wrapper that should be flattened.

        These nodes don't add semantic value and only increase JSON depth.
        """
        # Wrapper nodes that exist only for structural purposes
        flatten_types = {
            "translation_unit",  # C/C++/Rust root
            "statement_block",  # Generic block wrapper
            "program",  # JavaScript/TypeScript root
            "source_file",  # Some languages
        }
        return node.type in flatten_types

    def _count_relevant_children(self, node: Node) -> int:
        """Count the number of named child nodes at max_depth boundary.

        This signals complexity when we stop recursing.
        """
        count = 0
        for child in node.children:
            if child.is_named and not self._is_body_like(child, None):
                count += 1
        return count

    def _count_full_ast_nodes(self, node: Node) -> int:
        """Count total number of nodes in the full Tree-sitter AST.

        Recursively counts all named nodes to establish a baseline for
        measuring compression efficiency.
        """
        count = 1 if node.is_named else 0
        for child in node.children:
            count += self._count_full_ast_nodes(child)
        return count

    def _slice_source(self, node: Node) -> str:
        """Extract source text for a node."""
        return self._source_bytes[node.start_byte : node.end_byte].decode(
            "utf-8", errors="replace"
        )
