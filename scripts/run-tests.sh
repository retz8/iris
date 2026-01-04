#!/bin/bash
# Test runner script for IRIS backend tests
# Usage: ./run-tests.sh [test-class-name]

set -e

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

cd "$PROJECT_ROOT"

echo "========================================"
echo "IRIS Noise Eraser v1 - Test Suite"
echo "========================================"
echo ""

# Check if virtual environment exists
if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "⚠️  Virtual environment not found. Creating one..."
    cd "$BACKEND_DIR"
    python3 -m venv venv
    cd "$PROJECT_ROOT"
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source "$BACKEND_DIR/venv/bin/activate"

# Install dependencies if needed
if ! python -c "import flask" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r "$BACKEND_DIR/requirements.txt" -q
fi

echo ""
echo "🧪 Running tests..."
echo ""

# Change to backend directory for tests
cd "$BACKEND_DIR"

# Run tests based on argument
if [ -z "$1" ]; then
    # Run all tests
    echo "Running ALL tests..."
    python -m unittest discover tests/ -v
else
    # Run specific test class
    echo "Running tests for: $1"
    python -m unittest "tests.test_noise_detector.$1" -v
fi

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "❌ Some tests failed!"
    exit $TEST_EXIT_CODE
fi

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Total test classes: 8"
echo "Total test methods: 26"
echo ""
echo "Test classes:"
echo "  - TestJavaScriptNoiseDetection"
echo "  - TestPythonNoiseDetection"
echo "  - TestGoNoiseDetection"
echo "  - TestEdgeCases"
echo "  - TestNoiseRangeGrouping"
echo "  - TestRangeClassification"
echo "  - TestNoisePercentageCalculation"
echo "  - TestLanguageSpecificPatterns"
echo ""
echo "To run specific test class:"
echo "  ./scripts/run-tests.sh TestJavaScriptNoiseDetection"
echo ""
