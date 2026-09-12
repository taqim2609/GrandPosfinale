# Potential Performance Issues - Grand Aceh Kuliner POS

## 🔴 Critical Issues

### 1. Inefficient Recursive Directory Scanning
**Location:** `lib.php` (lines 26-38)

```php
$it = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::LEAVES_ONLY
);
```

**Problem:**
- Scans entire project folder recursively on every request to `files.php`
- No caching mechanism for file list
- Repeated filesystem traversals impact performance

**Impact:** Slow page loads, especially with large projects

**Solution:**
- Implement caching with 1-hour TTL using Redis or file-based cache
- Regenerate cache only on file updates
- Add cache invalidation on deployment

---

### 2. Unoptimized File List Grouping & Sorting
**Location:** `files.php` (lines 21-49)

```php
foreach ($entries as $e) { $groups[$g][] = $e; }  // Group by top-level dir
ksort($groups);                                     // Sort groups
foreach ($groups as $g => $rows) {
    usort($rows, function ($a, $b) { ... });      // Re-sort each group
}
usort($order, function ($a, $b) { ... });         // Sort order again
```

**Problem:**
- Multiple nested sort operations on potentially thousands of files
- O(n log n) complexity executed multiple times per request
- No pre-computation or caching

**Impact:** 
- Slow server response times with large file lists
- CPU overhead for sorting operations

**Solution:**
- Cache pre-sorted results
- Use database to store file metadata with proper indexing
- Implement incremental updates instead of full re-sort

---

### 3. No Pagination/Lazy Loading for File Lists
**Location:** `files.php` (entire page)

**Problem:**
- All files loaded and rendered in HTML upfront
- No limit on number of files displayed
- Large DOM causes browser slowdown

**Impact:**
- Huge memory footprint
- Slow client-side rendering
- Poor user experience with 1000+ files

**Solution:**
- Implement server-side pagination (limit/offset)
- Add lazy loading with infinite scroll
- Use virtual scrolling on frontend
- Show file count with "Load More" button

---

### 4. Synchronous Blocking File Streaming
**Location:** `lib.php` (lines 120-135)

```php
while (!feof($fp)) {
    $chunk = fread($fp, 262144);  // 256 KB chunks
    echo $chunk;
}
```

**Problem:**
- Blocking I/O operation ties up server process
- Large file downloads block concurrent requests
- No async streaming support

**Impact:**
- Server performance degrades with multiple simultaneous downloads
- Slower response times for other users

**Solution:**
- Use async file streaming if available
- Implement response compression (gzip)
- Add rate limiting for large downloads
- Use CDN for file distribution

---

## 🟡 Medium Priority Issues

### 5. Redundant String Operations in Frontend Search
**Location:** `files.php` (lines 216-223)

```javascript
for (var i = 0; i < rows.length; i++) {
    var ok = s === '' || rows[i].getAttribute('data-p').indexOf(s) !== -1;
    rows[i].style.display = ok ? '' : 'none';
}
```

**Problem:**
- O(n) DOM traversal on every keystroke
- No debouncing for search input
- Linear string matching is inefficient

**Impact:**
- UI jank with large file lists (1000+ rows)
- High CPU usage during searching

**Solution:**
- Add 300-500ms debounce to search input
- Implement client-side indexing or use search library
- Use CSS filters instead of DOM manipulation
- Optimize data-p attributes or use data structures

---

### 6. Repeated JSON Parsing on Every Request
**Location:** `files.php` (lines 13-19)

```php
$j = json_decode((string) file_get_contents($vj), true);
```

**Problem:**
- File read + decode happens on every page load
- No caching mechanism
- Unnecessary filesystem access

**Impact:**
- Repeated I/O operations
- Minor but cumulative performance degradation

**Solution:**
- Cache parsed JSON in PHP opcache
- Add conditional ETags for version.json
- Store version in database or memory cache
- Only re-read on file modification

---

### 7. Sequential HTTP Requests in Backend Tests
**Location:** `backend_test.py` (multiple test functions)

```python
# Example: Lines 93-94, 187-188, 234-235
resp = requests.get(f"{BASE_URL}/products", headers={"Authorization": f"Bearer {token}"})
products = resp.json()
# ... then immediately make another request
resp = requests.get(f"{BASE_URL}/categories", ...)
```

**Problem:**
- Tests make sequential HTTP requests
- No parallelization or concurrent requests
- Blocking I/O in test suite

**Impact:**
- Test suite runs 2-3× slower than necessary
- Slow feedback loop during development

**Solution:**
- Use `asyncio` for async HTTP requests
- Implement `concurrent.futures` for parallel test execution
- Use connection pooling
- Consider pytest-asyncio or httpx for async tests

---

### 8. Missing Request Timeouts
**Location:** `backend_test.py` (various test functions)

**Problem:**
- Some requests lack explicit timeout parameters
- Can hang indefinitely if backend is slow/unavailable

**Solution:**
- Add explicit `timeout=30` to all HTTP requests
- Implement circuit breaker pattern for fault tolerance
- Add retry logic with exponential backoff

---

## 🟢 Low Priority Issues

### 9. Unoptimized MIME Type Lookup
**Location:** `lib.php` (lines 71-95)

```php
$map = array(
    'php' => 'text/plain; charset=utf-8',
    'py' => 'text/plain; charset=utf-8',
    // ... 20+ entries
);
```

**Problem:**
- Large array lookup for every file served
- Not critical but could be optimized

**Solution:**
- Use smaller constant map or built-in mime functions
- Cache results if called frequently

---

### 10. No Error Handling for Large Uploads
**Location:** Various PHP files

**Problem:**
- No checks for memory limits or upload size
- No streaming parser for large files

**Solution:**
- Add upload size validation
- Implement chunked upload handling
- Monitor memory usage

---

## Summary Table

| Priority | Issue | Impact | Quick Fix Difficulty |
|----------|-------|--------|----------------------|
| 🔴 Critical | File list caching | High latency | Easy |
| 🔴 Critical | Pagination | Memory/DOM bloat | Medium |
| 🔴 Critical | Sorting optimization | CPU overhead | Medium |
| 🔴 Critical | Async file streaming | Concurrency issue | Hard |
| 🟡 Medium | Search debounce | UI jank | Easy |
| 🟡 Medium | JSON caching | Minor latency | Easy |
| 🟡 Medium | Async tests | Slow feedback | Medium |
| 🟡 Medium | Request timeouts | Hangs | Easy |
| 🟢 Low | MIME optimization | Negligible | Easy |
| 🟢 Low | Upload handling | Edge case | Medium |

---

## Recommendations for Immediate Action

1. **Week 1 (Quick Wins)**
   - Add file list caching with 1-hour TTL
   - Implement pagination (20 files per page)
   - Add search debounce (300ms)
   - Add timeouts to all HTTP requests

2. **Week 2-3 (Medium Effort)**
   - Optimize sorting algorithm
   - Implement lazy loading on frontend
   - Add async test execution
   - Cache version.json with ETags

3. **Month 2+ (Long Term)**
   - Consider database for file metadata
   - Implement CDN for file distribution
   - Add async file streaming
   - Full performance monitoring and profiling

---

Generated: 2026-09-12
Repository: taqim2609/GrandPosfinale
Language Composition: JavaScript (59.3%), Python (35.1%), Shell (2.8%), HTML (0.8%), PHP (0.7%), Java (0.6%), Other (0.7%)
