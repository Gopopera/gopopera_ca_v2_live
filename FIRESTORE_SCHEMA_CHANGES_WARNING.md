# ⚠️ FIRESTORE SCHEMA CHANGES REQUIRED

## Critical Warning
Before applying the event creation system updates, the following Firestore schema changes are required:

## New Fields to Add

### 1. `mainCategory` (string)
- **Values**: `"curatedSales"` | `"connectPromote"` | `"mobilizeSupport"` | `"learnGrow"`
- **Note**: This replaces the old `category` field, but we'll keep `category` for backward compatibility during migration
- **Required**: Yes (for new events)

### 2. `vibes` (array of strings)
- **Values**: Array of vibe strings from the updated list
- **Replaces**: Old `tags` field (but keep `tags` for backward compatibility)
- **Required**: Yes (at least 1 vibe for new events)

### 3. `sessionMode` (string)
- **Values**: `"inPerson"` | `"remote"`
- **Note**: Old values may be `"in-person"` - needs migration
- **Required**: Yes

### 4. `sessionFrequency` (string)
- **Values**: `"weekly"` | `"monthly"` | `"oneTime"`
- **Note**: Old values may be `"one-time"` or `"flexible"` - needs migration
- **Required**: Yes

### 5. `groupSize` (object)
- **Structure**: `{ min: number, max: number }`
- **Replaces**: Old `capacity` field (numeric)
- **Mapping**:
  - Tiny Circles (2-5): `{ min: 2, max: 5 }`
  - Small Circles (5-10): `{ min: 5, max: 10 }`
  - Larger Circles (10+): `{ min: 10, max: 999 }` (or unlimited)
- **Required**: Yes

### 6. `repeatDay` (string, optional)
- **Values**: Day name (e.g., "Monday", "Tuesday")
- **Used for**: Weekly and monthly sessions
- **Required**: Only if `sessionFrequency` is "weekly" or "monthly"

### 7. `repeatTime` (string, optional)
- **Values**: 24-hour format (e.g., "14:30")
- **Used for**: Weekly and monthly sessions
- **Required**: Only if `sessionFrequency` is "weekly" or "monthly"

### 8. `circleContinuity` (string)
- **Values**: `"startingSoon"` | `"ongoing"`
- **Note**: Auto-calculated by system, not user input
- **Required**: Yes (system-generated)

## Fields to Deprecate (Keep for Backward Compatibility)

### 1. `category` (string)
- **Status**: Deprecated but kept for migration
- **Action**: Map old values to new `mainCategory`:
  - "Social" → "connectPromote"
  - "Shopping" → "curatedSales"
  - "Experiences" → "learnGrow"
  - "Gatherings" → "mobilizeSupport"
  - Others → "connectPromote" (default)

### 2. `tags` (array)
- **Status**: Deprecated but kept for migration
- **Action**: Migrate to `vibes` array

### 3. `capacity` (number)
- **Status**: Deprecated but kept for migration
- **Action**: Convert to `groupSize: { min: X, max: Y }` based on value ranges

## Migration Required

### Existing Events Need:
1. **mainCategory**: Populate from old `category` field using mapping
2. **vibes**: Copy from `tags` array (if exists)
3. **sessionMode**: Convert `"in-person"` → `"inPerson"`
4. **sessionFrequency**: Convert `"one-time"` → `"oneTime"`, remove `"flexible"`
5. **groupSize**: Calculate from `capacity`:
   - capacity <= 5 → `{ min: 2, max: 5 }`
   - capacity <= 10 → `{ min: 5, max: 10 }`
   - capacity > 10 → `{ min: 10, max: capacity }`
6. **circleContinuity**: Calculate based on:
   - If `sessionFrequency === "oneTime"` → `"startingSoon"`
   - If `sessionFrequency === "weekly" || "monthly"`:
     - If `startDateTime` is in future → `"startingSoon"`
     - If `startDateTime` is in past and has open spots → `"ongoing"`

## Breaking Changes

### Filter Queries
- Filters using old `category` field will need to be updated to use `mainCategory`
- Filters using old `tags` will need to use `vibes`
- Filters checking for `"flexible"` frequency will break (field removed)

### Display Logic
- Event cards displaying old category values will show incorrect labels
- Components expecting `"in-person"` will need to handle `"inPerson"`

## Migration Script Required

A migration script should:
1. Read all events from Firestore
2. Map old fields to new fields
3. Calculate `circleContinuity` for each event
4. Update documents in batches (500 at a time)
5. Keep old fields for backward compatibility during transition

## Next Steps

1. ✅ Review this migration plan
2. ⏸️ **PAUSE** - Wait for approval before proceeding
3. Create migration script
4. Test migration on staging/dev database first
5. Run migration on production
6. Update frontend code to use new fields
7. Monitor for any issues
8. Remove old fields after confirming all systems work (future step)

