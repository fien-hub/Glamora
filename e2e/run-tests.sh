#!/bin/bash

# ========================================
# Glamora E2E Test Runner
# ========================================
# This script helps run E2E tests easily
# ========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if Maestro is installed
check_maestro() {
    if ! command -v maestro &> /dev/null; then
        print_error "Maestro is not installed"
        print_info "Install with: curl -Ls \"https://get.maestro.mobile.dev\" | bash"
        exit 1
    fi
    print_success "Maestro is installed"
}

# Check if Expo is running
check_expo() {
    print_info "Checking if Expo is running..."
    if ! lsof -i :8081 &> /dev/null; then
        print_warning "Expo doesn't seem to be running on port 8081"
        print_info "Start Expo with: npm start"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Expo is running"
    fi
}

# Run all tests
run_all_tests() {
    print_info "Running all E2E tests..."
    maestro test e2e/flows/
    print_success "All tests completed!"
}

# Run specific test
run_test() {
    local test_file=$1
    print_info "Running test: $test_file"
    maestro test "e2e/flows/$test_file"
    print_success "Test completed!"
}

# Run tests with HTML report
run_with_report() {
    print_info "Running tests with HTML report..."
    maestro test --format html e2e/flows/
    print_success "Tests completed! Report saved to .maestro/report.html"
    
    # Open report if on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_info "Opening report..."
        open .maestro/report.html
    fi
}

# Run tests in debug mode
run_debug() {
    local test_file=$1
    print_info "Running test in debug mode: $test_file"
    maestro test --debug "e2e/flows/$test_file"
}

# Open Maestro Studio
open_studio() {
    print_info "Opening Maestro Studio..."
    maestro studio
}

# Show menu
show_menu() {
    echo ""
    echo "========================================="
    echo "   Glamora E2E Test Runner"
    echo "========================================="
    echo ""
    echo "1) Run all tests"
    echo "2) Run authentication flow test"
    echo "3) Run booking flow test"
    echo "4) Run provider flow test"
    echo "5) Run search flow test"
    echo "6) Run all tests with HTML report"
    echo "7) Run test in debug mode"
    echo "8) Open Maestro Studio"
    echo "9) Exit"
    echo ""
}

# Main script
main() {
    # Check prerequisites
    check_maestro
    check_expo
    
    # Show menu
    while true; do
        show_menu
        read -p "Select an option (1-9): " choice
        
        case $choice in
            1)
                run_all_tests
                ;;
            2)
                run_test "01-auth-flow.yaml"
                ;;
            3)
                run_test "02-booking-flow.yaml"
                ;;
            4)
                run_test "03-provider-flow.yaml"
                ;;
            5)
                run_test "04-search-flow.yaml"
                ;;
            6)
                run_with_report
                ;;
            7)
                echo ""
                echo "Available tests:"
                echo "1) 01-auth-flow.yaml"
                echo "2) 02-booking-flow.yaml"
                echo "3) 03-provider-flow.yaml"
                echo "4) 04-search-flow.yaml"
                read -p "Select test to debug (1-4): " test_choice
                case $test_choice in
                    1) run_debug "01-auth-flow.yaml" ;;
                    2) run_debug "02-booking-flow.yaml" ;;
                    3) run_debug "03-provider-flow.yaml" ;;
                    4) run_debug "04-search-flow.yaml" ;;
                    *) print_error "Invalid choice" ;;
                esac
                ;;
            8)
                open_studio
                ;;
            9)
                print_info "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-9."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main

