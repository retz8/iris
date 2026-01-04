#!/usr/bin/env python3
"""
Manual validation script for Noise Eraser v1
Tests the /analyze endpoint with sample code files
"""

import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from ..src.analyzer.noise_detector import detect_noise


def print_section(title):
    """Print a section header"""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")


def print_result(result, sample_name):
    """Print analysis results in a readable format"""
    print(f"Sample: {sample_name}")
    print(f"Language: {result.get('language', 'N/A')}")
    print(f"Success: {result.get('success', False)}")
    
    if not result.get('success'):
        print(f"Error: {result.get('error', 'Unknown error')}")
        return
    
    noise_lines = result.get('noise_lines', [])
    noise_ranges = result.get('noise_ranges', [])
    noise_pct = result.get('noise_percentage', 0)
    
    print(f"Noise Percentage: {noise_pct}%")
    print(f"Total Noise Lines: {len(noise_lines)}")
    print(f"Noise Ranges: {len(noise_ranges)}")
    
    if noise_ranges:
        print("\nNoise Ranges:")
        for r in noise_ranges:
            print(f"  Lines {r['start']}-{r['end']}: {r['type']} ({', '.join(r['types'])})")
    
    print()


def test_sample_file(file_path, language):
    """Test a sample code file"""
    try:
        with open(file_path, 'r') as f:
            code = f.read()
        
        result = detect_noise(code, language)
        print_result(result, file_path.name)
        
        # Manual validation checklist
        print("Manual Verification Checklist:")
        print("  [ ] Are error handling blocks identified?")
        print("  [ ] Are logging statements identified?")
        print("  [ ] Are import statements identified?")
        print("  [ ] Are guard clauses identified?")
        print("  [ ] Is core logic NOT identified as noise?")
        print("  [ ] Are line numbers reasonable?")
        print("  [ ] Are consecutive noise lines grouped?")
        print()
        
        return result
        
    except FileNotFoundError:
        print(f"ERROR: File not found: {file_path}")
        return None
    except Exception as e:
        print(f"ERROR: {e}")
        return None


def main():
    """Run manual validation tests"""
    print_section("IRIS Noise Eraser v1 - Manual Validation")
    
    # Get sample code directory
    test_dir = Path(__file__).parent
    sample_dir = test_dir / "sample_code"
    
    if not sample_dir.exists():
        print(f"ERROR: Sample code directory not found: {sample_dir}")
        return 1
    
    # Test each sample file
    samples = [
        ("sample_react.js", "javascript"),
        ("sample_fastapi.py", "python"),
        ("sample_go.go", "go"),
    ]
    
    results = {}
    
    for filename, language in samples:
        print_section(f"Testing: {filename}")
        file_path = sample_dir / filename
        result = test_sample_file(file_path, language)
        if result:
            results[filename] = result
    
    # Summary
    print_section("Summary")
    
    if not results:
        print("No tests completed successfully.")
        return 1
    
    print(f"Tested {len(results)} files:\n")
    
    for filename, result in results.items():
        status = "✅ PASS" if result.get('success') else "❌ FAIL"
        noise_pct = result.get('noise_percentage', 0)
        print(f"  {status} {filename:25} - {noise_pct:5.1f}% noise")
    
    # Validation summary
    print("\n" + "=" * 60)
    print("Expected Results:")
    print("=" * 60)
    print()
    print("JavaScript (React):")
    print("  - Noise: imports, try-catch, console.log, export, guards")
    print("  - Clear: useState, useEffect, JSX rendering")
    print("  - Expected %: 20-30%")
    print()
    print("Python (FastAPI):")
    print("  - Noise: imports, try-except, logging, raise, guards")
    print("  - Clear: route handlers, data models, business logic")
    print("  - Expected %: 30-40%")
    print()
    print("Go (HTTP Handler):")
    print("  - Noise: imports, if err != nil, log.Printf, defer")
    print("  - Clear: HTTP routing, struct operations")
    print("  - Expected %: 20-30%")
    print()
    
    # Success criteria
    print("=" * 60)
    print("Success Criteria:")
    print("=" * 60)
    print()
    print("✅ All files analyzed successfully")
    print("✅ Noise percentage within expected range")
    print("✅ Core logic not marked as noise")
    print("✅ Pattern detection accurate for each language")
    print()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
