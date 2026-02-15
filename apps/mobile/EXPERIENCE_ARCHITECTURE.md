# Experience Architecture

## Overview

The experience system uses **TWO collections** with different responsibilities:

1. **`experiences`** - The "WHAT" (Definition/Idea)
2. **`experienceInstances`** - The "WHEN" (Time-based occurrences)

## Golden Rule

- **If the UI asks "WHAT?"** → use `experiences`
- **If the UI asks "WHEN?"** → use `experienceInstances`

**DO NOT mix these responsibilities.**

---

## Collection 1: `experiences` (IDEA)

### Purpose
Represents **WHAT** an experience is - the definition/idea.

### Characteristics
- Edited by venue owners (admin portal)
- Contains **NO dates or timestamps**
- May be recurring or one-time
- Used to generate instances

### Schema

```typescript
experiences/
  experienceId
    venueId: string
    type: "event" | "special"
    title: string
    description: string
    imageUrl?: string
    cost?: number  // Can be int or double

    isRecurring: boolean
    recurrenceRule?: {
      daysOfWeek: number[]   // 0=Sun, 1=Mon, ..., 6=Sat
      startTime: "HH:mm"     // e.g., "20:00"
      endTime: "HH:mm"       // e.g., "23:00"
    }

    createdAt: Timestamp
    updatedAt: Timestamp
```

### Rules
- ✅ **NEVER** store `startAt` / `endAt` here
- ✅ **NEVER** query this collection for time-based UI
- ✅ This answers: "WHAT is this?"

### Usage
- Admin portal: Create/edit experiences
- Backend: Generate instances from experiences

---

## Collection 2: `experienceInstances` (TIME)

### Purpose
Represents **WHEN** an experience happens - a concrete occurrence in time.

### Characteristics
- Auto-generated from experiences
- Queried by the frontend
- **ALWAYS** has concrete timestamps
- NOT edited manually

### Schema

```typescript
experienceInstances/
  instanceId
    experienceId: string      // Reference to experiences collection
    venueId: string
    type: "event" | "special"
    title: string

    startAt: Timestamp (UTC)  // REQUIRED
    endAt: Timestamp (UTC)    // REQUIRED

    createdAt: Timestamp
```

### Rules
- ✅ **ALWAYS** `startAt` + `endAt` (both required)
- ✅ **ALWAYS** stored in UTC
- ✅ **NO** recurrence logic here
- ✅ **NOT** edited manually
- ✅ This answers: "WHEN does this happen?"

### Usage
- Frontend: All time-based queries
- Examples:
  - "What's happening now?" → `startAt <= now AND endAt > now`
  - "What's coming up?" → `startAt > now ORDER BY startAt`

---

## Query Examples

### ✅ CORRECT: Time-based queries use instances

```dart
// Get upcoming events for a venue
getExperienceInstancesByVenueIdAndType(venueId, 'event')

// Get live events (happening now)
getLiveInstancesByVenueId(venueId)

// Get upcoming instances
getUpcomingInstancesByVenueId(venueId)
```

### ❌ WRONG: Don't query experiences for time

```dart
// DON'T DO THIS for time-based UI
getExperiencesByVenueId(venueId)  // No timestamps!
```

---

## Frontend Implementation

### Venue Profile Screen
- **Events Tab**: Queries `experienceInstances` where `type == "event"`
- **Specials Tab**: Queries `experienceInstances` where `type == "special"`
- Shows "On Tonight" (live or starting today) and "Coming Up" (future)

### Models
- `ExperienceModel`: For `experiences` collection (admin/backend use)
- `ExperienceInstanceModel`: For `experienceInstances` collection (frontend use)

---

## Admin Portal Requirements

When saving experiences, the admin portal should:

1. Save to `experiences` collection with:
   - `venueId`, `type`, `title`, `description`
   - `imageUrl` (optional)
   - `cost` as number (optional)
   - `isRecurring` boolean
   - `recurrenceRule` (if recurring) with `daysOfWeek`, `startTime`, `endTime`

2. **DO NOT** save timestamps to `experiences`

3. Backend/system will generate `experienceInstances` from `experiences`

---

## Data Flow

```
Admin Portal
    ↓
experiences (WHAT)
    ↓
[Backend generates instances]
    ↓
experienceInstances (WHEN)
    ↓
Frontend queries instances
```

---

## Common Mistakes to Avoid

1. ❌ Storing `startAt`/`endAt` in `experiences`
2. ❌ Querying `experiences` for time-based UI
3. ❌ Manually editing `experienceInstances`
4. ❌ Mixing the two collections' responsibilities
