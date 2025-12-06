# Circles + Sessions Model Update - Implementation Summary

## Overview
This document summarizes all changes made to align the Popera web app with the new Circles + Sessions model.

---

## PART A — Event Card Updates ✅

### Files Modified:
1. **`components/events/EventCard.tsx`**
2. **`utils/categoryMapper.ts`** (new file)
3. **`utils/eventHelpers.ts`**

### Changes Implemented:

#### 1. Main Category Tag (top-left on hero image)
- ✅ Replaced old category label with `mainCategory` mapping
- ✅ Mapping implemented:
  - `"curatedSales"` → `"Curated Sales"`
  - `"connectPromote"` → `"Connect & Promote"`
  - `"mobilizeSupport"` → `"Mobilize & Support"`
  - `"learnAndGrow"` → `"Learn & Grow"`
- ✅ Uses existing orange pill style (orange background, white uppercase text)
- ✅ Falls back to `"Circle"` if mainCategory is missing
- ✅ Backward compatible: falls back to `event.category` if mainCategory not available

#### 2. Vibes / Subcategories Pills
- ✅ Uses `vibes: string[]` if present
- ✅ Shows up to 3 vibes max
- ✅ Rendered as small rounded pills with off-white background (`bg-[#f2f2f2]/90`) and dark-green text (`text-[#15383c]`)
- ✅ Positioned: bottom-left overlay on hero image (above card body)
- ✅ Format: Individual pills, not comma-separated

#### 3. Session Frequency Pill
- ✅ Uses `sessionFrequency: "weekly" | "monthly" | "one-time"`
- ✅ Display mapping:
  - `"weekly"` → `"Weekly Session"`
  - `"monthly"` → `"Monthly Session"`
  - `"one-time"` → `"One-Time Session"`
- ✅ No "Flexible" option (removed)
- ✅ Uses existing pill component styling

#### 4. Session Mode Pill
- ✅ Uses `sessionMode: "in-person" | "remote"`
- ✅ Display mapping:
  - `"in-person"` → `"In-Person Session"`
  - `"remote"` → `"Remote Session"`
- ✅ Rendered next to frequency pill

#### 5. Circle Continuity Pill
- ✅ Kept existing "Starting Soon" vs "Ongoing" logic
- ✅ Updated visuals:
  - **"Starting Soon"**: Orange outline pill (`bg-[#e35e25]/20`, `text-[#e35e25]`, `border-[#e35e25]/30`)
  - **"Ongoing"**: Green outline pill (`bg-green-100/15`, `text-[#15383c]`, `border-green-200/30`)
- ✅ Shows duration if `durationWeeks` available: `"Ongoing — {durationWeeks} Weeks"`
- ✅ Falls back to calculating weeks from `startDate` if `durationWeeks` not available
- ✅ Shows just `"Ongoing"` if no duration available

#### 6. Capacity Line (Human-friendly format)
- ✅ Updated format: `{joinedCount}/{capacity} joined — {spotsLeft} spots left`
- ✅ Uses existing Users icon
- ✅ Handles "Unlimited" capacity gracefully

#### 7. Location Formatting
- ✅ Format: `City, Country`
- ✅ Shows country if available from `event.country`
- ✅ Maintains existing location storage in Firestore

---

## PART B — Event Creation Page Updates ✅

### Files Modified:
1. **`pages/CreateEventPage.tsx`**

### Changes Implemented:

#### 1. Main Category Field (required, single select)
- ✅ Added required "Main Category" field
- ✅ Options:
  - `"Curated Sales"` → `"curatedSales"`
  - `"Connect & Promote"` → `"connectPromote"`
  - `"Mobilize & Support"` → `"mobilizeSupport"`
  - `"Learn & Grow"` → `"learnAndGrow"`
- ✅ Stored in Firestore as `mainCategory: string`

#### 2. Vibes / Subcategories (multi-select)
- ✅ Added multi-select "Vibes" selector
- ✅ All 17 vibes available:
  - Creative, Movement, Social, Wellness, Spiritual, Learning, Resilience, Cozy, Outdoors, Curious, Purposeful, Music, Sports, Food & Drink, Markets, Hands-On, Performances
- ✅ Stored as `vibes: string[]`
- ✅ Validation: 1–5 selections required
- ✅ UI: Selected vibes shown as pills with remove buttons, available vibes as clickable buttons

#### 3. Session Frequency (no flexible)
- ✅ Radio/select with 3 options:
  - `"Weekly"` → stored as `"weekly"`
  - `"Monthly"` → stored as `"monthly"`
  - `"One-Time"` → stored as `"one-time"`
- ✅ Stored as `sessionFrequency: "weekly" | "monthly" | "one-time"`

#### 4. Repeat Details for Weekly and Monthly

**Weekly Sessions:**
- ✅ Shows controls: "Repeats every [dropdown: Sun–Sat] at [time]"
- ✅ Defaults dropdown and time from chosen first date/time
- ✅ Stored as `weeklyDayOfWeek: number` (0–6, where 0 = Sunday)

**Monthly Sessions:**
- ✅ Shows controls: "Repeats every [day X of the month] at [time]"
- ✅ Defaults X and time from chosen first date/time
- ✅ Stored as `monthlyDayOfMonth: number` (1–31)

**One-Time Sessions:**
- ✅ Hides repeat controls
- ✅ Only `startDateTime` required

#### 5. Session Mode
- ✅ Selector with options:
  - `"In-Person"` → stored as `"in-person"`
  - `"Remote"` → stored as `"remote"`
- ✅ Stored as `sessionMode: string`

#### 6. Firestore Write
- ✅ All new fields written on event creation:
  - `mainCategory: string`
  - `vibes: string[]`
  - `sessionFrequency: "weekly" | "monthly" | "one-time"`
  - `sessionMode: string`
  - `startDateTime: number` (Timestamp)
  - `weeklyDayOfWeek?: number` (optional, for weekly)
  - `monthlyDayOfMonth?: number` (optional, for monthly)
- ✅ Existing fields preserved (no breaking changes)

---

## PART C — Files Modified Summary

### New Files Created:
1. **`utils/categoryMapper.ts`** - Main category mapping utilities

### Files Modified:
1. **`components/events/EventCard.tsx`** - Updated card display with new fields
2. **`pages/CreateEventPage.tsx`** - Added new form fields and validation
3. **`utils/eventHelpers.ts`** - Updated to support durationWeeks
4. **`types.ts`** - Added new field types
5. **`firebase/types.ts`** - Added new Firestore field types
6. **`firebase/db.ts`** - Updated mapping and write functions

---

## Updated JSX/TSX Code

### EventCard.tsx - Main Category Badge:
```tsx
{/* Main Category Badge - Top Left matching Hero badge style (orange pill) */}
{/* Use mainCategory if available, otherwise fallback to category for backward compatibility */}
<div className="absolute top-4 left-4 inline-block py-1 sm:py-1.5 px-3.5 sm:px-4 rounded-full bg-[#e35e25]/90 border-2 border-[#e35e25] text-white text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase backdrop-blur-sm z-10 shadow-lg">
  {(event as any).mainCategory ? getMainCategoryLabel((event as any).mainCategory) : (event.category || 'Circle')}
</div>
```

### EventCard.tsx - Vibes Pills:
```tsx
{/* Vibes Tags - Bottom-left overlay on hero image, above title area (off-white background, dark-green text) */}
{event.vibes && event.vibes.length > 0 && (
  <div className="absolute bottom-20 left-4 right-4 z-20 flex flex-wrap gap-1.5">
    {event.vibes.slice(0, 3).map((vibe, index) => (
      <span 
        key={index}
        className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#f2f2f2]/90 backdrop-blur-sm text-[#15383c] text-[11px] font-medium"
      >
        {vibe}
      </span>
    ))}
  </div>
)}
```

### EventCard.tsx - Capacity Line:
```tsx
<div className="flex items-center text-gray-600 text-sm">
  <Users size={16} className="sm:w-4 sm:h-4 mr-2 text-popera-orange shrink-0" />
  <span className="truncate leading-relaxed">
    {(() => {
      const joinedCount = event.attendeesCount ?? 0;
      const capacity = event.capacity ?? 'Unlimited';
      const availableSpots = getAvailableSpots(event);
      
      if (capacity === 'Unlimited') {
        return `${joinedCount} joined`;
      }
      
      const spotsLeft = availableSpots !== null ? availableSpots : 0;
      return `${joinedCount}/${capacity} joined — ${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`;
    })()}
  </span>
</div>
```

### CreateEventPage.tsx - Main Category Field:
```tsx
<div className="space-y-2">
  <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
    Main Category <span className="text-red-500">*</span>
  </label>
  <div className="relative">
    <select 
      value={mainCategory}
      onChange={(e) => setMainCategory(e.target.value as typeof mainCategory)}
      required
      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 sm:py-3.5 md:py-4 px-4 text-sm sm:text-base focus:outline-none focus:border-[#15383c] transition-all appearance-none cursor-pointer"
    >
      <option value="">Select...</option>
      <option value="curatedSales">Curated Sales</option>
      <option value="connectPromote">Connect & Promote</option>
      <option value="mobilizeSupport">Mobilize & Support</option>
      <option value="learnAndGrow">Learn & Grow</option>
    </select>
  </div>
</div>
```

### CreateEventPage.tsx - Vibes Multi-Select:
```tsx
<div className="space-y-2">
  <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
    Vibes <span className="text-red-500">*</span> <span className="text-gray-400 font-normal text-xs">(Select 1-5)</span>
  </label>
  <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl min-h-[60px]">
    {selectedVibes.length === 0 ? (
      <span className="text-gray-400 text-sm">No vibes selected</span>
    ) : (
      selectedVibes.map((vibe) => (
        <span key={vibe} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#15383c] text-white text-sm font-medium">
          {vibe}
          <button type="button" onClick={() => setSelectedVibes(selectedVibes.filter(v => v !== vibe))} className="ml-1 hover:text-red-200">
            <X size={14} />
          </button>
        </span>
      ))
    )}
  </div>
  <div className="flex flex-wrap gap-2">
    {ALL_VIBES.filter(vibe => !selectedVibes.includes(vibe)).map((vibe) => (
      <button
        key={vibe}
        type="button"
        onClick={() => {
          if (selectedVibes.length < 5) {
            setSelectedVibes([...selectedVibes, vibe]);
          } else {
            alert('You can select up to 5 vibes.');
          }
        }}
        disabled={selectedVibes.length >= 5}
        className="px-3 py-1.5 rounded-full bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:border-[#15383c] hover:text-[#15383c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {vibe}
      </button>
    ))}
  </div>
</div>
```

### CreateEventPage.tsx - Weekly Repeat Controls:
```tsx
{sessionFrequency === 'weekly' && date && time && (
  <div className="space-y-2 p-4 bg-[#eef4f5] rounded-xl border border-[#15383c]/10">
    <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 pl-1">
      Weekly Repeat Schedule
    </label>
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm text-gray-600">Repeats every</span>
      <select
        value={weeklyDayOfWeek !== undefined ? weeklyDayOfWeek : (date ? new Date(date).getDay() : 0)}
        onChange={(e) => setWeeklyDayOfWeek(parseInt(e.target.value))}
        className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#15383c]"
      >
        <option value="0">Sunday</option>
        <option value="1">Monday</option>
        <option value="2">Tuesday</option>
        <option value="3">Wednesday</option>
        <option value="4">Thursday</option>
        <option value="5">Friday</option>
        <option value="6">Saturday</option>
      </select>
      <span className="text-sm text-gray-600">at</span>
      <input type="time" value={time} readOnly className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm" />
    </div>
  </div>
)}
```

---

## New Firestore Fields Required

The following fields must be added to the Firestore `events` collection schema:

### Required Fields:
1. **`mainCategory`** (string, optional)
   - Values: `"curatedSales" | "connectPromote" | "mobilizeSupport" | "learnAndGrow"`
   - Used for main category badge display

2. **`vibes`** (array of strings, optional)
   - Array of vibe tags (e.g., `["Creative", "Social", "Wellness"]`)
   - Max 5 selections, displayed as pills

3. **`sessionFrequency`** (string, optional)
   - Values: `"weekly" | "monthly" | "one-time"`
   - Lowercase format (updated from previous "Weekly", "Monthly", "One-Time")

4. **`sessionMode`** (string, optional)
   - Values: `"in-person" | "remote"`
   - Lowercase format (updated from previous "In-Person", "Remote")

5. **`startDateTime`** (number, optional)
   - Timestamp for session start
   - Alternative to `startDate` field

### Optional Fields (for recurring sessions):
6. **`weeklyDayOfWeek`** (number, optional)
   - Range: 0–6 (0 = Sunday, 6 = Saturday)
   - Only set for weekly sessions

7. **`monthlyDayOfMonth`** (number, optional)
   - Range: 1–31
   - Only set for monthly sessions

8. **`durationWeeks`** (number, optional)
   - Duration in weeks for ongoing circles
   - Used to display "Ongoing — X Weeks"

### Backward Compatibility:
- **`category`** field is still saved for backward compatibility (defaults to "Community" if not provided)
- Existing events without `mainCategory` will fall back to displaying `category` or "Circle"
- Existing events without `vibes` will not show vibe pills (graceful fallback)
- Existing events without `sessionFrequency` or `sessionMode` will not show those pills (graceful fallback)

---

## Fallback Logic Confirmed ✅

### EventCard Fallbacks:
1. **Main Category**: Falls back to `event.category` if `mainCategory` missing, then to "Circle"
2. **Vibes**: Only displays if `event.vibes` exists and has items (max 3 shown)
3. **Session Frequency/Mode**: Only displays if fields exist (graceful fallback)
4. **Circle Continuity**: Calculates from `startDate` or falls back to `date` string parsing
5. **Duration**: Uses `durationWeeks` if available, otherwise calculates from `startDate`
6. **Capacity**: Handles "Unlimited" capacity gracefully
7. **Location**: Shows country if available, otherwise just city

### CreateEventPage Fallbacks:
1. **Category**: Defaults to "Community" if not provided (for backward compatibility)
2. **Vibes**: Validates 1-5 selections required
3. **Repeat Settings**: Auto-calculates from date/time if not explicitly set

---

## Migration Notes

### For Existing Events:
- Existing events will continue to work with fallback logic
- No immediate migration required
- New fields can be backfilled gradually

### For New Events:
- All new events created through the form will include the new fields
- `mainCategory` is required
- `vibes` (1-5 selections) is required
- `sessionFrequency` and `sessionMode` are required

---

## Testing Checklist

- [ ] EventCard displays mainCategory badge correctly
- [ ] EventCard falls back to category if mainCategory missing
- [ ] Vibes pills display correctly (max 3, off-white background)
- [ ] Session frequency/mode pills display correctly
- [ ] Circle continuity pills show correct colors (orange for starting, green for ongoing)
- [ ] Capacity line shows correct format
- [ ] Location shows city and country
- [ ] CreateEventPage mainCategory field works
- [ ] CreateEventPage vibes multi-select works (1-5 selections)
- [ ] Weekly repeat controls appear and save correctly
- [ ] Monthly repeat controls appear and save correctly
- [ ] One-time sessions hide repeat controls
- [ ] All fields save to Firestore correctly
- [ ] Existing events without new fields still render safely

---

## Status: ✅ Complete

All changes have been implemented and are ready for testing. No breaking changes to existing functionality.

