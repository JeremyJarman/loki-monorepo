# Experience Instances Format - Admin Portal Reference

## ⚠️ CRITICAL: This is the EXACT format required for saving experience instances

This document specifies the **exact format** that the admin portal MUST use when saving experience instances to Firestore.

---

## Collection: `experienceInstances`

**IMPORTANT**: This is the "WHEN" collection - contains concrete timestamps for when experiences occur.

---

## Required Fields

Every experience instance document MUST include these fields:

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `experienceId` | `string` | `"exp_abc123"` | **REQUIRED** - Must reference an existing document ID in the `experiences` collection |
| `venueId` | `string` | `"venue_xyz789"` | **REQUIRED** - The venue ID (must match the venue document ID) |
| `type` | `string` | `"event"` or `"special"` | **REQUIRED** - Must be exactly `"event"` or `"special"` (lowercase, case-sensitive) |
| `title` | `string` | `"Happy Hour"` | **REQUIRED** - The title of the experience (usually matches the experience title) |
| `startAt` | `Timestamp` | `Timestamp(seconds=1735689600)` | **REQUIRED** - UTC timestamp when this instance starts |
| `endAt` | `Timestamp` | `Timestamp(seconds=1735696800)` | **REQUIRED** - UTC timestamp when this instance ends |
| `createdAt` | `Timestamp` | `FieldValue.serverTimestamp()` | **REQUIRED** - When this instance was created |

---

## Field Details

### `experienceId`
- **Type**: `string`
- **Required**: Yes
- **Description**: References the document ID from the `experiences` collection
- **Example**: `"exp_abc123"`
- **Note**: This creates the link between the "WHAT" (experience definition) and "WHEN" (instance occurrence)

### `venueId`
- **Type**: `string`
- **Required**: Yes
- **Description**: The venue ID where this experience occurs
- **Example**: `"venue_xyz789"`
- **Note**: Must match exactly with a venue document ID

### `type`
- **Type**: `string`
- **Required**: Yes
- **Allowed Values**: `"event"` or `"special"` (lowercase only)
- **Example**: `"special"`
- **Note**: 
  - Must be lowercase string
  - Case-sensitive: `"Special"`, `"SPECIAL"`, or `1` will NOT work
  - The app queries with `where('type', isEqualTo: 'special')`

### `title`
- **Type**: `string`
- **Required**: Yes
- **Description**: The title of the experience instance
- **Example**: `"Happy Hour"` or `"Live Music Night"`
- **Note**: Usually matches the title from the `experiences` collection

### `startAt`
- **Type**: `Timestamp` (Firestore Timestamp, UTC)
- **Required**: Yes
- **Description**: When this specific instance starts
- **Example**: `Timestamp(seconds=1735689600, nanoseconds=0)`
- **Note**: 
  - Must be UTC timestamp
  - For recurring experiences, each occurrence gets its own instance with different `startAt`/`endAt`

### `endAt`
- **Type**: `Timestamp` (Firestore Timestamp, UTC)
- **Required**: Yes
- **Description**: When this specific instance ends
- **Example**: `Timestamp(seconds=1735696800, nanoseconds=0)`
- **Note**: 
  - Must be UTC timestamp
  - Must be after `startAt`
  - The app queries with `where('endAt', isGreaterThan: now)` to get upcoming/live instances

### `createdAt`
- **Type**: `Timestamp` (Firestore Timestamp)
- **Required**: Yes
- **Description**: When this instance document was created
- **Example**: `FieldValue.serverTimestamp()`
- **Note**: Use server timestamp for consistency

---

## Example Documents

### Example 1: One-Time Event Instance

```json
{
  "experienceId": "exp_live_music_001",
  "venueId": "venue_needle_vinyl",
  "type": "event",
  "title": "Live Music Night",
  "startAt": Timestamp(seconds=1735689600, nanoseconds=0),
  "endAt": Timestamp(seconds=1735696800, nanoseconds=0),
  "createdAt": Timestamp(seconds=1735603200, nanoseconds=0)
}
```

### Example 2: Recurring Special Instance (Monday)

```json
{
  "experienceId": "exp_happy_hour_001",
  "venueId": "venue_needle_vinyl",
  "type": "special",
  "title": "Happy Hour",
  "startAt": Timestamp(seconds=1735689600, nanoseconds=0),  // Monday 5:00 PM UTC
  "endAt": Timestamp(seconds=1735696800, nanoseconds=0),    // Monday 7:00 PM UTC
  "createdAt": Timestamp(seconds=1735603200, nanoseconds=0)
}
```

### Example 3: Recurring Special Instance (Tuesday)

For the same recurring special, you would create a separate instance for each day:

```json
{
  "experienceId": "exp_happy_hour_001",  // Same experienceId
  "venueId": "venue_needle_vinyl",        // Same venueId
  "type": "special",                      // Same type
  "title": "Happy Hour",                  // Same title
  "startAt": Timestamp(seconds=1735776000, nanoseconds=0),  // Tuesday 5:00 PM UTC
  "endAt": Timestamp(seconds=1735783200, nanoseconds=0),     // Tuesday 7:00 PM UTC
  "createdAt": Timestamp(seconds=1735603200, nanoseconds=0)
}
```

---

## Code Examples

### Example 1: Creating a One-Time Event Instance

```dart
await firestore.collection('experienceInstances').add({
  'experienceId': 'exp_live_music_001',
  'venueId': 'venue_needle_vinyl',
  'type': 'event',
  'title': 'Live Music Night',
  'startAt': Timestamp.fromDate(DateTime(2025, 1, 3, 20, 0)),  // Jan 3, 2025 8:00 PM
  'endAt': Timestamp.fromDate(DateTime(2025, 1, 3, 23, 0)),    // Jan 3, 2025 11:00 PM
  'createdAt': FieldValue.serverTimestamp(),
});
```

### Example 2: Creating a Recurring Special Instance

For a special that occurs Monday-Friday 5-7 PM, you need to generate instances for each day:

```dart
// Get the experience from experiences collection
final experience = await firestore.collection('experiences').doc('exp_happy_hour_001').get();
final recurrenceRule = experience.data()!['recurrenceRule'] as Map<String, dynamic>;
final daysOfWeek = recurrenceRule['daysOfWeek'] as List<int>;  // [1, 2, 3, 4, 5] for Mon-Fri
final startTime = recurrenceRule['startTime'] as String;      // "17:00"
final endTime = recurrenceRule['endTime'] as String;          // "19:00"

// Generate instances for the next 4 weeks
final now = DateTime.now();
for (int week = 0; week < 4; week++) {
  for (int dayOfWeek in daysOfWeek) {
    // Calculate the date for this day of week
    final daysUntil = (dayOfWeek - now.weekday + 7) % 7 + (week * 7);
    final instanceDate = now.add(Duration(days: daysUntil));
    
    // Parse start and end times
    final startParts = startTime.split(':');
    final endParts = endTime.split(':');
    final startDateTime = DateTime(
      instanceDate.year,
      instanceDate.month,
      instanceDate.day,
      int.parse(startParts[0]),
      int.parse(startParts[1]),
    );
    final endDateTime = DateTime(
      instanceDate.year,
      instanceDate.month,
      instanceDate.day,
      int.parse(endParts[0]),
      int.parse(endParts[1]),
    );
    
    // Create the instance
    await firestore.collection('experienceInstances').add({
      'experienceId': 'exp_happy_hour_001',
      'venueId': 'venue_needle_vinyl',
      'type': 'special',
      'title': 'Happy Hour',
      'startAt': Timestamp.fromDate(startDateTime),
      'endAt': Timestamp.fromDate(endDateTime),
      'createdAt': FieldValue.serverTimestamp(),
    });
  }
}
```

---

## How the App Queries Instances

The Flutter app uses these queries to find instances:

### 1. Get all upcoming/live instances for a venue
```dart
getExperienceInstancesByVenueId(venueId)
// Query: where('venueId', isEqualTo: venueId) 
//        where('endAt', isGreaterThan: now)
```

### 2. Get instances by venue and type
```dart
getExperienceInstancesByVenueIdAndType(venueId, 'special')
// Query: where('venueId', isEqualTo: venueId)
//        where('type', isEqualTo: 'special')
//        where('endAt', isGreaterThan: now)
```

### 3. Get all upcoming instances across all venues
```dart
getAllUpcomingInstances()
// Query: where('endAt', isGreaterThan: now)
```

### 4. Get instances by experience IDs and type
```dart
getExperienceInstancesByExperienceIdsAndType(experienceIds, 'special')
// Query: where('experienceId', whereIn: experienceIds)
//        where('type', isEqualTo: 'special')
//        where('endAt', isGreaterThan: now)
```

**Key Point**: All queries filter by `endAt > now` to show only upcoming or currently live instances.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Wrong Type Format

```dart
// WRONG - Don't do this!
'type': 'Special',        // ❌ Wrong case
'type': 'SPECIAL',       // ❌ Wrong case
'type': 1,               // ❌ Wrong type (should be string)
'type': 'event',         // ❌ Wrong if it's actually a special
```

**Correct way**:
```dart
// CORRECT
'type': 'special',       // ✅ Lowercase string
'type': 'event',         // ✅ Lowercase string
```

### ❌ Mistake 2: Missing Required Fields

```dart
// WRONG - Missing required fields
await firestore.collection('experienceInstances').add({
  'experienceId': 'exp_123',
  'type': 'special',
  // ❌ Missing venueId, title, startAt, endAt, createdAt
});
```

**Correct way**:
```dart
// CORRECT - All required fields present
await firestore.collection('experienceInstances').add({
  'experienceId': 'exp_123',
  'venueId': 'venue_456',
  'type': 'special',
  'title': 'Happy Hour',
  'startAt': Timestamp.fromDate(startDate),
  'endAt': Timestamp.fromDate(endDate),
  'createdAt': FieldValue.serverTimestamp(),
});
```

### ❌ Mistake 3: Wrong Timestamp Format

```dart
// WRONG - Don't use strings or Date objects directly
'startAt': '2025-01-03T20:00:00Z',           // ❌ String
'startAt': DateTime(2025, 1, 3, 20, 0),      // ❌ DateTime (needs conversion)
'startAt': 1735689600,                        // ❌ Number
```

**Correct way**:
```dart
// CORRECT - Use Firestore Timestamp
'startAt': Timestamp.fromDate(DateTime(2025, 1, 3, 20, 0)),
'startAt': Timestamp.fromMillisecondsSinceEpoch(1735689600000),
```

### ❌ Mistake 4: Not Generating Instances for Recurring Experiences

```dart
// WRONG - Only creating one instance for a recurring special
await firestore.collection('experienceInstances').add({
  'experienceId': 'exp_happy_hour',
  'type': 'special',
  // ... only one instance created
});
```

**Correct way**:
```dart
// CORRECT - Generate multiple instances for recurring experiences
// One instance per occurrence (e.g., one per day for Mon-Fri special)
for (DateTime date in occurrenceDates) {
  await firestore.collection('experienceInstances').add({
    'experienceId': 'exp_happy_hour',
    'venueId': 'venue_123',
    'type': 'special',
    'title': 'Happy Hour',
    'startAt': Timestamp.fromDate(date.add(Duration(hours: 17))),  // 5 PM
    'endAt': Timestamp.fromDate(date.add(Duration(hours: 19))),   // 7 PM
    'createdAt': FieldValue.serverTimestamp(),
  });
}
```

### ❌ Mistake 5: endAt Before startAt

```dart
// WRONG - endAt must be after startAt
'startAt': Timestamp.fromDate(DateTime(2025, 1, 3, 20, 0)),  // 8 PM
'endAt': Timestamp.fromDate(DateTime(2025, 1, 3, 19, 0)),  // 7 PM ❌
```

**Correct way**:
```dart
// CORRECT - endAt after startAt
'startAt': Timestamp.fromDate(DateTime(2025, 1, 3, 17, 0)),  // 5 PM
'endAt': Timestamp.fromDate(DateTime(2025, 1, 3, 19, 0)),  // 7 PM ✅
```

---

## Validation Checklist

Before saving an experience instance, verify:

- [ ] `experienceId` is a non-empty string matching an existing experience document ID
- [ ] `venueId` is a non-empty string matching a venue document ID
- [ ] `type` is exactly `"event"` or `"special"` (lowercase, case-sensitive)
- [ ] `title` is a non-empty string
- [ ] `startAt` is a Firestore Timestamp (UTC)
- [ ] `endAt` is a Firestore Timestamp (UTC)
- [ ] `endAt` is after `startAt`
- [ ] `createdAt` is a Firestore Timestamp (use `FieldValue.serverTimestamp()`)
- [ ] For recurring experiences, instances are generated for each occurrence
- [ ] All timestamps are in UTC

---

## Relationship Between Collections

### `experiences` Collection (WHAT)
- Contains the **definition** of the experience
- Has `isRecurring` and `recurrenceRule` for recurring experiences
- **NO timestamps** (`startAt`/`endAt`)

### `experienceInstances` Collection (WHEN)
- Contains **concrete occurrences** of experiences
- Has `startAt` and `endAt` timestamps
- **One instance per occurrence** (for recurring experiences, multiple instances)
- References `experienceId` to link back to the experience definition

### Example Flow:

1. **Admin saves experience** to `experiences`:
   ```json
   {
     "experienceId": "exp_happy_hour",
     "venueId": "venue_123",
     "type": "special",
     "title": "Happy Hour",
     "isRecurring": true,
     "recurrenceRule": {
       "daysOfWeek": [1, 2, 3, 4, 5],
       "startTime": "17:00",
       "endTime": "19:00"
     }
   }
   ```

2. **Admin portal generates instances** in `experienceInstances`:
   - Monday instance: `startAt: Mon 5 PM, endAt: Mon 7 PM`
   - Tuesday instance: `startAt: Tue 5 PM, endAt: Tue 7 PM`
   - Wednesday instance: `startAt: Wed 5 PM, endAt: Wed 7 PM`
   - ... and so on

3. **Flutter app queries** `experienceInstances` to show upcoming specials

---

## Summary

**Remember**:
- `experienceInstances` = WHEN (concrete timestamps)
- `type` = lowercase string `"event"` or `"special"`
- All timestamps must be Firestore Timestamps (UTC)
- For recurring experiences, generate one instance per occurrence
- The app queries with `endAt > now` to show upcoming/live instances
- `experienceId` must reference an existing document in `experiences` collection

**Critical**: The Flutter app will NOT find specials if they only exist in `experiences` without corresponding `experienceInstances`. You MUST create instances for the app to display them.
