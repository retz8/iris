#!/usr/bin/env python3
"""
Unit tests for Section Detector (src/analyzer/section_detector.py)

Tests the SectionDetector class for detecting logical sections within functions.

Tests on following languages:
- JavaScript
- TypeScript
- Python
- Go
- Java
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from parser.ast_parser import ASTParser
from analyzer.function_extractor import FunctionExtractor
from analyzer.section_detector import SectionDetector, Section


# Mock node class for direct classification tests
class MockNode:
    def __init__(self, node_type):
        self.type = node_type


def test_section_to_dict():
    """Test Section.to_dict() serialization"""
    print("Testing Section.to_dict() serialization...")

    section = Section(
        type="setup",
        start_line=5,
        end_line=10,
        description="Test section",
        key_operations=["init", "create"],
        statements=[],
    )

    result = section.to_dict()

    assert result["type"] == "setup", f"Expected 'setup', got '{result['type']}'"
    assert (
        result["start_line"] == 5
    ), f"Expected start_line=5, got {result['start_line']}"
    assert result["end_line"] == 10, f"Expected end_line=10, got {result['end_line']}"
    assert (
        result["line_count"] == 6
    ), f"Expected line_count=6, got {result['line_count']}"
    assert result["description"] == "Test section"
    assert result["key_operations"] == ["init", "create"]

    print("✓ Section.to_dict() works correctly")
    return True


def test_javascript_simple_sections():
    """Test basic section detection in JavaScript"""
    print("\nTesting JavaScript section detection...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
function processData(input) {
    const data = new DataProcessor();
    
    if (!input) {
        throw new Error('Invalid input');
    }
    
    for (let i = 0; i < input.length; i++) {
        data.process(input[i]);
    }
    
    return data.result();
}
"""

    tree = parser.parse(code, "javascript")
    functions = extractor.extract_functions(tree, "javascript")
    assert len(functions) == 1, f"Expected 1 function, got {len(functions)}"

    func = functions[0]
    sections = detector.detect_sections(func, "javascript")

    assert len(sections) > 0, "Should detect at least one section"

    section_types = [s.type for s in sections]
    assert "setup" in section_types, "Should detect setup section"
    assert "error_handling" in section_types, "Should detect error_handling section"
    assert "processing" in section_types, "Should detect processing section"
    assert "return" in section_types, "Should detect return section"

    print(f"✓ JavaScript sections detected: {len(sections)} sections")
    print(f"  Section types: {section_types}")
    return True


def test_python_sections():
    """Test section detection in Python"""
    print("\nTesting Python section detection...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
def load_data(filename):
    if not filename:
        raise ValueError("Filename required")
    
    data = []
    with open(filename, 'r') as f:
        for line in f:
            data.append(line.strip())
    
    return data
"""

    tree = parser.parse(code, "python")
    functions = extractor.extract_functions(tree, "python")
    assert len(functions) == 1, f"Expected 1 function, got {len(functions)}"

    func = functions[0]
    sections = detector.detect_sections(func, "python")

    assert len(sections) > 0, "Should detect at least one section"

    section_types = [s.type for s in sections]
    assert "return" in section_types, "Should detect return section"

    print(f"✓ Python sections detected: {len(sections)} sections")
    print(f"  Section types: {section_types}")
    return True


def test_go_sections():
    """Test section detection in Go"""
    print("\nTesting Go section detection...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
package main

func ProcessRequest(req Request) (Response, error) {
    if req.ID == "" {
        return Response{}, errors.New("missing ID")
    }
    
    result := new(Response)
    result.Data = req.Data
    
    return *result, nil
}
"""

    tree = parser.parse(code, "go")
    functions = extractor.extract_functions(tree, "go")
    assert len(functions) > 0, f"Expected at least 1 function, got {len(functions)}"

    func = functions[0]
    sections = detector.detect_sections(func, "go")

    assert len(sections) > 0, "Should detect at least one section"

    print(f"✓ Go sections detected: {len(sections)} sections")
    return True


def test_classify_setup_statement():
    """Test classification of setup statements"""
    print("\nTesting setup statement classification...")

    detector = SectionDetector()

    stmt = {
        "node": MockNode("variable_declaration"),
        "text": "const loader = new DataLoader();",
        "start_line": 1,
        "end_line": 1,
        "type": "variable_declaration",
    }

    result = detector._classify_statement(stmt, "javascript")
    assert result == "setup", f"Expected 'setup', got '{result}'"

    print("✓ Setup statement classified correctly")
    return True


def test_classify_validation_statement():
    """Test classification of validation statements"""
    print("\nTesting validation statement classification...")

    detector = SectionDetector()

    stmt = {
        "node": MockNode("if_statement"),
        "text": "if (!input) { throw new Error(); }",
        "start_line": 1,
        "end_line": 1,
        "type": "if_statement",
    }

    result = detector._classify_statement(stmt, "javascript")
    # Note: throw statement makes this error_handling, not validation
    assert result == "error_handling", f"Expected 'error_handling', got '{result}'"

    print("✓ Validation/error_handling statement classified correctly")
    return True


def test_classify_processing_statement():
    """Test classification of processing statements"""
    print("\nTesting processing statement classification...")

    detector = SectionDetector()

    stmt = {
        "node": MockNode("for_statement"),
        "text": "for (let i = 0; i < arr.length; i++) { process(arr[i]); }",
        "start_line": 1,
        "end_line": 1,
        "type": "for_statement",
    }

    result = detector._classify_statement(stmt, "javascript")
    assert result == "processing", f"Expected 'processing', got '{result}'"

    print("✓ Processing statement classified correctly")
    return True


def test_classify_api_call_statement():
    """Test classification of API call statements"""
    print("\nTesting API call statement classification...")

    detector = SectionDetector()

    stmt = {
        "node": MockNode("variable_declaration"),
        "text": "const response = await fetch('https://api.example.com/data');",
        "start_line": 1,
        "end_line": 1,
        "type": "variable_declaration",
    }

    result = detector._classify_statement(stmt, "javascript")
    assert result == "api_call", f"Expected 'api_call', got '{result}'"

    print("✓ API call statement classified correctly")
    return True


def test_classify_error_handling_statement():
    """Test classification of error handling statements"""
    print("\nTesting error handling statement classification...")

    detector = SectionDetector()

    stmt = {
        "node": MockNode("try_statement"),
        "text": "try { doSomething(); } catch (e) { console.error(e); }",
        "start_line": 1,
        "end_line": 1,
        "type": "try_statement",
    }

    result = detector._classify_statement(stmt, "javascript")
    assert result == "error_handling", f"Expected 'error_handling', got '{result}'"

    print("✓ Error handling statement classified correctly")
    return True


def test_classify_return_statement():
    """Test classification of return statements"""
    print("\nTesting return statement classification...")

    detector = SectionDetector()

    stmt = {
        "node": MockNode("return_statement"),
        "text": "return result;",
        "start_line": 1,
        "end_line": 1,
        "type": "return_statement",
    }

    result = detector._classify_statement(stmt, "javascript")
    assert result == "return", f"Expected 'return', got '{result}'"

    print("✓ Return statement classified correctly")
    return True


def test_extract_key_operations():
    """Test extraction of key operations from section"""
    print("\nTesting key operations extraction...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
function test() {
    loader.load(file);
    processor.process(data);
    validator.validate(result);
}
"""

    tree = parser.parse(code, "javascript")
    functions = extractor.extract_functions(tree, "javascript")
    func = functions[0]
    sections = detector.detect_sections(func, "javascript")

    assert len(sections) > 0, "Should detect at least one section"

    # Check that at least one section has key operations
    has_operations = any(len(s.key_operations) > 0 for s in sections)
    assert has_operations, "At least one section should have key operations"

    print("✓ Key operations extracted successfully")
    return True


def test_generate_description():
    """Test description generation"""
    print("\nTesting description generation...")

    detector = SectionDetector()

    section = Section(
        type="setup",
        start_line=1,
        end_line=5,
        description="",
        key_operations=[],
        statements=[
            {"text": "const a = 1;", "start_line": 1, "end_line": 1},
            {"text": "const b = 2;", "start_line": 2, "end_line": 2},
            {"text": "const c = 3;", "start_line": 3, "end_line": 3},
        ],
    )

    desc = detector._generate_description(section, "javascript")
    assert "Initializes" in desc, "Description should contain 'Initializes'"
    assert "3 statements" in desc, "Description should mention '3 statements'"

    print(f"✓ Description generated: '{desc}'")
    return True


def test_complex_javascript_function():
    """Test with a more complex function"""
    print("\nTesting complex JavaScript function...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
function loadHumanModel(modelFile, posX, posY, posZ, callback) {
    const loader = new PLYLoader();
    
    loader.load(modelFile, function (geometry) {
        humanGeometry = geometry;
        
        if (!geometry.attributes.normal) {
            geometry.computeVertexNormals();
        }
        
        if (geometry.isBufferGeometry) {
            var positions = geometry.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                var x = positions.getX(i);
                var y = positions.getY(i);
                var z = positions.getZ(i);
                geometryZero.push(new THREE.Vector3(x, y, z));
            }
        }
        
        humanMaterial = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            opacity: 1.0,
        });
        
        if (humanMesh) {
            scene.remove(humanMesh);
        }
        
        humanMesh = new THREE.Mesh(geometry, humanMaterial);
        humanMesh.position.set(posX, posY, posZ);
        scene.add(humanMesh);
        
        if (callback) callback();
    });
}
"""

    tree = parser.parse(code, "javascript")
    functions = extractor.extract_functions(tree, "javascript")
    # Note: Extracts both outer function and inner callback function
    assert len(functions) > 0, f"Expected at least 1 function, got {len(functions)}"

    func = functions[0]
    sections = detector.detect_sections(func, "javascript")

    # Should detect multiple sections
    assert len(sections) >= 2, f"Expected at least 2 sections, got {len(sections)}"

    # Verify sections have proper structure
    for section in sections:
        assert section.type is not None, "Section type should not be None"
        assert section.start_line > 0, "Start line should be positive"
        assert (
            section.end_line >= section.start_line
        ), "End line should be >= start line"
        assert section.description is not None, "Description should not be None"
        assert isinstance(
            section.key_operations, list
        ), "Key operations should be a list"

    print(f"✓ Complex function analyzed: {len(sections)} sections detected")
    return True


def test_python_error_handling():
    """Test Python exception handling detection"""
    print("\nTesting Python error handling...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
def risky_operation():
    try:
        result = perform_task()
        return result
    except Exception as e:
        print(f"Error: {e}")
        return None
"""

    tree = parser.parse(code, "python")
    functions = extractor.extract_functions(tree, "python")
    func = functions[0]
    sections = detector.detect_sections(func, "python")

    # Should detect sections, but structure may vary
    assert len(sections) > 0, "Should detect at least one section"

    print(f"✓ Python error handling analyzed: {len(sections)} sections")
    return True


def test_empty_function():
    """Test function with empty body"""
    print("\nTesting empty function...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
function empty() {
}
"""

    tree = parser.parse(code, "javascript")
    functions = extractor.extract_functions(tree, "javascript")
    func = functions[0]
    sections = detector.detect_sections(func, "javascript")

    # Empty function should return empty sections list
    assert (
        len(sections) == 0
    ), f"Expected 0 sections for empty function, got {len(sections)}"

    print("✓ Empty function handled correctly (0 sections)")
    return True


def test_single_statement_function():
    """Test function with only one statement"""
    print("\nTesting single statement function...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
function singleReturn() {
    return 42;
}
"""

    tree = parser.parse(code, "javascript")
    functions = extractor.extract_functions(tree, "javascript")
    func = functions[0]
    sections = detector.detect_sections(func, "javascript")

    # Should have exactly one section
    assert len(sections) == 1, f"Expected 1 section, got {len(sections)}"
    assert (
        sections[0].type == "return"
    ), f"Expected 'return' type, got '{sections[0].type}'"

    print("✓ Single statement function: 1 return section")
    return True


def test_consecutive_same_type_statements():
    """Test that consecutive statements of same type are grouped"""
    print("\nTesting consecutive same-type statement grouping...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
function setup() {
    const a = new ClassA();
    const b = new ClassB();
    const c = new ClassC();
}
"""

    tree = parser.parse(code, "javascript")
    functions = extractor.extract_functions(tree, "javascript")
    func = functions[0]
    sections = detector.detect_sections(func, "javascript")

    # All setup statements should be grouped into one section
    assert len(sections) == 1, f"Expected 1 section, got {len(sections)}"
    assert (
        sections[0].type == "setup"
    ), f"Expected 'setup' type, got '{sections[0].type}'"
    assert (
        len(sections[0].statements) == 3
    ), f"Expected 3 statements, got {len(sections[0].statements)}"

    print("✓ Consecutive statements grouped correctly: 3 statements in 1 section")
    return True


def test_typescript_support():
    """Test section detection in TypeScript"""
    print("\nTesting TypeScript section detection...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
function processData(input: string[]): number {
    const data: number[] = [];
    
    if (input.length === 0) {
        return 0;
    }
    
    for (const item of input) {
        data.push(parseInt(item));
    }
    
    return data.reduce((a, b) => a + b, 0);
}
"""

    tree = parser.parse(code, "typescript")
    functions = extractor.extract_functions(tree, "typescript")
    # May extract arrow functions as well
    assert len(functions) > 0, f"Expected at least 1 function, got {len(functions)}"

    func = functions[0]
    sections = detector.detect_sections(func, "typescript")

    assert len(sections) > 0, "Should detect at least one section"

    section_types = [s.type for s in sections]
    assert len(section_types) > 0, "Should have at least some sections"

    print(f"✓ TypeScript sections detected: {len(sections)} sections")
    print(f"  Section types: {section_types}")
    return True


def test_java_support():
    """Test section detection in Java"""
    print("\nTesting Java section detection...")

    parser = ASTParser()
    extractor = FunctionExtractor()
    detector = SectionDetector()

    code = """
public class Example {
    public void process(String input) {
        if (input == null) {
            throw new IllegalArgumentException("Input required");
        }
        
        String result = input.toUpperCase();
        System.out.println(result);
    }
}
"""

    tree = parser.parse(code, "java")
    functions = extractor.extract_functions(tree, "java")

    if len(functions) > 0:
        func = functions[0]
        sections = detector.detect_sections(func, "java")
        assert len(sections) > 0, "Should detect at least one section"
        print(f"✓ Java sections detected: {len(sections)} sections")
    else:
        print("✓ Java parsing completed (no methods extracted)")

    return True


def run_all_tests():
    """Run all tests and report results"""
    print("=" * 80)
    print("SECTION DETECTOR UNIT TESTS")
    print("=" * 80)

    tests = [
        test_section_to_dict,
        test_javascript_simple_sections,
        test_python_sections,
        test_go_sections,
        test_classify_setup_statement,
        test_classify_validation_statement,
        test_classify_processing_statement,
        test_classify_api_call_statement,
        test_classify_error_handling_statement,
        test_classify_return_statement,
        test_extract_key_operations,
        test_generate_description,
        test_complex_javascript_function,
        test_python_error_handling,
        test_empty_function,
        test_single_statement_function,
        test_consecutive_same_type_statements,
        test_typescript_support,
        test_java_support,
    ]

    passed = 0
    failed = 0
    failed_tests = []

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            failed += 1
            failed_tests.append((test.__name__, str(e)))
            print(f"✗ {test.__name__} FAILED: {e}")
        except Exception as e:
            failed += 1
            failed_tests.append((test.__name__, str(e)))
            print(f"✗ {test.__name__} ERROR: {e}")

    print("\n" + "=" * 80)
    print(f"RESULTS: {passed} passed, {failed} failed out of {len(tests)} tests")
    print("=" * 80)

    if failed > 0:
        print("\nFailed tests:")
        for test_name, error in failed_tests:
            print(f"  - {test_name}: {error}")
        sys.exit(1)
    else:
        print("\n✓ All tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    run_all_tests()
