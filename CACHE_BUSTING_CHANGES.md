# 🔄 Cache-Busting Changes for Fresh Deployment

**Date:** Force complete rebuild to ensure diagnostic logs appear in production  
**Issue:** Deployed build serving old compiled JS, diagnostic logs not appearing  
**Status:** Cache-busting mechanisms added

---

## 📋 Changes Made

### 1. ✅ Vite Config - Build ID Force

**File:** `vite.config.ts`

**Changes:**
- Added `BUILD_ID_FORCE` environment variable with unique timestamp-based ID
- Added `__BUILD_ID__` export to invalidate Vercel cache
- Modified build output to include unique hash in filenames:
  - `entryFileNames: assets/[name]-{BUILD_ID_FORCE}.js`
  - `chunkFileNames: assets/[name]-{BUILD_ID_FORCE}.js`
  - `assetFileNames: assets/[name]-{BUILD_ID_FORCE}.[ext]`
- Added `emptyOutDir: true` to force clean build

**Impact:** Every build will generate new filenames, forcing browser to fetch fresh bundles.

---

### 2. ✅ Package.json - Clean Build Script

**File:** `package.json`

**Changes:**
- Modified `build` script to include `BUILD_ID_FORCE` and `--force` flag
- Added `build:clean` script that removes `dist/` folder before building

**New Scripts:**
```json
"build": "BUILD_ID_FORCE=force-rebuild-$(date +%s)-$(openssl rand -hex 4) vite build --force",
"build:clean": "rm -rf dist && BUILD_ID_FORCE=force-rebuild-$(date +%s)-$(openssl rand -hex 4) vite build --force"
```

**Impact:** Builds will always generate unique IDs and force Vite to rebuild everything.

---

### 3. ✅ Index.html - Cache-Busting Query Param

**File:** `index.html`

**Changes:**
- Added `?v=debug123` query parameter to main script import:
  ```html
  <script type="module" src="/src/main.tsx?v=debug123"></script>
  ```

**Impact:** Browser will treat this as a new resource, bypassing cache.

---

### 4. ✅ Vercel.json - No-Cache Headers

**File:** `vercel.json`

**Changes:**
- Added cache-control headers to all routes:
  - `Cache-Control: no-cache, no-store, must-revalidate`
  - `Pragma: no-cache`
  - `Expires: 0`
- Added cache-control headers to `/assets/*` routes

**Impact:** Vercel will serve files with no-cache headers, preventing browser caching.

---

### 5. ✅ Main.tsx - Boot Log Enhancement

**File:** `src/main.tsx`

**Changes:**
- Enhanced boot log with build ID and timestamp:
  ```typescript
  console.log('[BOOT] main.tsx loading', { buildId: 'debug123', timestamp: new Date().toISOString() });
  ```

**Impact:** Confirms module is loading with fresh build.

---

### 6. ✅ Service Worker Check

**Result:** ✅ **NO SERVICE WORKERS FOUND**
- Searched for: `sw.js`, `service-worker.js`, `next-pwa`, `workbox`
- No service worker registration found
- No service worker files found

**Impact:** No service worker caching to disable.

---

## 🚀 Deployment Steps

### Step 1: Clean Local Build (Optional)
```bash
npm run build:clean
```

### Step 2: Standard Build
```bash
npm run build
```

### Step 3: Commit and Push
```bash
git add .
git commit -m "Force cache-busting rebuild for diagnostic logs"
git push
```

### Step 4: Vercel Deployment
- Vercel will automatically detect the push
- Build will run with `BUILD_ID_FORCE` environment variable
- New bundle filenames will be generated
- No-cache headers will be applied

---

## 🔍 Verification

After deployment, verify:

1. **Check Browser Console:**
   - Should see `[BOOT] main.tsx loading` with buildId and timestamp
   - Should see `[BOOT] GroupChat.tsx loaded at runtime`
   - Should see all `[DIAGNOSTIC]` logs

2. **Check Network Tab:**
   - Script files should have new filenames with unique hash
   - Response headers should include `Cache-Control: no-cache`
   - Files should not be served from cache (check "Size" column)

3. **Check Diagnostic Logs:**
   - All `[DIAGNOSTIC]` logs should appear in console
   - Logs should show complete pipeline flow

---

## 📊 Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `vite.config.ts` | Added BUILD_ID_FORCE, unique filenames | Force new bundle generation |
| `package.json` | Modified build script with --force | Force clean build |
| `index.html` | Added ?v=debug123 query param | Bypass browser cache |
| `vercel.json` | Added no-cache headers | Prevent Vercel caching |
| `src/main.tsx` | Enhanced boot log | Verify fresh module load |

---

## ⚠️ Important Notes

1. **Temporary Changes:**
   - These cache-busting mechanisms are temporary
   - After confirming diagnostic logs work, you may want to:
     - Remove `?v=debug123` from index.html
     - Adjust cache headers in vercel.json for production
     - Keep BUILD_ID_FORCE for future deployments

2. **Build Performance:**
   - `--force` flag may slow down builds slightly
   - This is acceptable for ensuring fresh deployments

3. **Vercel Cache:**
   - Vercel may still cache some assets
   - The unique filenames and no-cache headers should prevent this
   - If issues persist, consider Vercel's "Redeploy" with "Clear Cache" option

---

## ✅ Expected Result

After deployment:
- ✅ Fresh JS bundles with diagnostic logs
- ✅ All `[DIAGNOSTIC]` logs visible in production console
- ✅ No cached old bundles being served
- ✅ Complete pipeline tracing working

**Status:** ✅ **READY FOR DEPLOYMENT**

