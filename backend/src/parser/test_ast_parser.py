#!/usr/bin/env python3
"""
Unit tests for AST Parser (src/ast_parser.py)

Tests the ASTParser class for parsing source code into AST across multiple languages.

tests on following languages:
- JavaScript
- TypeScript
- Python
- Go
- Java
- C
- C++
"""

import sys

from ast_parser import ASTParser


def test_initialization():
    """Test that parser initializes with all supported languages"""
    print("Testing parser initialization...")
    parser = ASTParser()

    supported = parser.get_supported_languages()
    expected_languages = [
        "javascript",
        "typescript",
        "python",
        "go",
        "java",
        "c",
        "cpp",
        "c++",
    ]

    for lang in expected_languages:
        assert lang in supported, f"Language {lang} not in supported list"

    print(f"✓ Parser initialized with {len(supported)} languages")
    return True


def test_javascript_parsing():
    """Test JavaScript code parsing"""
    print("\nTesting JavaScript parsing...")
    parser = ASTParser()

    js_code = """
function hello(name) {
    console.log("Hello, " + name);
    return true;
}
"""

    tree = parser.parse(js_code, "javascript")
    assert tree is not None, "Parse tree should not be None"
    assert (
        tree.root_node.type == "program"
    ), f"Expected 'program', got '{tree.root_node.type}'"
    assert tree.root_node.child_count > 0, "Should have at least one child node"

    print(f"✓ JavaScript parsed successfully")
    print(f"  Root node type: {tree.root_node.type}")
    print(f"  Child count: {tree.root_node.child_count}")
    return True


def test_python_parsing():
    """Test Python code parsing"""
    print("\nTesting Python parsing...")
    parser = ASTParser()

    py_code = """
def hello(name):
    print(f"Hello, {name}")
    return True
"""

    tree = parser.parse(py_code, "python")
    assert tree is not None, "Parse tree should not be None"
    assert (
        tree.root_node.type == "module"
    ), f"Expected 'module', got '{tree.root_node.type}'"
    assert tree.root_node.child_count > 0, "Should have at least one child node"

    print(f"✓ Python parsed successfully")
    print(f"  Root node type: {tree.root_node.type}")
    print(f"  Child count: {tree.root_node.child_count}")
    return True


def test_go_parsing():
    """Test Go code parsing"""
    print("\nTesting Go parsing...")
    parser = ASTParser()

    go_code = """
package main

func hello(name string) bool {
    println("Hello, " + name)
    return true
}
"""

    tree = parser.parse(go_code, "go")
    assert tree is not None, "Parse tree should not be None"
    assert (
        tree.root_node.type == "source_file"
    ), f"Expected 'source_file', got '{tree.root_node.type}'"
    assert tree.root_node.child_count > 0, "Should have at least one child node"

    print(f"✓ Go parsed successfully")
    print(f"  Root node type: {tree.root_node.type}")
    print(f"  Child count: {tree.root_node.child_count}")
    return True


def test_java_parsing():
    """Test Java code parsing"""
    print("\nTesting Java parsing...")
    parser = ASTParser()

    java_code = """
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
"""

    tree = parser.parse(java_code, "java")
    assert tree is not None, "Parse tree should not be None"
    assert (
        tree.root_node.type == "program"
    ), f"Expected 'program', got '{tree.root_node.type}'"
    assert tree.root_node.child_count > 0, "Should have at least one child node"

    print(f"✓ Java parsed successfully")
    print(f"  Root node type: {tree.root_node.type}")
    print(f"  Child count: {tree.root_node.child_count}")
    return True


def test_typescript_parsing():
    """Test TypeScript code parsing"""
    print("\nTesting TypeScript parsing...")
    parser = ASTParser()

    ts_code = """
function greet(name: string): void {
    console.log(`Hello, ${name}`);
}
"""

    tree = parser.parse(ts_code, "typescript")
    assert tree is not None, "Parse tree should not be None"
    assert (
        tree.root_node.type == "program"
    ), f"Expected 'program', got '{tree.root_node.type}'"
    assert tree.root_node.child_count > 0, "Should have at least one child node"

    print(f"✓ TypeScript parsed successfully")
    print(f"  Root node type: {tree.root_node.type}")
    print(f"  Child count: {tree.root_node.child_count}")
    return True


def test_c_parsing():
    """Test C code parsing"""
    print("\nTesting C parsing...")
    parser = ASTParser()

    c_code = """
#include <stdio.h>
int main() {
    printf("Hello, World!");
    return 0;
}
"""

    tree = parser.parse(c_code, "c")
    assert tree is not None, "Parse tree should not be None"
    assert (
        tree.root_node.type == "translation_unit"
    ), f"Expected 'translation_unit', got '{tree.root_node.type}'"
    assert tree.root_node.child_count > 0, "Should have at least one child node"

    print(f"✓ C parsed successfully")
    print(f"  Root node type: {tree.root_node.type}")
    print(f"  Child count: {tree.root_node.child_count}")
    return True


def test_cpp_parsing():
    """Test C++ code parsing"""
    print("\nTesting C++ parsing...")
    parser = ASTParser()

    cpp_code = """
#include <iostream>
int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
"""

    tree = parser.parse(cpp_code, "cpp")
    assert tree is not None, "Parse tree should not be None"
    assert (
        tree.root_node.type == "translation_unit"
    ), f"Expected 'translation_unit', got '{tree.root_node.type}'"
    assert tree.root_node.child_count > 0, "Should have at least one child node"

    print(f"✓ C++ parsed successfully")
    print(f"  Root node type: {tree.root_node.type}")
    print(f"  Child count: {tree.root_node.child_count}")
    return True


def test_cpp_alias():
    """Test C++ parsing with 'c++' alias"""
    print("\nTesting C++ alias (c++)...")
    parser = ASTParser()

    cpp_code = """
#include <iostream>
int main() {
    std::cout << "Hello!" << std::endl;
    return 0;
}
"""

    tree = parser.parse(cpp_code, "c++")
    assert tree is not None, "Parse tree should not be None"
    assert (
        tree.root_node.type == "translation_unit"
    ), f"Expected 'translation_unit', got '{tree.root_node.type}'"

    print(f"✓ C++ alias (c++) works correctly")
    return True


def test_error_handling_unsupported_language():
    """Test error handling for unsupported languages"""
    print("\nTesting error handling for unsupported language...")
    parser = ASTParser()

    try:
        parser.parse("print('hello')", "ruby")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "Unsupported language" in str(e), f"Wrong error message: {e}"
        print(f"✓ Correctly caught unsupported language error")
        return True


def test_error_handling_empty_code():
    """Test error handling for empty code"""
    print("\nTesting error handling for empty code...")
    parser = ASTParser()

    try:
        parser.parse("", "javascript")
        assert False, "Should have raised ValueError"
    except ValueError as e:
        assert "cannot be empty" in str(e), f"Wrong error message: {e}"
        print(f"✓ Correctly caught empty code error")
        return True


def test_case_insensitive_language_names():
    """Test that language names are case-insensitive"""
    print("\nTesting case-insensitive language names...")
    parser = ASTParser()

    code = "console.log('test');"

    # Test various cases
    tree1 = parser.parse(code, "JavaScript")
    tree2 = parser.parse(code, "JAVASCRIPT")
    tree3 = parser.parse(code, "javascript")

    assert tree1.root_node.type == tree2.root_node.type == tree3.root_node.type

    print(f"✓ Language names are case-insensitive")
    return True


# Run all tests
if __name__ == "__main__":
    print("=" * 60)
    print("AST Parser Unit Tests (Phase 0.1)")
    print("=" * 60)

    tests = [
        test_initialization,
        test_javascript_parsing,
        test_python_parsing,
        test_go_parsing,
        test_java_parsing,
        test_typescript_parsing,
        test_c_parsing,
        test_cpp_parsing,
        test_cpp_alias,
        test_error_handling_unsupported_language,
        test_error_handling_empty_code,
        test_case_insensitive_language_names,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"✗ {test.__name__} FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test.__name__} ERROR: {e}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 60)

    sys.exit(0 if failed == 0 else 1)
