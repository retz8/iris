"""
Function Extractor Module
Extracts all function definitions from AST using Tree-sitter
"""

from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class Function:
    """Represents a function definition with metadata"""

    name: str
    start_line: int
    end_line: int
    params: List[str]
    body: str
    node: Any  # Tree-sitter node for later section analysis

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "name": self.name,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "params": self.params,
            "line_count": self.end_line - self.start_line + 1,
        }


class FunctionExtractor:
    """
    Extract all function definitions from AST
    """

    # Language-specific function node types
    FUNCTION_TYPES = {
        "javascript": [
            "function_declaration",
            "arrow_function",
            "method_definition",
            "function_expression",
        ],
        "typescript": [
            "function_declaration",
            "arrow_function",
            "method_definition",
            "function_expression",
        ],
        "python": ["function_definition"],
        "go": ["function_declaration", "method_declaration"],
        "java": ["method_declaration"],
        "c": ["function_definition"],
        "cpp": ["function_definition"],
    }

    def extract_functions(self, ast_tree, language: str) -> List[Function]:
        """
        Extract all functions from AST

        Args:
            ast_tree: Tree-sitter Tree object
            language: Programming language

        Returns:
            List of Function objects
        """
        functions = []
        function_types = self.FUNCTION_TYPES.get(language, [])

        if not function_types:
            print(f"Warning: No function types defined for language '{language}'")
            return []

        root_node = ast_tree.root_node

        for node in self._traverse(root_node):
            if node.type in function_types:
                func = self._parse_function(node, language)
                if func:
                    functions.append(func)

        return functions

    def _traverse(self, node):
        """Depth-first traversal of AST"""
        yield node
        for child in node.children:
            yield from self._traverse(child)

    def _parse_function(self, node, language: str) -> Function:
        """Parse individual function node"""
        name = self._get_function_name(node, language)
        params = self._get_parameters(node, language)

        return Function(
            name=name,
            start_line=node.start_point[0] + 1,  # 1-indexed
            end_line=node.end_point[0] + 1,
            params=params,
            body=node.text.decode("utf8"),
            node=node,
        )

    def _get_function_name(self, node, language: str) -> str:
        """Extract function name from node"""
        if language in ["javascript", "typescript"]:
            # For method_definition, check 'name' field first
            if node.type == "method_definition":
                name_node = node.child_by_field_name("name")
                if name_node:
                    return name_node.text.decode("utf8")

            # Try to find 'identifier' child
            for child in node.children:
                if child.type == "identifier":
                    return child.text.decode("utf8")
            # For arrow functions or anonymous functions
            return "<anonymous>"

        elif language == "python":
            # Python function_definition has 'name' field
            name_node = node.child_by_field_name("name")
            if name_node:
                return name_node.text.decode("utf8")
            return "<unknown>"

        elif language == "go":
            name_node = node.child_by_field_name("name")
            if name_node:
                return name_node.text.decode("utf8")
            return "<unknown>"

        elif language in ["java", "c", "cpp"]:
            # Java/C/C++ methods have 'declarator' or 'name' field
            declarator = node.child_by_field_name("declarator")
            if declarator:
                # For C/C++, declarator might have nested structure
                if declarator.type == "identifier":
                    return declarator.text.decode("utf8")
                # Try to find identifier in declarator children
                for child in declarator.children:
                    if child.type == "identifier":
                        return child.text.decode("utf8")
                    # For function_declarator in C/C++
                    if child.type == "function_declarator":
                        for subchild in child.children:
                            if subchild.type == "identifier":
                                return subchild.text.decode("utf8")

            # Fallback: try 'name' field
            name_node = node.child_by_field_name("name")
            if name_node:
                return name_node.text.decode("utf8")

            return "<unknown>"

        return "<unknown>"

    def _get_parameters(self, node, language: str) -> List[str]:
        """Extract parameter names"""
        params = []

        if language in ["javascript", "typescript"]:
            for child in node.children:
                if child.type == "formal_parameters":
                    for param in child.children:
                        if param.type == "identifier":
                            params.append(param.text.decode("utf8"))
                        elif (
                            param.type == "required_parameter"
                            or param.type == "optional_parameter"
                        ):
                            # TypeScript typed parameters
                            for subchild in param.children:
                                if subchild.type == "identifier":
                                    params.append(subchild.text.decode("utf8"))
                                    break

        elif language == "python":
            params_node = node.child_by_field_name("parameters")
            if params_node:
                for param in params_node.children:
                    if param.type == "identifier":
                        params.append(param.text.decode("utf8"))
                    elif (
                        param.type == "typed_parameter"
                        or param.type == "default_parameter"
                    ):
                        # Handle typed/default parameters
                        for subchild in param.children:
                            if subchild.type == "identifier":
                                params.append(subchild.text.decode("utf8"))
                                break

        elif language == "go":
            params_node = node.child_by_field_name("parameters")
            if params_node:
                for param in params_node.children:
                    if param.type == "parameter_declaration":
                        # Go parameters: name type or type
                        for subchild in param.children:
                            if subchild.type == "identifier":
                                params.append(subchild.text.decode("utf8"))
                                break

        elif language in ["java", "c", "cpp"]:
            # Find parameters - could be in declarator for C/C++
            declarator = node.child_by_field_name("declarator")
            if declarator:
                # Look for function_declarator or parameter_list
                for child in declarator.children:
                    if (
                        child.type == "function_declarator"
                        or child.type == "parameter_list"
                    ):
                        for param in child.children:
                            if param.type == "parameter_declaration":
                                # C/C++ parameter: find declarator then identifier
                                param_declarator = param.child_by_field_name(
                                    "declarator"
                                )
                                if param_declarator:
                                    if param_declarator.type == "identifier":
                                        params.append(
                                            param_declarator.text.decode("utf8")
                                        )
                                    else:
                                        # Nested declarator (pointers, arrays)
                                        for pdchild in param_declarator.children:
                                            if pdchild.type == "identifier":
                                                params.append(
                                                    pdchild.text.decode("utf8")
                                                )
                                                break

            # Also check for formal_parameters (Java style)
            for child in node.children:
                if child.type == "formal_parameters" or child.type == "parameter_list":
                    for param in child.children:
                        if param.type == "formal_parameter":
                            # Java parameter
                            for subchild in param.children:
                                if subchild.type == "identifier":
                                    params.append(subchild.text.decode("utf8"))

        return params
