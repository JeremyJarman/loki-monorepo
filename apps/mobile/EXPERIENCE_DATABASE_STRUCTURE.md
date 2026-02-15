# Experience Database Structure

## Overview

The experience system uses **TWO collections**:

1. **`experiences`** - The "WHAT" (Definition/Idea) - Edited by admin portal
2. **`experienceInstances`** - The "WHEN" (Time-based occurrences) - Auto-generated

---

## Collection 1: `experiences` (IDEA)

### Purpose
Represents **WHAT** an experience is - the definition/idea. Edited by venue owners via admin portal.

### Schema:

```typescript
experiences/
  experienceId
    venueId: string              // REQUIRED
    type: "event" | "special"    // REQUIRED
    title: string                 // REQUIRED
    description: string           // REQUIRED
    imageUrl?: string             // Optional
    cost?: number                 // Optional - int or double (NOT string!)
    
    isRecurring: boolean          // REQUIRED
    recurrenceRule?: {             // Optional - only if isRecurring == true
      daysOfWeek: number[]        // 0=Sun, 1=Mon, ..., 6=Sat
      startTime: "HH:mm"          // e.g., "20:00"
      endTime: "HH:mm"            // e.g., "23:00"
    }
    
    createdAt: Timestamp          // REQUIRED
    updatedAt: Timestamp          // REQUIRED
```

### Rules:
- ✅ **NEVER** store `startAt` / `endAt` / `startTime` / `endTime` as Timestamps
- ✅ **NEVER** query this collection for time-based UI
- ✅ This answers: "WHAT is this?"

### Example Document:

```json
{
  "venueId": "venue123",
  "type": "event",
  "title": "Live Music Night",
  "description": "Join us for live music every Friday and Saturday",
  "imageUrl": "https://example.com/image.jpg",
  "cost": 15,
  "isRecurring": true,
  "recurrenceRule": {
    "daysOfWeek": [5, 6],
    "startTime": "20:00",
    "endTime": "23:00"
  },
  "createdAt": Timestamp(seconds=1234567890, nanoseconds=0),
  "updatedAt": Timestamp(seconds=1234567890, nanoseconds=0)
}
```

---

## Collection 2: `experienceInstances` (TIME)

### Purpose
Represents **WHEN** an experience happens - a concrete occurrence in time. Auto-generated from experiences.

### Schema:

```typescript
experienceInstances/
  instanceId
    experienceId: string          // Reference to experiences collection
    venueId: string
    type: "event" | "special"
    title: string
    
    startAt: Timestamp (UTC)      // REQUIRED
    endAt: Timestamp (UTC)        // REQUIRED
    
    createdAt: Timestamp
```

### Rules:
- ✅ **ALWAYS** `startAt` + `endAt` (both required, UTC timestamps)
- ✅ **NO** recurrence logic here
- ✅ **NOT** edited manually
- ✅ This answers: "WHEN does this happen?"

### Example Document:

```json
{
  "experienceId": "exp123",
  "venueId": "venue123",
  "type": "event",
  "title": "Live Music Night",
  "startAt": Timestamp(seconds=1234567890, nanoseconds=0),
  "endAt": Timestamp(seconds=1234571490, nanoseconds=0),
  "createdAt": Timestamp(seconds=1234567890, nanoseconds=0)
}
```

---

## Query Rules

### ✅ CORRECT: Time-based queries use instances

```dart
// Frontend queries experienceInstances for time-based UI
getExperienceInstancesByVenueIdAndType(venueId, 'event')
getLiveInstancesByVenueId(venueId)
getUpcomingInstancesByVenueId(venueId)
```

### ❌ WRONG: Don't query experiences for time

```dart
// DON'T query experiences for time-based UI
getExperiencesByVenueId(venueId)  // No timestamps!
```

---

## Common Issues:

1. **Field name mismatch**: Use `venueId` (lowercase 'd'), not `venueID` or `venue_id`
2. **Type value**: Must be exactly `"event"` or `"special"` (case-sensitive, lowercase)
3. **Collection name**: Must be exactly `experiences` (plural) and `experienceInstances` (plural)
4. **Cost type**: Must be `number` (int or double), NOT string
5. **Timestamps in experiences**: NEVER store `startAt`/`endAt` in `experiences` collection
6. **Recurrence format**: Use `recurrenceRule` object, not old `recurrence` array

---

## For Admin Portal

See `ADMIN_PORTAL_EXPERIENCE_FORMAT.md` for detailed save format requirements.
