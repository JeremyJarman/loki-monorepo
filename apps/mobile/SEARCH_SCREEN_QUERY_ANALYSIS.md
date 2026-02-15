# Search Screen Query Analysis

## Current Behavior

### Main Venue Data Loading
- **Query Type**: Single Firestore snapshot listener
- **Location**: `search_screen.dart` line 215
- **Method**: `getVenuesStream()`
- **Behavior**: 
  - ✅ Loads ALL venues once when screen opens
  - ✅ Updates automatically when venues change in Firestore
  - ✅ **NO repeated queries when scrolling** - data is already loaded

### Per-Venue Queries (VenueCard)
- **Query Type**: Individual queries per venue card
- **Location**: `venue_card.dart` lines 74-91
- **Method**: `getExperienceInstancesByExperienceIdsAndType()`
- **Behavior**:
  - ⚠️ **Makes 2 queries per venue** when card first appears (events count + specials count)
  - ⚠️ **Queries are NOT cancelled** when card scrolls out of view
  - ⚠️ **Repeated queries** if card scrolls back into view (creates new subscriptions)

### Summary

**Scrolling Behavior:**
- ✅ **Venue data**: Loaded once, NOT re-queried on scroll
- ⚠️ **Event/Special counts**: Queried once per venue when it first appears
- ❌ **Memory leak**: Subscriptions not cancelled, leading to:
  - Multiple active subscriptions per venue
  - Unnecessary Firestore reads
  - Potential performance issues

## Query Count Example

For a search screen with 20 venues:

**Initial Load:**
- 1 query: Get all venues (`getVenuesStream()`)
- 40 queries: 2 per venue card (events + specials) as they scroll into view

**After Scrolling:**
- If you scroll up and down, venues that scroll back into view will create NEW queries
- Old subscriptions remain active (memory leak)

## Recommendations

1. **Fix subscription cleanup** in `VenueCard` to prevent memory leaks
2. **Cache experience instance counts** to avoid repeated queries
3. **Consider lazy loading** - only query counts when card is expanded or user interacts
