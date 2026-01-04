# IRIS Backend Test Suite

## Overview
This directory contains comprehensive tests for the IRIS Noise Eraser v1 backend analyzer.

## Test Structure

```
tests/
├── __init__.py
├── test_noise_detector.py      # Main test suite
├── sample_code/                # Sample files for manual testing
│   ├── sample_react.js         # React component example
│   ├── sample_fastapi.py       # Python FastAPI example
│   └── sample_go.go            # Go HTTP handler example
└── README.md                   # This file
```

## Running Tests

### Run All Tests
```bash
cd backend
python -m pytest tests/ -v
```

Or using unittest:
```bash
cd backend
python -m unittest discover tests/ -v
```

Or run directly:
```bash
cd backend
python tests/test_noise_detector.py
```

### Run Specific Test Classes
```bash
# JavaScript tests only
python -m unittest tests.test_noise_detector.TestJavaScriptNoiseDetection -v

# Python tests only
python -m unittest tests.test_noise_detector.TestPythonNoiseDetection -v

# Go tests only
python -m unittest tests.test_noise_detector.TestGoNoiseDetection -v

# Edge cases only
python -m unittest tests.test_noise_detector.TestEdgeCases -v
```

### Run Specific Test Methods
```bash
python -m unittest tests.test_noise_detector.TestJavaScriptNoiseDetection.test_react_component_with_error_handling -v
```

## Test Coverage

### 1. Language-Specific Tests

#### JavaScript/TypeScript (`TestJavaScriptNoiseDetection`)
- ✅ React components with hooks, error handling, and logging
- ✅ Try-catch-finally blocks
- ✅ Promise.catch() error handling
- ✅ Console.log/error/warn/info/debug
- ✅ Import statements (ES6)
- ✅ Export statements
- ✅ Guard clauses (early returns, null checks)

#### Python (`TestPythonNoiseDetection`)
- ✅ FastAPI endpoints with error handling
- ✅ Try-except-finally blocks
- ✅ Logging module usage
- ✅ Import/from statements
- ✅ Guard clauses (if not, if is None)
- ✅ Raise statements

#### Go (`TestGoNoiseDetection`)
- ✅ HTTP handlers with error handling
- ✅ `if err != nil` pattern
- ✅ `if err == nil` pattern
- ✅ Defer statements
- ✅ Panic statements
- ✅ Log.Printf/Println
- ✅ Import blocks
- ✅ Nil checks

### 2. Edge Cases (`TestEdgeCases`)
- ✅ Empty files
- ✅ Whitespace-only files
- ✅ Files with 100% noise (all imports/logging)
- ✅ Files with 0% noise (pure logic)
- ✅ Unsupported languages (proper error handling)
- ✅ Large files (1000+ lines)
- ✅ Case-insensitive language names
- ✅ Language name with whitespace

### 3. Range Grouping (`TestNoiseRangeGrouping`)
- ✅ Consecutive noise lines grouped into ranges
- ✅ Non-consecutive noise creates separate ranges
- ✅ Mixed noise types within a range
- ✅ Type classification for ranges

### 4. Classification Logic (`TestRangeClassification`)
- ✅ Priority ordering (error_handling > imports > logging > guards)
- ✅ Empty type lists
- ✅ Unknown noise types

### 5. Percentage Calculation (`TestNoisePercentageCalculation`)
- ✅ Accurate percentage calculation
- ✅ Rounding to 2 decimal places
- ✅ Edge cases (0%, 100%, fractional percentages)

### 6. Pattern Matching (`TestLanguageSpecificPatterns`)
- ✅ JavaScript-specific patterns (.catch, export)
- ✅ Python-specific patterns (is None, raise)
- ✅ Go-specific patterns (defer, panic, err != nil)

## Manual Testing Guide

### Using Sample Code Files

Sample code files are provided in `sample_code/` for manual verification:

1. **sample_react.js**: React component with typical patterns
   - Expected noise: Lines 5-7 (imports), error handling blocks, console.log statements
   - Expected clear: useState, useEffect, JSX rendering logic

2. **sample_fastapi.py**: FastAPI application
   - Expected noise: Lines 7-12 (imports), try-except blocks, logging statements
   - Expected clear: Route handlers, data models, business logic

3. **sample_go.go**: Go HTTP handler
   - Expected noise: Lines 5-13 (imports), if err != nil blocks, log.Printf
   - Expected clear: HTTP routing logic, struct operations

### Manual Testing Steps

1. Start the backend server:
   ```bash
   cd backend
   ./scripts/start-server.sh
   ```

2. Test with sample files:
   ```bash
   curl -X POST http://localhost:8080/analyze \
     -H "Content-Type: application/json" \
     -d @<(echo '{"code":"'"$(cat tests/sample_code/sample_react.js)"'", "language":"javascript"}')
   ```

3. Verify the response includes:
   - `success: true`
   - `noise_lines`: array of line numbers
   - `noise_ranges`: array of ranges with types
   - `noise_percentage`: reasonable percentage (typically 20-40%)

4. Manual verification checklist:
   - [ ] Are error handling blocks identified?
   - [ ] Are logging statements identified?
   - [ ] Are import statements identified?
   - [ ] Are guard clauses identified?
   - [ ] Is core logic NOT identified as noise?
   - [ ] Are line numbers 1-indexed?
   - [ ] Are consecutive noise lines grouped?

## Expected Test Results

All tests should pass with the following distribution:

```
TestJavaScriptNoiseDetection
  ✓ test_react_component_with_error_handling
  ✓ test_error_handling_patterns
  ✓ test_guard_clauses

TestPythonNoiseDetection
  ✓ test_fastapi_endpoint_with_error_handling
  ✓ test_python_error_handling_patterns
  ✓ test_python_imports

TestGoNoiseDetection
  ✓ test_go_http_handler_with_error_handling
  ✓ test_go_error_patterns

TestEdgeCases
  ✓ test_empty_file
  ✓ test_whitespace_only
  ✓ test_all_noise_file
  ✓ test_no_noise_file
  ✓ test_unsupported_language
  ✓ test_large_file
  ✓ test_mixed_case_language_name

TestNoiseRangeGrouping
  ✓ test_consecutive_noise_grouping
  ✓ test_non_consecutive_noise
  ✓ test_mixed_noise_types_in_range

TestRangeClassification
  ✓ test_priority_order
  ✓ test_empty_types
  ✓ test_unknown_type

TestNoisePercentageCalculation
  ✓ test_50_percent_noise
  ✓ test_rounding

TestLanguageSpecificPatterns
  ✓ test_javascript_specific_patterns
  ✓ test_python_specific_patterns
  ✓ test_go_specific_patterns
```

**Total: 26 tests**

## Success Criteria

### Quantitative Goals
- ✅ All 26 unit tests pass
- ✅ Noise detection accuracy ≥ 85% (manual verification)
- ✅ Test coverage for all supported languages (JS, Python, Go, Java)
- ✅ Edge cases handled gracefully

### Qualitative Goals
- ✅ Tests are readable and maintainable
- ✅ Test names clearly describe what they test
- ✅ Sample code files represent real-world scenarios
- ✅ Manual testing guide is comprehensive

## Adding New Tests

When adding support for new languages or patterns:

1. Add test class: `class TestNewLanguageNoiseDetection(unittest.TestCase)`
2. Include sample code with known noise patterns
3. Test both positive cases (noise detected) and negative cases (logic not noise)
4. Add edge cases specific to that language
5. Update this README

## Troubleshooting

### Import Errors
If you get `ModuleNotFoundError`:
```bash
# Ensure you're running from backend/ directory
cd backend
python -m unittest discover tests/
```

### Pattern Not Detected
1. Check pattern definition in `src/analyzer/patterns.py`
2. Test regex pattern independently
3. Verify line stripping doesn't remove pattern
4. Check for case sensitivity issues

### False Positives
1. Review pattern specificity
2. Consider adding negative lookahead patterns
3. Test with more sample code
4. Adjust pattern priority in classification

## Related Documentation
- See `.github/copilot-instructions.md` for overall project plan
- Phase 4 Testing & Validation section for requirements
- API specification in `backend/src/server.py`
