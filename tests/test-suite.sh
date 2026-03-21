#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="http://localhost:3000"
TEST_RESULTS_DIR="./test-results"
CONTAINER_NAME="website-app-1"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

echo "========================================="
echo "  Scarborough Glen HOA Portal - Test Suite"
echo "========================================="
echo ""

# Test 1: Check if container is running
log_info "Test 1: Checking if Docker container is running..."
if docker ps | grep -q "$CONTAINER_NAME"; then
    log_success "Container is running"
else
    log_error "Container is not running"
    exit 1
fi

# Test 2: Check homepage
log_info "Test 2: Testing homepage..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
if [ "$HTTP_CODE" = "200" ]; then
    log_success "Homepage returns 200 OK"
else
    log_error "Homepage returned $HTTP_CODE"
fi

# Test 3: Check if homepage contains expected content
log_info "Test 3: Verifying homepage content..."
HOMEPAGE=$(curl -s "$BASE_URL/")
if echo "$HOMEPAGE" | grep -q "Scarborough Glen"; then
    log_success "Homepage contains 'Scarborough Glen'"
else
    log_error "Homepage missing 'Scarborough Glen' text"
fi

# Test 4-7: Test user registration and login for each condo
CONDOS=("Condo1" "Condo2" "Condo3" "Condo4")
INVITE_CODES=("SG-C1-101-2024" "SG-C2-201-2024" "SG-C3-301-2024" "SG-C4-401-2024")
TEST_EMAILS=()
COOKIES=()

for i in "${!CONDOS[@]}"; do
    CONDO="${CONDOS[$i]}"
    INVITE_CODE="${INVITE_CODES[$i]}"
    TEST_EMAIL="test-${CONDO,,}@scarboroughglen.test"
    TEST_EMAILS+=("$TEST_EMAIL")

    log_info "Test $((4 + i*3)): Testing invite code verification for $CONDO..."

    # Verify invite code
    VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/verify-invite" \
        -H "Content-Type: application/json" \
        -d "{\"inviteCode\":\"$INVITE_CODE\"}")

    if echo "$VERIFY_RESPONSE" | grep -q '"condo"'; then
        log_success "Invite code $INVITE_CODE verified successfully"
    else
        log_error "Invite code verification failed for $INVITE_CODE"
        continue
    fi

    log_info "Test $((5 + i*3)): Registering user for $CONDO..."

    # Register user
    REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"inviteCode\":\"$INVITE_CODE\",\"email\":\"$TEST_EMAIL\"}")

    if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
        log_success "User registered successfully for $CONDO"
    else
        log_warning "User might already be registered for $CONDO (this is OK)"
    fi

    log_info "Test $((6 + i*3)): Extracting magic link for $CONDO..."

    # Request magic link
    curl -s -X POST "$BASE_URL/api/auth/request-link" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\"}" > /dev/null

    # Extract magic link from container logs
    sleep 1
    MAGIC_LINK=$(docker logs "$CONTAINER_NAME" 2>&1 | grep "Magic link for $TEST_EMAIL" | tail -1 | sed 's/.*http/http/' | tr -d '\r\n')

    if [ -n "$MAGIC_LINK" ]; then
        log_success "Magic link extracted for $CONDO"
        echo "$MAGIC_LINK" > "$TEST_RESULTS_DIR/magic-link-${CONDO,,}.txt"

        # Follow magic link and extract cookie
        COOKIE_FILE="$TEST_RESULTS_DIR/cookie-${CONDO,,}.txt"
        curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -L "$MAGIC_LINK" > "$TEST_RESULTS_DIR/login-${CONDO,,}.html"

        # Verify cookie was set
        if [ -s "$COOKIE_FILE" ] && grep -q "userId" "$COOKIE_FILE"; then
            COOKIES+=("$COOKIE_FILE")
        else
            log_error "Cookie extraction failed for $CONDO"
            COOKIES+=("")
        fi
    else
        log_error "Failed to extract magic link for $CONDO"
        COOKIES+=("")
    fi
done

# Test 16: Test dashboard access
log_info "Test 16: Testing dashboard access for Condo1..."
if [ -f "${COOKIES[0]}" ]; then
    DASHBOARD=$(curl -s -b "${COOKIES[0]}" "$BASE_URL/dashboard")
    if echo "$DASHBOARD" | grep -q "Condo1"; then
        log_success "Dashboard accessible and shows Condo1"
    else
        log_error "Dashboard access failed or wrong condo shown"
    fi
else
    log_error "No cookie file for Condo1 user"
fi

# Test 17-20: Test forum access for each condo
log_info "Test 17: Testing HOA forum access..."
if [ -f "${COOKIES[0]}" ]; then
    HOA_FORUM=$(curl -s -b "${COOKIES[0]}" "$BASE_URL/forum/hoa")
    if echo "$HOA_FORUM" | grep -q "HOA"; then
        log_success "HOA forum accessible"
    else
        log_error "HOA forum access failed"
    fi
else
    log_error "No cookie file for test user"
fi

for i in "${!CONDOS[@]}"; do
    CONDO="${CONDOS[$i]}"
    CONDO_LOWER=$(echo "$CONDO" | tr '[:upper:]' '[:lower:]')

    log_info "Test $((18 + i)): Testing $CONDO forum access..."

    if [ -f "${COOKIES[$i]}" ]; then
        CONDO_FORUM=$(curl -s -b "${COOKIES[$i]}" "$BASE_URL/forum/$CONDO_LOWER")
        if echo "$CONDO_FORUM" | grep -q "$CONDO"; then
            log_success "$CONDO forum accessible"
        else
            log_error "$CONDO forum access failed"
        fi
    else
        log_error "No cookie file for $CONDO user"
    fi
done

# Test 22: Test forum thread creation
log_info "Test 22: Testing thread creation in HOA forum..."
if [ -f "${COOKIES[0]}" ]; then
    CREATE_THREAD=$(curl -s -b "${COOKIES[0]}" -X POST "$BASE_URL/api/forum/create-thread" \
        -H "Content-Type: application/json" \
        -d '{"section":"HOA","title":"Test Thread","content":"This is a test thread created by automated tests."}')

    if echo "$CREATE_THREAD" | grep -q '"thread"'; then
        THREAD_ID=$(echo "$CREATE_THREAD" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        log_success "Thread created successfully (ID: $THREAD_ID)"
        echo "$THREAD_ID" > "$TEST_RESULTS_DIR/test-thread-id.txt"
    else
        log_error "Thread creation failed"
    fi
else
    log_error "No cookie file for test user"
fi

# Test 23: Test thread viewing
log_info "Test 23: Testing thread viewing..."
if [ -f "$TEST_RESULTS_DIR/test-thread-id.txt" ] && [ -f "${COOKIES[0]}" ]; then
    THREAD_ID=$(cat "$TEST_RESULTS_DIR/test-thread-id.txt")
    THREAD_VIEW=$(curl -s -b "${COOKIES[0]}" "$BASE_URL/api/forum/thread/$THREAD_ID")

    if echo "$THREAD_VIEW" | grep -q "Test Thread"; then
        log_success "Thread viewing works correctly"
    else
        log_error "Thread viewing failed"
    fi
else
    log_error "No thread ID or cookie available for testing"
fi

# Test 24: Test post creation (reply)
log_info "Test 24: Testing post creation (reply)..."
if [ -f "$TEST_RESULTS_DIR/test-thread-id.txt" ] && [ -f "${COOKIES[0]}" ]; then
    THREAD_ID=$(cat "$TEST_RESULTS_DIR/test-thread-id.txt")
    CREATE_POST=$(curl -s -b "${COOKIES[0]}" -X POST "$BASE_URL/api/forum/create-post" \
        -H "Content-Type: application/json" \
        -d "{\"threadId\":\"$THREAD_ID\",\"content\":\"This is a test reply.\"}")

    if echo "$CREATE_POST" | grep -q '"post"'; then
        log_success "Reply created successfully"
    else
        log_error "Reply creation failed"
    fi
else
    log_error "No thread ID or cookie available for testing"
fi

# Test 25: Test access control (Condo1 user accessing Condo2 forum)
log_info "Test 25: Testing access control (Condo1 user -> Condo2 forum)..."
if [ -f "${COOKIES[0]}" ]; then
    CONDO2_ACCESS=$(curl -s -b "${COOKIES[0]}" "$BASE_URL/forum/condo2")

    # Should redirect or show access denied
    if echo "$CONDO2_ACCESS" | grep -q "Condo2 Forum"; then
        log_error "Access control failed - Condo1 user can access Condo2 forum"
    else
        log_success "Access control working - Condo1 user cannot access Condo2 forum"
    fi
else
    log_error "No cookie file for Condo1 user"
fi

# Test 26: Test documents page
log_info "Test 26: Testing documents page access..."
if [ -f "${COOKIES[0]}" ]; then
    DOCUMENTS=$(curl -s -b "${COOKIES[0]}" "$BASE_URL/documents")
    if echo "$DOCUMENTS" | grep -q "Document Library"; then
        log_success "Documents page accessible"
    else
        log_error "Documents page access failed"
    fi
else
    log_error "No cookie file for test user"
fi

# Test 27: Test logout
log_info "Test 27: Testing logout..."
if [ -f "${COOKIES[0]}" ]; then
    LOGOUT=$(curl -s -b "${COOKIES[0]}" -X POST "$BASE_URL/api/auth/logout")
    if echo "$LOGOUT" | grep -q '"success":true'; then
        log_success "Logout successful"
    else
        log_error "Logout failed"
    fi
else
    log_error "No cookie file for test user"
fi

# Test 28: Test unauthenticated access (should redirect)
log_info "Test 28: Testing unauthenticated dashboard access..."
UNAUTH_DASHBOARD=$(curl -s -L "$BASE_URL/dashboard")
if echo "$UNAUTH_DASHBOARD" | grep -q "Login\|Resident Login"; then
    log_success "Unauthenticated access correctly redirected to login"
else
    log_error "Unauthenticated access not properly handled"
fi

# Summary
echo ""
echo "========================================="
echo "  Test Summary"
echo "========================================="
echo -e "Total Tests: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check the output above.${NC}"
    exit 1
fi
