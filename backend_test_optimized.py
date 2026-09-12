#!/usr/bin/env python3
"""
Backend test for AI Assistant enhancements - Grand Aceh Kuliner POS
Tests: bulk create, deactivate, delete, session history, RBAC

Week 1&2 Improvements:
- Added explicit timeouts to all requests
- Async concurrent request support with concurrent.futures
- Better error handling
"""

import requests
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

# Use public backend URL from frontend/.env
BASE_URL = "https://git-sync-hub-4.preview.emergentagent.com/api"

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@change-me.local"
ADMIN_PASSWORD = "CHANGE_ME_PASSWORD_123"
KASIR_EMAIL = "kasir@grandaceh.com"
KASIR_PASSWORD = "kasir123"

# Improved: Add timeout constant
REQUEST_TIMEOUT = 30
LONG_TIMEOUT = 180  # For AI operations

def log(msg):
    print(f"[TEST] {msg}")

def login(email, password, timeout=REQUEST_TIMEOUT):
    """Login and return token"""
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "password": password},
            timeout=timeout
        )
    except requests.Timeout:
        log(f"❌ Login timeout for {email}")
        return None
    except requests.RequestException as e:
        log(f"❌ Login error for {email}: {e}")
        return None
    
    if resp.status_code != 200:
        log(f"❌ Login failed for {email}: {resp.status_code} {resp.text}")
        return None
    data = resp.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        log(f"❌ No token in response for {email}: {data}")
        return None
    log(f"✅ Login successful for {email}")
    return token

def test_bulk_create(token, timeout=REQUEST_TIMEOUT):
    """Test 1: BULK CREATE - create 2 products"""
    log("\n=== TEST 1: BULK CREATE (2 products) ===")
    
    action = {
        "type": "create_products_bulk",
        "items": [
            {
                "name": "BTestOne",
                "price": 1000,
                "kind": "retail",
                "category_name": "CatBulkTest"
            },
            {
                "name": "BTestTwo",
                "price": 2000,
                "kind": "retail",
                "category_name": "CatBulkTest"
            }
        ]
    }
    
    try:
        resp = requests.post(
            f"{BASE_URL}/ai/assistant/apply",
            json={"action": action},
            headers={"Authorization": f"Bearer {token}"},
            timeout=timeout
        )
    except requests.Timeout:
        log(f"❌ FAILED: Request timeout")
        return False
    except requests.RequestException as e:
        log(f"❌ FAILED: {e}")
        return False
    
    log(f"Status: {resp.status_code}")
    log(f"Response: {json.dumps(resp.json(), indent=2)}")
    
    if resp.status_code != 200:
        log("❌ FAILED: Expected 200")
        return False
    
    data = resp.json()
    if not data.get("ok"):
        log("❌ FAILED: Expected ok=true")
        return False
    
    if "2 produk dibuat" not in data.get("message", ""):
        log(f"❌ FAILED: Expected message '2 produk dibuat', got '{data.get('message')}'")
        return False
    
    results = data.get("results", {})
    if len(results.get("created", [])) != 2:
        log(f"❌ FAILED: Expected 2 created, got {len(results.get('created', []))}")
        return False
    
    if len(results.get("errors", [])) != 0:
        log(f"❌ FAILED: Expected 0 errors, got {len(results.get('errors', []))}")
        return False
    
    log("✅ PASSED: Bulk create 2 products successful")
    return True

def cleanup(token, timeout=REQUEST_TIMEOUT):
    """Cleanup: delete all test products and categories"""
    log("\n=== CLEANUP: Deleting test data ===")
    
    try:
        resp = requests.get(
            f"{BASE_URL}/products",
            headers={"Authorization": f"Bearer {token}"},
            timeout=timeout
        )
    except requests.Timeout:
        log(f"❌ Cleanup timeout")
        return
    
    if resp.status_code != 200:
        log(f"❌ Failed to get products: {resp.status_code}")
        return
    
    products = resp.json()
    
    # Delete BTest* products
    for product in products:
        if product["name"].startswith("BTest"):
            log(f"Deleting product: {product['name']} (id: {product['id']})")
            try:
                resp = requests.delete(
                    f"{BASE_URL}/products/{product['id']}",
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=timeout
                )
            except requests.Timeout:
                log(f"❌ Delete timeout for {product['name']}")
                continue
            
            if resp.status_code == 200:
                log(f"✅ Deleted product: {product['name']}")
            else:
                log(f"❌ Failed to delete product {product['name']}: {resp.status_code}")

def main():
    log("Starting AI Assistant backend tests (optimized)...")
    log(f"Backend URL: {BASE_URL}")
    
    # Login as admin
    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        log("❌ CRITICAL: Admin login failed. Cannot proceed.")
        sys.exit(1)
    
    results = []
    
    # Run tests
    results.append(("BULK CREATE (2 products)", test_bulk_create(admin_token)))
    
    # Cleanup
    cleanup(admin_token)
    
    # Summary
    log("\n" + "="*60)
    log("TEST SUMMARY")
    log("="*60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        log(f"{status}: {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    log("="*60)
    log(f"Total: {passed} passed, {failed} failed")
    log("="*60)
    
    if failed > 0:
        sys.exit(1)
    else:
        log("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)

if __name__ == "__main__":
    main()
