# Troubleshooting: Not Seeing New Event Card Changes

## ✅ Code is Deployed
The new event card layout code is committed and pushed. If you're not seeing changes, try these steps:

## 🔄 Step 1: Restart Dev Server

Stop your current dev server (Ctrl+C) and restart it:

```bash
npm run dev
```

## 🌐 Step 2: Hard Refresh Browser

Clear browser cache and do a hard refresh:

- **Chrome/Edge:** `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox:** `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- **Safari:** `Cmd+Option+R`

Or open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

## 🔍 Step 3: Check What Should Be Visible

The new layout includes:

1. **Top Tags** (should show if fields exist):
   - "Flexible" tag (sessionFrequency)
   - "In-Person" tag (sessionMode)
   - These should appear on ALL events (we migrated with defaults)

2. **Vibes Pills** (only shows if vibes array has values):
   - Currently empty `[]` after migration
   - Won't show until vibes are added to events

3. **Host Badge** (only shows for qualified hosts):
   - "Grounded Host" badge
   - Only shows if host has 4+ rating AND 3+ reviews

4. **Description** (only shows if description exists):
   - Event description text
   - Line-clamped to 2 lines

5. **Circle Continuity** (calculated from dates):
   - "Starting Soon" or "Ongoing (X weeks)"
   - Only shows if event has startDate or date field

6. **Updated Engagement**:
   - "X / Y Members Joined · Z Spots Available"
   - Updated location display

## 🧪 Step 4: Verify in Browser Console

Open browser DevTools (F12) → Console tab, and check:

```javascript
// Check if an event has the new fields
// In the console, find an event object and check:
event.sessionFrequency  // Should be "Flexible"
event.sessionMode       // Should be "In-Person"
event.vibes            // Should be [] (empty array)
event.country          // Should be "Canada"
```

## 🐛 Step 5: Check for Errors

Look in the browser console for any import errors:
- `Cannot find module './VibePill'`
- `Cannot find module '../../utils/eventHelpers'`
- Any TypeScript/import errors

## 📦 Step 6: Rebuild if Needed

If still not working, try a clean rebuild:

```bash
# Clear node_modules and reinstall (if needed)
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
npm run dev
```

## 🎯 Expected Visual Changes

You should see:
- **Small rounded tags** at the top of each card (above title)
- **Title moved down** slightly
- **Host section** with larger avatar (7x7 instead of 6x6)
- **Description text** below host (if description exists)
- **Orange badge** for continuity ("Starting Soon" or "Ongoing")
- **Updated member count** text format

## ❓ Still Not Working?

If you still don't see changes after:
1. Restarting dev server
2. Hard refreshing browser
3. Checking console for errors

Then check:
- Are you looking at the right page? (LandingPage uses EventCard)
- Are events loading from Firestore? (check Network tab)
- Do events have the new fields? (check in Firebase Console)

---

**Note:** The Filter Drawer is only visible when using `EventFeed` component. The LandingPage uses `EventCard` directly, so filters won't show there. Filters will appear on the Feed/Explore page if that uses `EventFeed`.

