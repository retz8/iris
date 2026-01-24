"""Signature graph configuration constants."""

from __future__ import annotations

from typing import Dict, List, Set

# Declaration node types per Tree-sitter grammar.
# Keep these lists exhaustive for JS/TS/Python declaration extraction.
DECLARATION_TYPES: Dict[str, List[str]] = {
    "javascript": [
        "function_declaration",
        "function_expression",
        "arrow_function",
        "generator_function",
        "generator_function_declaration",
        "class_declaration",
        "method_definition",
        "method_declaration",
        "constructor_declaration",
        "variable_declarator",
        "import_statement",
        "export_statement",
        "export_clause",
    ],
    "typescript": [
        "function_declaration",
        "function_expression",
        "arrow_function",
        "generator_function",
        "generator_function_declaration",
        "class_declaration",
        "method_definition",
        "method_declaration",
        "constructor_declaration",
        "variable_declarator",
        "import_statement",
        "export_statement",
        "export_clause",
        "interface_declaration",
        "type_alias_declaration",
        "enum_declaration",
        "module_declaration",
        "ambient_declaration",
    ],
    "python": [
        "function_definition",
        "class_definition",
        "decorated_definition",
        "assignment",
        "augmented_assignment",
        "import_statement",
        "import_from_statement",
    ],
}

# Node types that can contain nested declarations and should be traversed.
CONTAINER_NODE_TYPES: Set[str] = {
    "program",
    "module",
    "statement_block",
    "block",
    "class_body",
    "function_body",
    "suite",
    "body",
    "module_statement",
}

# Node types treated as callable entities for call-graph extraction.
FUNCTION_NODE_TYPES: Set[str] = {
    "function_declaration",
    "function_expression",
    "arrow_function",
    "generator_function",
    "generator_function_declaration",
    "method_definition",
    "method_declaration",
    "constructor_declaration",
    "function_definition",
    "lambda",
}
