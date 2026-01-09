"""
Section Detector Module
Detects logical sections within a function body using AST analysis
"""

import re
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class Section:
    """Represents a logical section within a function"""

    type: str  # setup, validation, processing, etc.
    start_line: int
    end_line: int
    description: str
    key_operations: List[str]
    statements: List[Any]  # Tree-sitter nodes

    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "type": self.type,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "line_count": self.end_line - self.start_line + 1,
            "description": self.description,
            "key_operations": self.key_operations,
        }


class SectionDetector:
    """
    Detect logical sections within a function body
    """

    # AST node type to section type mapping (highest confidence)
    AST_TYPE_MAPPING = {
        "javascript": {
            "return_statement": "return",
            "throw_statement": "error_handling",
            "try_statement": "error_handling",
            "catch_clause": "error_handling",
            "for_statement": "processing",
            "for_in_statement": "processing",
            "while_statement": "processing",
            "do_statement": "processing",
        },
        "typescript": {
            "return_statement": "return",
            "throw_statement": "error_handling",
            "try_statement": "error_handling",
            "catch_clause": "error_handling",
            "for_statement": "processing",
            "for_in_statement": "processing",
            "while_statement": "processing",
            "do_statement": "processing",
        },
        "python": {
            "return_statement": "return",
            "raise_statement": "error_handling",
            "try_statement": "error_handling",
            "except_clause": "error_handling",
            "for_statement": "processing",
            "while_statement": "processing",
        },
        "go": {
            "return_statement": "return",
            "for_statement": "processing",
        },
        "java": {
            "return_statement": "return",
            "throw_statement": "error_handling",
            "try_statement": "error_handling",
            "catch_clause": "error_handling",
            "for_statement": "processing",
            "enhanced_for_statement": "processing",
            "while_statement": "processing",
            "do_statement": "processing",
        },
        "c": {
            "return_statement": "return",
            "for_statement": "processing",
            "while_statement": "processing",
            "do_statement": "processing",
        },
        "cpp": {
            "return_statement": "return",
            "throw_statement": "error_handling",
            "try_statement": "error_handling",
            "catch_clause": "error_handling",
            "for_statement": "processing",
            "for_range_loop": "processing",
            "while_statement": "processing",
            "do_statement": "processing",
        },
    }

    # Patterns for statement classification
    CLASSIFICATION_PATTERNS = {
        "setup": [
            r"new\s+\w+\(",  # new ClassName() - must have parentheses
            r"create\w*\(",  # create(), createInstance()
            r"initialize\w*\(",  # initialize(), init()
            r"const.*=.*new\s+\w+\(",  # const x = new Y()
            r"var.*=.*new\s+\w+\(",  # var x = new Y()
            r"let.*=.*new\s+\w+\(",  # let x = new Y()
            r"init\w*\(",  # init(), initLoader()
            r"setup\w*\(",  # setup(), setupEnvironment()
        ],
        "validation": [
            r"if\s*\(!\w+\)(?!.*throw)(?!.*error)",  # if (!x) but NOT with throw/error
            r"if.*===?\s*null(?!.*throw)(?!.*error)",  # if (x === null) but NOT with throw
            r"if.*===?\s*undefined(?!.*throw)(?!.*error)",  # Similar pattern
            r"if.*\.length.*===?\s*0(?!.*throw)",  # if (arr.length === 0) but NOT throw
            r"validate\w*\(",  # validate(), validateInput()
            r"check\w*\(",  # check(), checkValid()
            r"assert\w*\(",  # assert(), assertEqual()
            r"if.*empty(?!.*throw)(?!.*error)",
        ],
        "processing": [
            r"for\s*\(",
            r"while\s*\(",
            r"\.map\(",
            r"\.forEach\(",
            r"\.filter\(",
            r"\.reduce\(",
            r"range\(",
            r"iterate",
        ],
        "api_call": [
            r"fetch\(",
            r"axios\.",
            r"http\.",
            r"request\(",
            r"\.load\(",
            r"\.get\(",
            r"\.post\(",
            r"api\.",
        ],
        "error_handling": [
            r"try\s*{",
            r"catch\s*\(",
            r"throw\s+",
            r"raise\s+",  # Python raise
            r"except\s*:",  # Python except
            r"except\s+\w+",  # Python except Exception
            r"\.error\(",  # console.error(), logger.error()
            r"error\(",  # Error() constructor
        ],
        "cleanup": [r"remove", r"delete", r"clear", r"destroy", r"dispose", r"close"],
        "assignment": [
            r"^\s*\w+\s*=\s*[^=]",  # x = value (not ==)
            r"let\s+\w+\s*=\s*[^n]",  # let x = ... (but not "let x = new")
            r"var\s+\w+\s*=\s*[^n]",  # var x = ... (but not "var x = new")
            r"const\s+\w+\s*=\s*[^n]",  # const x = ... (but not "const x = new")
        ],
        "return": [r"return\s+", r"return$"],
    }

    # Description templates for each section type
    DESCRIPTION_TEMPLATES = {
        "setup": "Initializes variables and creates necessary objects",
        "validation": "Validates input parameters and checks preconditions",
        "processing": "Processes data through iteration or transformation",
        "api_call": "Makes external API or service calls",
        "error_handling": "Handles errors and exceptional cases",
        "cleanup": "Cleans up resources and removes temporary data",
        "assignment": "Assigns values to variables",
        "return": "Returns the result",
        "other": "Performs operations",
    }

    def detect_sections(self, function, language: str) -> List[Section]:
        """
        Divide function body into logical sections

        Args:
            function: Function object with AST node
            language: Programming language

        Returns:
            List of Section objects
        """
        sections = []
        body_node = function.node.child_by_field_name("body")

        if not body_node:
            return []

        # 1. Get top-level statements
        statements = self._get_statements(body_node, language)

        if not statements:
            return []

        # 2. Group statements into sections
        current_section = None

        for stmt in statements:
            stmt_type = self._classify_statement(stmt, language)

            # Same type → extend current section
            if current_section and current_section.type == stmt_type:
                current_section.end_line = stmt["end_line"]
                current_section.statements.append(stmt)
            else:
                # New type → start new section
                if current_section:
                    sections.append(current_section)

                current_section = Section(
                    type=stmt_type,
                    start_line=stmt["start_line"],
                    end_line=stmt["end_line"],
                    description="",  # Will be filled later
                    key_operations=[],
                    statements=[stmt],
                )

        # Add last section
        if current_section:
            sections.append(current_section)

        # 3. Generate metadata for each section
        for section in sections:
            section.description = self._generate_description(section, language)
            section.key_operations = self._extract_key_operations(section)

        return sections

    def _get_statements(self, body_node, language: str) -> List[Dict]:
        """Extract top-level statements from function body"""
        statements = []

        for child in body_node.children:
            # Skip braces, whitespace, and comments
            if child.type in ["{", "}", "comment", "line_comment", "block_comment"]:
                continue

            # Skip empty nodes
            if child.start_point[0] == child.end_point[0] and not child.text.strip():
                continue

            # Valid statement
            statements.append(
                {
                    "node": child,
                    "text": (
                        child.text.decode("utf8")
                        if isinstance(child.text, bytes)
                        else child.text
                    ),
                    "start_line": child.start_point[0] + 1,
                    "end_line": child.end_point[0] + 1,
                    "type": child.type,
                }
            )

        return statements

    def _classify_statement(self, stmt: Dict, language: str) -> str:
        """Classify statement into section type using AST + patterns"""
        node_type = stmt["node"].type
        stmt_text = stmt["text"]
        stmt_text_lower = stmt_text.lower()

        # TIER 1: AST node type mapping (highest confidence)
        lang_mapping = self.AST_TYPE_MAPPING.get(language, {})
        if node_type in lang_mapping:
            mapped_type = lang_mapping[node_type]
            if mapped_type:  # Not None
                return mapped_type

        # TIER 2: Pattern-based classification (priority order)
        # 1. Return statements (check pattern as fallback)
        if self._matches_patterns(
            stmt_text_lower, self.CLASSIFICATION_PATTERNS["return"]
        ):
            return "return"

        # 2. Error handling (before validation to catch throw/raise)
        if self._matches_patterns(
            stmt_text_lower, self.CLASSIFICATION_PATTERNS["error_handling"]
        ):
            return "error_handling"

        # 3. Validation (now more specific, excludes throw/error)
        if self._matches_patterns(
            stmt_text_lower, self.CLASSIFICATION_PATTERNS["validation"]
        ):
            return "validation"

        # 4. API calls
        if self._matches_patterns(
            stmt_text_lower, self.CLASSIFICATION_PATTERNS["api_call"]
        ):
            return "api_call"

        # 5. Processing (loops and transformations)
        if self._matches_patterns(
            stmt_text_lower, self.CLASSIFICATION_PATTERNS["processing"]
        ):
            return "processing"

        # 6. Setup (before assignment to catch "new" statements)
        if self._matches_patterns(
            stmt_text_lower, self.CLASSIFICATION_PATTERNS["setup"]
        ):
            # Double-check it's actual instantiation
            if any(
                keyword in stmt_text_lower
                for keyword in ["new ", "create", "init", "setup"]
            ):
                return "setup"

        # 7. Cleanup
        if self._matches_patterns(
            stmt_text_lower, self.CLASSIFICATION_PATTERNS["cleanup"]
        ):
            return "cleanup"

        # 8. Assignment (most generic, check last)
        if self._matches_patterns(
            stmt_text_lower, self.CLASSIFICATION_PATTERNS["assignment"]
        ):
            # Avoid false positives: skip if it looks like a more specific type
            if not any(
                [
                    "new " in stmt_text_lower,
                    "fetch(" in stmt_text_lower,
                    "axios." in stmt_text_lower,
                ]
            ):
                return "assignment"

        # Default
        return "other"

    def _matches_patterns(self, text: str, patterns: List[str]) -> bool:
        """Check if text matches any of the given patterns"""
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _generate_description(self, section: Section, language: str) -> str:
        """Generate human-readable description of section"""
        base = self.DESCRIPTION_TEMPLATES.get(section.type, "Performs operations")

        # Add more specific details based on actual code
        if len(section.statements) > 1:
            base += f" ({len(section.statements)} statements)"

        return base

    def _extract_key_operations(self, section: Section) -> List[str]:
        """Extract key operations from section (simplified heuristic)"""
        operations = []

        # Simple heuristic: extract function calls
        for stmt in section.statements:
            text = stmt["text"]
            # Find function calls (simplified regex)
            calls = re.findall(r"(\w+(?:\.\w+)*)\s*\(", text)
            operations.extend(calls[:3])  # Max 3 operations per statement

        # Deduplicate while preserving order
        seen = set()
        unique_operations = []
        for op in operations:
            if op not in seen:
                seen.add(op)
                unique_operations.append(op)

        return unique_operations[:5]  # Max 5 total
