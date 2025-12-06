# Category Migration Summary

## Overview
Successfully migrated from old category system (Social, Shopping, Experiences, Gatherings) to new 4-pillar mainCategory system (Curated Sales, Connect & Promote, Mobilize & Support, Learn & Grow).

## Changes Implemented

### 1. Category Mapping System (`utils/categoryMapper.ts`)
- ✅ Added `mapOldCategoryToMainCategory()` function
- ✅ Added `getMainCategoryFromEvent()` for backward compatibility
- ✅ Added `getMainCategoryLabelFromEvent()` for display labels
- ✅ Updated `MainCategory` type to use new format:
  - `connectAndPromote` (was `connectPromote`)
  - `mobilizeAndSupport` (was `mobilizeSupport`)
  - `curatedSales` (unchanged)
  - `learnAndGrow` (unchanged)

**Mapping Rules:**
- `social` → `connectAndPromote`
- `experiences` → `learnAndGrow`
- `shopping` → `curatedSales`
- `gatherings` → `mobilizeAndSupport`
- (no category) → `connectAndPromote` (default)

### 2. Event Card Display (`components/events/EventCard.tsx`)
- ✅ Updated to use `getMainCategoryLabelFromEvent()` helper
- ✅ Automatically handles backward compatibility
- ✅ Maintains exact same orange pill styling (#e35e25)
- ✅ No layout changes

### 3. Event Creation Form (`pages/CreateEventPage.tsx`)
- ✅ Updated mainCategory options to use new format:
  - `curatedSales`
  - `connectAndPromote`
  - `mobilizeAndSupport`
  - `learnAndGrow`

### 4. Type Definitions
- ✅ Updated `firebase/types.ts` - FirestoreEvent interface
- ✅ Updated `types.ts` - Event interface
- ✅ Both now use new category format in comments

### 5. Firestore Database (`firebase/db.ts`)
- ✅ Already handles mainCategory in `createEvent()` function
- ✅ Already maps mainCategory in `mapFirestoreEventToEvent()` function
- ✅ No changes needed

### 6. Migration Script (`scripts/migrateMainCategory.ts`)
- ✅ Created migration script to populate mainCategory for existing events
- ✅ Maps old category values to new system
- ✅ Skips events that already have valid mainCategory
- ✅ Processes in batches of 500 (Firestore limit)
- ✅ Provides detailed statistics

## Backward Compatibility

All existing events will continue to work:
- Events with old `category` field are automatically mapped to `mainCategory`
- Events with old `mainCategory` format (`connectPromote`, `mobilizeSupport`) are handled
- Events with no category default to `connectAndPromote`
- Event cards display correctly for all events

## Filters

**Note:** Current filters still use the old `category` field. This is intentional for backward compatibility:
- `filterByCategory()` in `eventStore.ts` uses `categoryMatches()` which compares `event.category`
- Landing page filters use old category system
- These will continue to work, but may need updating in the future to filter by `mainCategory` instead

## Migration Instructions

To run the migration script:

1. **Set up Firebase Admin SDK credentials:**
   ```bash
   # Option 1: Place service account key in project root
   # Download from Firebase Console > Project Settings > Service Accounts
   # Save as: firebase-service-account.json
   
   # Option 2: Use environment variable
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
   ```

2. **Run the migration:**
   ```bash
   npx tsx scripts/migrateMainCategory.ts
   ```

3. **Verify the migration:**
   - Check console output for statistics
   - Verify events in Firestore have `mainCategory` field populated
   - Test event cards display correctly

## Firestore Schema

**New Field:**
- `mainCategory`: string (optional)
  - Values: `"curatedSales"` | `"connectAndPromote"` | `"mobilizeAndSupport"` | `"learnAndGrow"`

**Old Field (kept for backward compatibility):**
- `category`: string (still exists, but new events should use mainCategory)

## Firestore Rules & Indexes

**No changes required:**
- ✅ No new indexes needed (mainCategory is not used in queries yet)
- ✅ No security rules changes needed
- ✅ Existing queries continue to work

## Testing Checklist

- [x] Event cards display new category labels correctly
- [x] Backward compatibility works (old events show correct labels)
- [x] Event creation form uses new categories
- [x] Type definitions updated
- [x] Migration script created
- [ ] Migration script tested (run manually)
- [ ] All existing events have mainCategory populated (after migration)

## Next Steps (Optional)

1. **Update Filters (Future):** Consider updating filters to use `mainCategory` instead of `category`
2. **Remove Old Category Field (Future):** After confirming all events have `mainCategory`, consider removing `category` field
3. **Update Landing Page Categories:** Consider updating landing page category filters to use new 4-pillar system

## Files Modified

1. `utils/categoryMapper.ts` - Added mapping functions
2. `components/events/EventCard.tsx` - Updated to use new helper
3. `pages/CreateEventPage.tsx` - Updated category options
4. `firebase/types.ts` - Updated type comments
5. `types.ts` - Updated type comments
6. `scripts/migrateMainCategory.ts` - New migration script

## Files NOT Modified (but verified)

- `firebase/db.ts` - Already handles mainCategory correctly
- `stores/eventStore.ts` - Filters still use old category (intentional)
- `pages/LandingPage.tsx` - Filters still use old category (intentional)

