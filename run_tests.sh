#!/bin/bash
# Test Runner Script for YouTube Toolkit
# Runs all tests with various options

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}YouTube Toolkit - Test Runner${NC}"
echo "=================================="

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}Error: pytest is not installed${NC}"
    echo "Install with: pip install pytest pytest-cov pytest-asyncio"
    exit 1
fi

# Parse command line arguments
TEST_TYPE="${1:-all}"
COVERAGE="${2:-no}"

case $TEST_TYPE in
    "all")
        echo -e "${YELLOW}Running all tests...${NC}"
        if [ "$COVERAGE" == "coverage" ]; then
            pytest tests/ -v --cov=backend --cov-report=term-missing --cov-report=html
            echo -e "${GREEN}Coverage report generated in htmlcov/index.html${NC}"
        else
            pytest tests/ -v
        fi
        ;;

    "api")
        echo -e "${YELLOW}Running API tests...${NC}"
        pytest tests/test_api.py -v -m api
        ;;

    "security")
        echo -e "${YELLOW}Running security tests...${NC}"
        pytest tests/test_api.py -v -m security
        ;;

    "unit")
        echo -e "${YELLOW}Running unit tests...${NC}"
        pytest tests/ -v -m unit
        ;;

    "quick")
        echo -e "${YELLOW}Running quick tests (excluding slow)...${NC}"
        pytest tests/ -v -m "not slow"
        ;;

    "specific")
        if [ -z "$2" ]; then
            echo -e "${RED}Error: Please specify test file or function${NC}"
            echo "Usage: ./run_tests.sh specific test_file.py::TestClass::test_function"
            exit 1
        fi
        echo -e "${YELLOW}Running specific test: $2${NC}"
        pytest "$2" -v
        ;;

    "help")
        echo "Usage: ./run_tests.sh [test_type] [coverage]"
        echo ""
        echo "Test types:"
        echo "  all       - Run all tests (default)"
        echo "  api       - Run API tests only"
        echo "  security  - Run security tests only"
        echo "  unit      - Run unit tests only"
        echo "  quick     - Run quick tests (skip slow)"
        echo "  specific  - Run specific test (requires second argument)"
        echo "  help      - Show this help message"
        echo ""
        echo "Coverage:"
        echo "  coverage  - Generate coverage report"
        echo ""
        echo "Examples:"
        echo "  ./run_tests.sh all coverage"
        echo "  ./run_tests.sh api"
        echo "  ./run_tests.sh specific tests/test_api.py::TestHealthEndpoints"
        exit 0
        ;;

    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo "Run './run_tests.sh help' for usage information"
        exit 1
        ;;
esac

# Check test result
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
