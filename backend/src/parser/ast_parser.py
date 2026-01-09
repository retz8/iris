"""
AST Parser for IRIS - Phase 0.1
Unified AST parser for multiple languages using Tree-sitter
"""

from tree_sitter import Parser, Language
import tree_sitter_javascript as ts_javascript
import tree_sitter_python as ts_python
import tree_sitter_go as ts_go
import tree_sitter_java as ts_java
import tree_sitter_typescript as ts_typescript
import tree_sitter_c as ts_c
import tree_sitter_cpp as ts_cpp


class ASTParser:
    """
    Unified AST parser for multiple languages using Tree-sitter
    
    Supports:
    - JavaScript (including ES6+, JSX)
    - TypeScript
    - Python
    - Go
    - Java
    - C
    - C++
    """
    
    def __init__(self):
        """Initialize parsers for all supported languages"""
        self.parsers = {
            'javascript': self._init_js_parser(),
            'typescript': self._init_ts_parser(),
            'python': self._init_py_parser(),
            'go': self._init_go_parser(),
            'java': self._init_java_parser(),
            'c': self._init_c_parser(),
            'cpp': self._init_cpp_parser(),
            'c++': self._init_cpp_parser(),  # alias
        }
        print("[IRIS AST Parser] Initialized parsers for: javascript, typescript, python, go, java, c, cpp")
    
    def parse(self, code: str, language: str):
        """
        Parse source code into AST
        
        Args:
            code: Source code string
            language: Programming language (javascript, python, go, etc.)
            
        Returns:
            Tree-sitter Tree object
            
        Raises:
            ValueError: If language is not supported
            Exception: If parsing fails
        """
        if not code:
            raise ValueError("Code cannot be empty")
        
        parser = self.parsers.get(language.lower())
        if not parser:
            supported = ', '.join(self.parsers.keys())
            raise ValueError(f"Unsupported language: {language}. Supported languages: {supported}")
        
        try:
            tree = parser.parse(bytes(code, "utf8"))
            
            # Check if parsing was successful
            if tree.root_node.has_error:
                print(f"[IRIS AST Parser] Warning: Parse tree contains errors for {language}")
            
            return tree
        except Exception as e:
            raise Exception(f"Failed to parse {language} code: {str(e)}")
    
    def _init_js_parser(self):
        """Initialize JavaScript parser"""
        try:
            parser = Parser(Language(ts_javascript.language()))
            return parser
        except Exception as e:
            raise Exception(f"Failed to initialize JavaScript parser: {str(e)}")
    
    def _init_py_parser(self):
        """Initialize Python parser"""
        try:
            parser = Parser(Language(ts_python.language()))
            return parser
        except Exception as e:
            raise Exception(f"Failed to initialize Python parser: {str(e)}")
    
    def _init_go_parser(self):
        """Initialize Go parser"""
        try:
            parser = Parser(Language(ts_go.language()))
            return parser
        except Exception as e:
            raise Exception(f"Failed to initialize Go parser: {str(e)}")
    
    def _init_java_parser(self):
        """Initialize Java parser"""
        try:
            parser = Parser(Language(ts_java.language()))
            return parser
        except Exception as e:
            raise Exception(f"Failed to initialize Java parser: {str(e)}")
    
    def _init_ts_parser(self):
        """Initialize TypeScript parser"""
        try:
            parser = Parser(Language(ts_typescript.language_typescript()))
            return parser
        except Exception as e:
            raise Exception(f"Failed to initialize TypeScript parser: {str(e)}")
    
    def _init_c_parser(self):
        """Initialize C parser"""
        try:
            parser = Parser(Language(ts_c.language()))
            return parser
        except Exception as e:
            raise Exception(f"Failed to initialize C parser: {str(e)}")
    
    def _init_cpp_parser(self):
        """Initialize C++ parser"""
        try:
            parser = Parser(Language(ts_cpp.language()))
            return parser
        except Exception as e:
            raise Exception(f"Failed to initialize C++ parser: {str(e)}")
    
    def get_supported_languages(self):
        """Return list of supported languages"""
        return list(self.parsers.keys())
