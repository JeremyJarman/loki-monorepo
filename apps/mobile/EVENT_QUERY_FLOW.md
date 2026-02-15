# Event Query Flow in Venue Cards

## Step-by-Step Flow

### Step 1: Get Active Experience IDs from Venue
**Location:** `lib/widgets/venue_card.dart` → `_buildEventsTab()`
```dart
final activeExperienceIds = widget.venue.getActiveExperienceIds();
```

**What it does:**
- Reads from `venue.experiences` array (List<Map<String, dynamic>>)
- Filters where `isActive == true`
- Extracts `experienceId` strings
- Returns: `List<String>` of active experience IDs

**Query:** No Firestore query - reads from already-loaded venue document

---

### Step 2: Fetch Experiences by IDs
**Location:** `lib/services/firestore_service.dart` → `getExperiencesByIdsStream()`
```dart
_firestoreService.getExperiencesByIdsStream(activeExperienceIds)
```

**Firestore Query:**
```dart
// If <= 10 IDs:
_firestore
  .collection('experiences')
  .where(FieldPath.documentId, whereIn: experienceIds)
  .snapshots()

// If > 10 IDs:
_firestore
  .collection('experiences')
  .snapshots()  // Gets ALL, then filters in memory
```

**Returns:** `Stream<List<ExperienceModel>>`

---

### Step 3: Filter Experiences by Type
**Location:** `lib/widgets/venue_card.dart` → `_combineExperiencesAndInstancesStream()`
```dart
.map((experiences) => experiences.where((e) => e.type == type).toList())
```

**What it does:**
- Filters the experiences list to only include `type == 'event'` (or 'special')
- Returns: `List<ExperienceModel>` of only event-type experiences

---

### Step 4: Get Experience Instances
**Location:** `lib/services/firestore_service.dart` → `getExperienceInstancesByExperienceIdsAndType()`
```dart
_firestoreService.getExperienceInstancesByExperienceIdsAndType(eventExperienceIds, 'event')
```

**Firestore Query:**
```dart
// If <= 10 IDs:
_firestore
  .collection('experienceInstances')
  .where('experienceId', whereIn: experienceIds)
  .where('type', isEqualTo: type)
  .where('endAt', isGreaterThan: now)  // Only future/live instances
  .snapshots()

// If > 10 IDs:
_firestore
  .collection('experienceInstances')
  .where('type', isEqualTo: type)
  .where('endAt', isGreaterThan: now)
  .snapshots()  // Gets ALL, then filters by experienceIds in memory
```

**Returns:** `Stream<List<ExperienceInstanceModel>>`

---

### Step 5: Combine and Display
**Location:** `lib/widgets/venue_card.dart` → `_combineExperiencesAndInstancesStream()`
- Combines both streams into one
- Creates a map: `experienceId -> ExperienceModel`
- Displays using `ExperienceInstanceCard` widget

---

## Potential Issues to Check

1. **Venue document structure:**
   - Is `experiences` array present?
   - Format: `[{experienceId: "exp123", isActive: true}, ...]`
   - Are `isActive` values actually `true` (boolean, not string)?

2. **Experience documents:**
   - Do the experience IDs from venue exist in `experiences` collection?
   - Do they have `type: "event"` (lowercase, exact match)?

3. **Experience instances:**
   - Are there any instances in `experienceInstances` collection?
   - Do they have matching `experienceId` values?
   - Do they have `type: "event"`?
   - Are `endAt` timestamps in the future (or live now)?

4. **Query limitations:**
   - Firestore `whereIn` is limited to 10 items
   - If more than 10 active experiences, queries fetch all and filter in memory
