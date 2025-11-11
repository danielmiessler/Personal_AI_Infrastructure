#!/bin/bash
# Unit tests for shell detection in setup.sh
# Tests the shell detection logic that sets SHELL_CONFIG and SHELL_NAME

# Test framework variables
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print test result
print_result() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✓${NC} PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} FAIL: $test_name"
        echo -e "  Expected: $expected"
        echo -e "  Actual:   $actual"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Extract and run shell detection logic with a given SHELL value
run_shell_detection() {
    local shell_path="$1"
    
    # Simulate the shell detection logic from setup.sh (lines 416-428)
    SHELL_BASENAME=$(basename "$shell_path")
    
    if [ "$SHELL_BASENAME" = "zsh" ]; then
        SHELL_CONFIG="$HOME/.zshrc"
        SHELL_NAME="zsh"
    elif [ "$SHELL_BASENAME" = "bash" ]; then
        SHELL_CONFIG="$HOME/.bashrc"
        SHELL_NAME="bash"
    else
        SHELL_CONFIG="$HOME/.zshrc"
        SHELL_NAME="zsh"
    fi
    
    # Return values via echo (return multiple values separated by |)
    echo "$SHELL_CONFIG|$SHELL_NAME"
}

# ============================================
# Test 1: zsh shell detection
# ============================================
echo -e "\n${YELLOW}Test 1: zsh shell detection${NC}"

# Test with /bin/zsh
result=$(run_shell_detection "/bin/zsh")
SHELL_CONFIG=$(echo "$result" | cut -d'|' -f1)
SHELL_NAME=$(echo "$result" | cut -d'|' -f2)

print_result "zsh: SHELL_CONFIG should be ~/.zshrc" "$HOME/.zshrc" "$SHELL_CONFIG"
print_result "zsh: SHELL_NAME should be 'zsh'" "zsh" "$SHELL_NAME"

# Test with /usr/local/bin/zsh
result=$(run_shell_detection "/usr/local/bin/zsh")
SHELL_CONFIG=$(echo "$result" | cut -d'|' -f1)
SHELL_NAME=$(echo "$result" | cut -d'|' -f2)

print_result "zsh (custom path): SHELL_CONFIG should be ~/.zshrc" "$HOME/.zshrc" "$SHELL_CONFIG"
print_result "zsh (custom path): SHELL_NAME should be 'zsh'" "zsh" "$SHELL_NAME"

# ============================================
# Test 2: bash shell detection
# ============================================
echo -e "\n${YELLOW}Test 2: bash shell detection${NC}"

# Test with /bin/bash
result=$(run_shell_detection "/bin/bash")
SHELL_CONFIG=$(echo "$result" | cut -d'|' -f1)
SHELL_NAME=$(echo "$result" | cut -d'|' -f2)

print_result "bash: SHELL_CONFIG should be ~/.bashrc" "$HOME/.bashrc" "$SHELL_CONFIG"
print_result "bash: SHELL_NAME should be 'bash'" "bash" "$SHELL_NAME"

# Test with /usr/local/bin/bash
result=$(run_shell_detection "/usr/local/bin/bash")
SHELL_CONFIG=$(echo "$result" | cut -d'|' -f1)
SHELL_NAME=$(echo "$result" | cut -d'|' -f2)

print_result "bash (custom path): SHELL_CONFIG should be ~/.bashrc" "$HOME/.bashrc" "$SHELL_CONFIG"
print_result "bash (custom path): SHELL_NAME should be 'bash'" "bash" "$SHELL_NAME"

# ============================================
# Test 3: unrecognized shell (else branch)
# ============================================
echo -e "\n${YELLOW}Test 3: unrecognized shell (else branch)${NC}"

# Test with /bin/fish
result=$(run_shell_detection "/bin/fish")
SHELL_CONFIG=$(echo "$result" | cut -d'|' -f1)
SHELL_NAME=$(echo "$result" | cut -d'|' -f2)

print_result "fish: SHELL_CONFIG should default to ~/.zshrc" "$HOME/.zshrc" "$SHELL_CONFIG"
print_result "fish: SHELL_NAME should default to 'zsh'" "zsh" "$SHELL_NAME"

# Test with /usr/bin/ksh
result=$(run_shell_detection "/usr/bin/ksh")
SHELL_CONFIG=$(echo "$result" | cut -d'|' -f1)
SHELL_NAME=$(echo "$result" | cut -d'|' -f2)

print_result "ksh: SHELL_CONFIG should default to ~/.zshrc" "$HOME/.zshrc" "$SHELL_CONFIG"
print_result "ksh: SHELL_NAME should default to 'zsh'" "zsh" "$SHELL_NAME"

# Test with /bin/tcsh
result=$(run_shell_detection "/bin/tcsh")
SHELL_CONFIG=$(echo "$result" | cut -d'|' -f1)
SHELL_NAME=$(echo "$result" | cut -d'|' -f2)

print_result "tcsh: SHELL_CONFIG should default to ~/.zshrc" "$HOME/.zshrc" "$SHELL_CONFIG"
print_result "tcsh: SHELL_NAME should default to 'zsh'" "zsh" "$SHELL_NAME"

# Test with completely unknown shell
result=$(run_shell_detection "/opt/unknown/myshell")
SHELL_CONFIG=$(echo "$result" | cut -d'|' -f1)
SHELL_NAME=$(echo "$result" | cut -d'|' -f2)

print_result "unknown: SHELL_CONFIG should default to ~/.zshrc" "$HOME/.zshrc" "$SHELL_CONFIG"
print_result "unknown: SHELL_NAME should default to 'zsh'" "zsh" "$SHELL_NAME"

# ============================================
# Summary
# ============================================
echo -e "\n${YELLOW}========================================${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "Tests run:    $TESTS_RUN"
echo -e "${GREEN}Tests passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Tests failed: $TESTS_FAILED${NC}"
else
    echo -e "${GREEN}Tests failed: $TESTS_FAILED${NC}"
fi

# Exit with appropriate code
if [ $TESTS_FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
