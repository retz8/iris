"""Utility functions for AST processing.

Provides shared functionality for extracting metadata from Tree-sitter nodes
and working with AST representations.
"""

from typing import Any, Dict, List, Optional
from tree_sitter import Node


def extract_line_range(node: Node) -> List[int]:
    """Extract 1-indexed line range from a Tree-sitter node.

    Converts Tree-sitter's 0-indexed line numbering to 1-indexed format
    commonly used in editors and error reporting.

    Args:
        node: A Tree-sitter Node object.

    Returns:
        A list [start_line, end_line] with 1-indexed line numbers.

    Raises:
        ValueError: If node is invalid (has no position information).

    Examples:
        >>> # Node spanning lines 5-10 in editor (1-indexed)
        >>> # Tree-sitter reports start_point=(4, 0), end_point=(9, 15)
        >>> extract_line_range(node)
        [5, 10]
    """
    try:
        start_row = node.start_point[0]
        end_row = node.end_point[0]

        # Convert from 0-indexed to 1-indexed
        start_line = start_row + 1
        end_line = end_row + 1

        return [start_line, end_line]
    except (AttributeError, IndexError, TypeError) as e:
        raise ValueError(
            f"Cannot extract line range from node: invalid node structure. Error: {e}"
        )


def validate_line_range(line_range: List[int]) -> bool:
    """Validate that a line range is well-formed.

    Args:
        line_range: A list [start_line, end_line] to validate.

    Returns:
        True if valid (start_line <= end_line, both >= 1, both are integers).
        False otherwise.
    """
    if not isinstance(line_range, list) or len(line_range) != 2:
        return False

    start_line, end_line = line_range

    if not isinstance(start_line, int) or not isinstance(end_line, int):
        return False

    if start_line < 1 or end_line < 1:
        return False

    if start_line > end_line:
        return False

    return True


def get_node_type_category(node: Node) -> str:
    """Categorize a node type for processing decisions.

    Args:
        node: A Tree-sitter Node object.

    Returns:
        A category string: "declaration", "statement", "expression",
        "comment", "structural", or "unknown".
    """
    node_type = node.type

    # Declaration types
    if any(
        node_type.endswith(suffix)
        for suffix in ["_declaration", "_statement", "_definition"]
    ):
        return "declaration"

    # Statement types (but not declarations)
    if (
        any(node_type.endswith(suffix) for suffix in ["_statement"])
        and "declaration" not in node_type
    ):
        return "statement"

    # Expression types
    if "expression" in node_type or "literal" in node_type:
        return "expression"

    # Comment types
    if "comment" in node_type:
        return "comment"

    # Structural types (blocks, programs, etc.)
    if any(
        node_type.endswith(suffix)
        for suffix in ["_block", "program", "source_file", "translation_unit"]
    ):
        return "structural"

    return "unknown"


def extract_string_literal(node: Node, source: bytes) -> Optional[str]:
    """Extract string content from a string literal node, removing quotes.

    Args:
        node: A Tree-sitter node representing a string literal.
        source: The source code as bytes.

    Returns:
        The string content without quotes, or None if extraction fails.
    """
    if node.type != "string":
        return None

    try:
        text = source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")
        # Remove surrounding quotes (handles "", '', ``, etc.)
        if len(text) >= 2:
            if (text[0] == '"' and text[-1] == '"') or (
                text[0] == "'" and text[-1] == "'"
            ):
                return text[1:-1]
            if text[0] == "`" and text[-1] == "`":
                return text[1:-1]
        return text
    except Exception:
        return None


def extract_identifier_name(node: Node, source: bytes) -> Optional[str]:
    """Extract identifier name from an identifier node.

    Args:
        node: A Tree-sitter node representing an identifier.
        source: The source code as bytes.

    Returns:
        The identifier name, or None if extraction fails.
    """
    if node.type != "identifier":
        return None

    try:
        return source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")
    except Exception:
        return None


def extract_import_details(import_node: Node, source: bytes) -> Dict[str, Any]:
    """Extract detailed import information from an import_statement node.

    Extracts:
    - import_type: "namespace", "named", "default", "mixed", or "side_effect"
    - namespace_import: identifier name if present, else None
    - default_import: identifier name if present, else None
    - named_imports: list of identifier names if present, else None
    - source: the module/file path being imported from

    Args:
        import_node: A Tree-sitter import_statement node.
        source: The source code as bytes.

    Returns:
        Dictionary with import details.

    Raises:
        ValueError: If node is not an import_statement.
    """
    if import_node.type != "import_statement":
        raise ValueError(f"Expected import_statement node, got {import_node.type}")

    import_details: Dict[str, Any] = {
        "import_type": None,
        "namespace_import": None,
        "default_import": None,
        "named_imports": None,
        "source": None,
    }

    # Extract source string
    source_node = import_node.child_by_field_name("source")
    if source_node and source_node.type == "string":
        import_details["source"] = extract_string_literal(source_node, source)

    # Find import_clause child
    import_clause = None
    for child in import_node.children:
        if child.type == "import_clause":
            import_clause = child
            break

    # If no import_clause, it's a side-effect import (import "module")
    if not import_clause:
        import_details["import_type"] = "side_effect"
        return import_details

    # Collect import type markers
    has_namespace = False
    has_default = False
    has_named = False

    # Iterate through children of import_clause to find different import types
    namespace_import_node = None
    named_imports_node = None
    default_identifier = None

    for child in import_clause.children:
        if child.type == "namespace_import":
            namespace_import_node = child
            has_namespace = True
        elif child.type == "named_imports":
            named_imports_node = child
            has_named = True
        elif child.type == "identifier":
            # This is a default import (direct identifier in import_clause)
            default_identifier = child
            has_default = True

    # Extract namespace import identifier
    if namespace_import_node:
        # Find the identifier in namespace_import (after "as" keyword)
        for child in namespace_import_node.children:
            if child.type == "identifier":
                import_details["namespace_import"] = extract_identifier_name(
                    child, source
                )
                break

    # Extract named imports
    if named_imports_node:
        named_list = []
        for child in named_imports_node.children:
            if child.type == "import_specifier":
                # Get the 'name' field (the imported name, may have alias)
                spec_name_node = child.child_by_field_name("name")
                if spec_name_node and spec_name_node.type == "identifier":
                    named_list.append(extract_identifier_name(spec_name_node, source))

        if named_list:
            import_details["named_imports"] = named_list

    # Extract default import identifier
    if default_identifier:
        import_details["default_import"] = extract_identifier_name(
            default_identifier, source
        )

    # Determine import_type
    if has_namespace and has_named:
        import_details["import_type"] = "mixed"
    elif has_default and has_named:
        import_details["import_type"] = "mixed"
    elif has_namespace:
        import_details["import_type"] = "namespace"
    elif has_named:
        import_details["import_type"] = "named"
    elif has_default:
        import_details["import_type"] = "default"
    else:
        # Shouldn't reach here if has_import_clause, but fallback
        import_details["import_type"] = "unknown"

    return import_details


def detect_simple_value(initializer_node: Node) -> Dict[str, Any]:
    """Detect if a node represents a simple value that should be extracted.

    Simple values are primitives, literals, and empty collections that
    can be represented without expanding the full expression tree.

    Args:
        initializer_node: A Tree-sitter node representing an initializer/value.

    Returns:
        Dictionary with:
        - "is_simple": bool - True if this is a simple value
        - "value_type": str - Node type or category
        - "node_type": str - The actual Tree-sitter node type
    """
    node_type = initializer_node.type

    # Map of simple node types to their categories
    simple_types = {
        "true": "boolean",
        "false": "boolean",
        "null": "null",
        "undefined": "undefined",
        "number": "number",
        "string": "string",
        "template_string": "string",
    }

    if node_type in simple_types:
        return {
            "is_simple": True,
            "value_type": simple_types[node_type],
            "node_type": node_type,
        }

    # Empty array (no named children, only brackets)
    if node_type == "array":
        named_children = [c for c in initializer_node.children if c.is_named]
        if len(named_children) == 0:
            return {
                "is_simple": True,
                "value_type": "array",
                "node_type": node_type,
            }

    # Empty object (no named children, only braces)
    if node_type == "object":
        named_children = [c for c in initializer_node.children if c.is_named]
        if len(named_children) == 0:
            return {
                "is_simple": True,
                "value_type": "object",
                "node_type": node_type,
            }

    # Not a simple value
    return {
        "is_simple": False,
        "value_type": node_type,
        "node_type": node_type,
    }


def extract_simple_value(initializer_node: Node, source: bytes) -> Any:
    """Extract the value from a simple initializer node.

    Converts tree-sitter node to a Python primitive value.
    Only call this after verify with detect_simple_value().

    Args:
        initializer_node: A Tree-sitter node with a simple value.
        source: The source code as bytes.

    Returns:
        Python primitive: True, False, None, int, float, str, [], or {}
        Returns the node type string if extraction fails.
    """
    node_type = initializer_node.type

    # Boolean literals
    if node_type == "true":
        return True
    if node_type == "false":
        return False

    # Null and undefined
    if node_type == "null":
        return None
    if node_type == "undefined":
        return "undefined"

    # Number literal
    if node_type == "number":
        try:
            text = source[
                initializer_node.start_byte : initializer_node.end_byte
            ].decode("utf-8", errors="replace")
            # Try int first, then float
            if "." in text or "e" in text.lower():
                return float(text)
            return int(text)
        except (ValueError, AttributeError):
            return node_type

    # String literal
    if node_type == "string":
        extracted = extract_string_literal(initializer_node, source)
        if extracted is not None:
            return extracted
        return node_type

    # Template string (similar to string)
    if node_type == "template_string":
        try:
            text = source[
                initializer_node.start_byte : initializer_node.end_byte
            ].decode("utf-8", errors="replace")
            # Remove backticks
            if text.startswith("`") and text.endswith("`"):
                return text[1:-1]
            return text
        except Exception:
            return node_type

    # Empty array
    if node_type == "array":
        return []

    # Empty object
    if node_type == "object":
        return {}

    # Fallback (shouldn't reach here if detect_simple_value was used correctly)
    return node_type


def extract_parameters(formal_parameters_node: Node, source: bytes) -> Dict[str, Any]:
    """Extract parameter information from a formal_parameters node.

    Extracts parameter names, types, and default value presence from function
    parameter lists. Handles simple identifiers, destructuring patterns, rest
    parameters, and optional parameters with defaults.

    Args:
        formal_parameters_node: A Tree-sitter formal_parameters node.
        source: The source code as bytes.

    Returns:
        Dictionary with:
        - "parameters": List of parameter info dicts, each containing:
          - "name": str - Parameter name or stringified pattern
          - "type": str - "identifier", "rest_parameter", "object_pattern", etc.
          - "has_default": bool - Whether this parameter has a default value
        - "parameter_count": int - Total number of parameters
        - "has_rest": bool - Whether any rest parameter is present
    """
    if formal_parameters_node.type != "formal_parameters":
        raise ValueError(
            f"Expected formal_parameters node, got {formal_parameters_node.type}"
        )

    parameters: List[Dict[str, Any]] = []
    has_rest = False

    # Iterate over children to extract parameters
    for child in formal_parameters_node.children:
        if not child.is_named:
            continue

        # Skip open/close parens
        if child.type in ("(", ")"):
            continue

        param_info = _extract_single_parameter(child, source)
        if param_info:
            parameters.append(param_info)
            if param_info.get("type") == "rest_parameter":
                has_rest = True

    return {
        "parameters": parameters,
        "parameter_count": len(parameters),
        "has_rest": has_rest,
    }


def _extract_single_parameter(
    param_node: Node, source: bytes
) -> Optional[Dict[str, Any]]:
    """Extract information from a single parameter node.

    Handles:
    - identifier: Simple parameter name
    - optional_parameter: Parameter with default value
    - assignment_pattern: Parameter with default (same as optional_parameter)
    - rest_pattern: Rest parameter (...name)
    - object_pattern: Destructuring {x, y}
    - array_pattern: Destructuring [a, b]

    Args:
        param_node: A parameter node (child of formal_parameters).
        source: The source code as bytes.

    Returns:
        Dictionary with parameter info, or None if skipped.
    """
    node_type = param_node.type

    # Simple identifier parameter
    if node_type == "identifier":
        return {
            "name": source[param_node.start_byte : param_node.end_byte].decode(
                "utf-8", errors="replace"
            ),
            "type": "identifier",
            "has_default": False,
        }

    # Optional parameter (has default value)
    if node_type == "optional_parameter" or node_type == "assignment_pattern":
        # In optional_parameter, the identifier is the first child
        identifier_node = None
        for child in param_node.children:
            if child.type == "identifier":
                identifier_node = child
                break

        if identifier_node:
            return {
                "name": source[
                    identifier_node.start_byte : identifier_node.end_byte
                ].decode("utf-8", errors="replace"),
                "type": "identifier",
                "has_default": True,
            }

    # Rest parameter (...rest)
    if node_type == "rest_pattern":
        # Find the identifier after "..."
        identifier_node = None
        for child in param_node.children:
            if child.type == "identifier":
                identifier_node = child
                break

        if identifier_node:
            return {
                "name": source[
                    identifier_node.start_byte : identifier_node.end_byte
                ].decode("utf-8", errors="replace"),
                "type": "rest_parameter",
                "has_default": False,
            }

    # Destructuring patterns (object or array)
    if node_type in ("object_pattern", "array_pattern"):
        # For patterns, use the stringified representation
        pattern_text = source[param_node.start_byte : param_node.end_byte].decode(
            "utf-8", errors="replace"
        )
        return {
            "name": pattern_text,
            "type": node_type,
            "has_default": False,
        }

    # Unknown type - skip
    return None
