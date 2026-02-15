# Recurring Experiences Format - Updated Structure

## ⚠️ IMPORTANT: New Format for Recurring Experiences

This document describes the **updated format** for recurring experiences (specials and events) in the LOKI admin system. This format supports:
- Different times for different days of the week
- Date ranges for recurring experiences (e.g., a special that runs for 2 weeks only)
- No instance generation for recurring experiences (the app calculates occurrences from the recurrence rule)

---

## Collection: `experiences`

### Recurring Experience Structure

For recurring experiences, the `recurrenceRule` field uses the following structure:

```typescript
{
  daySchedules: {
    [day: number]: {
      startTime: string;  // HH:mm format (24-hour)
      endTime: string;    // HH:mm format (24-hour)
    }
  };
  startDate?: Timestamp;  // Optional: when the recurring experience starts
  endDate?: Timestamp;    // Optional: when the recurring experience ends
}
```

### Day Number Mapping

- `0` = Sunday
- `1` = Monday
- `2` = Tuesday
- `3` = Wednesday
- `4` = Thursday
- `5` = Friday
- `6` = Saturday

### Date Range Fields

- **`startDate`** (optional): Firestore Timestamp indicating when the recurring experience begins. If omitted, the experience starts immediately.
- **`endDate`** (optional): Firestore Timestamp indicating when the recurring experience ends. If omitted, the experience continues indefinitely (until manually deactivated).

---

## Example Documents

### Example 1: Recurring Special with Same Times Every Day

A Happy Hour that runs Monday-Friday, 5:00 PM - 7:00 PM, indefinitely:

```json
{
  "id": "exp_happy_hour_001",
  "venueId": "venue_needle_vinyl",
  "type": "special",
  "title": "Happy Hour",
  "description": "Half-price drinks and appetizers",
  "isRecurring": true,
  "recurrenceRule": {
    "daySchedules": {
      "1": { "startTime": "17:00", "endTime": "19:00" },  // Monday
      "2": { "startTime": "17:00", "endTime": "19:00" },  // Tuesday
      "3": { "startTime": "17:00", "endTime": "19:00" },  // Wednesday
      "4": { "startTime": "17:00", "endTime": "19:00" },  // Thursday
      "5": { "startTime": "17:00", "endTime": "19:00" }   // Friday
    }
  },
  "cost": null,
  "imageUrl": "https://example.com/happy-hour.jpg",
  "createdAt": Timestamp(...),
  "updatedAt": Timestamp(...)
}
```

### Example 2: Recurring Special with Different Times Per Day

A Brunch special that runs Saturday and Sunday with different times:

```json
{
  "id": "exp_brunch_001",
  "venueId": "venue_cafe_morning",
  "type": "special",
  "title": "Weekend Brunch",
  "description": "Bottomless mimosas and brunch menu",
  "isRecurring": true,
  "recurrenceRule": {
    "daySchedules": {
      "6": { "startTime": "10:00", "endTime": "14:00" },  // Saturday: 10 AM - 2 PM
      "0": { "startTime": "11:00", "endTime": "15:00" }   // Sunday: 11 AM - 3 PM
    }
  },
  "cost": 25.00,
  "imageUrl": "https://example.com/brunch.jpg",
  "createdAt": Timestamp(...),
  "updatedAt": Timestamp(...)
}
```

### Example 3: Recurring Special with Date Range

A limited-time special that runs Monday-Friday for 2 weeks only (Jan 1 - Jan 14, 2025):

```json
{
  "id": "exp_new_year_special",
  "venueId": "venue_restaurant_xyz",
  "type": "special",
  "title": "New Year Special",
  "description": "Special menu items for the new year",
  "isRecurring": true,
  "recurrenceRule": {
    "daySchedules": {
      "1": { "startTime": "12:00", "endTime": "15:00" },  // Monday: Lunch
      "2": { "startTime": "12:00", "endTime": "15:00" },  // Tuesday: Lunch
      "3": { "startTime": "12:00", "endTime": "15:00" },  // Wednesday: Lunch
      "4": { "startTime": "12:00", "endTime": "15:00" },  // Thursday: Lunch
      "5": { "startTime": "12:00", "endTime": "15:00" }   // Friday: Lunch
    },
    "startDate": Timestamp(seconds=1735689600),  // Jan 1, 2025 00:00:00 UTC
    "endDate": Timestamp(seconds=1736899199)     // Jan 14, 2025 23:59:59 UTC
  },
  "cost": null,
  "imageUrl": null,
  "createdAt": Timestamp(...),
  "updatedAt": Timestamp(...)
}
```

### Example 4: Recurring Event with Overnight Times

A late-night event that runs Friday and Saturday, starting at 10 PM and ending at 2 AM the next day:

```json
{
  "id": "exp_late_night_001",
  "venueId": "venue_club_night",
  "type": "event",
  "title": "Late Night DJ Set",
  "description": "DJ spinning until 2 AM",
  "isRecurring": true,
  "recurrenceRule": {
    "daySchedules": {
      "5": { "startTime": "22:00", "endTime": "02:00" },  // Friday: 10 PM - 2 AM (next day)
      "6": { "startTime": "22:00", "endTime": "02:00" }   // Saturday: 10 PM - 2 AM (next day)
    }
  },
  "cost": 10.00,
  "imageUrl": "https://example.com/dj.jpg",
  "createdAt": Timestamp(...),
  "updatedAt": Timestamp(...)
}
```

**Note**: When `endTime < startTime`, the app should interpret this as ending the next day (e.g., 22:00 to 02:00 means 10 PM Friday to 2 AM Saturday).

### Example 5: Non-Recurring Experience

A one-time event with a specific date and time:

```json
{
  "id": "exp_concert_001",
  "venueId": "venue_music_hall",
  "type": "event",
  "title": "Live Concert",
  "description": "Special performance by local band",
  "isRecurring": false,
  "recurrenceRule": null,
  "cost": 30.00,
  "imageUrl": "https://example.com/concert.jpg",
  "createdAt": Timestamp(...),
  "updatedAt": Timestamp(...)
}
```

**Note**: Non-recurring experiences have an instance in the `experienceInstances` collection with specific `startAt` and `endAt` timestamps.

---

## Key Differences from Previous Format

### Old Format (Deprecated)
```json
{
  "recurrenceRule": {
    "daysOfWeek": [1, 2, 3, 4, 5],  // Array of day numbers
    "startTime": "17:00",            // Single start time for all days
    "endTime": "19:00"               // Single end time for all days
  }
}
```

### New Format (Current)
```json
{
  "recurrenceRule": {
    "daySchedules": {
      "1": { "startTime": "17:00", "endTime": "19:00" },
      "2": { "startTime": "17:00", "endTime": "19:00" },
      "3": { "startTime": "18:00", "endTime": "20:00" },  // Different time on Wednesday
      "4": { "startTime": "17:00", "endTime": "19:00" },
      "5": { "startTime": "17:00", "endTime": "19:00" }
    },
    "startDate": Timestamp(...),  // Optional date range
    "endDate": Timestamp(...)     // Optional date range
  }
}
```

---

## How the App Should Handle Recurring Experiences

### 1. Query Recurring Experiences

Query the `experiences` collection for experiences where:
- `isRecurring == true`
- `type == "special"` or `type == "event"`
- `venueId` matches the venue you're displaying

### 2. Calculate Occurrences

For each recurring experience, calculate when it should be displayed:

1. **Check Date Range** (if present):
   - If `startDate` exists and is in the future, don't show yet
   - If `endDate` exists and is in the past, don't show anymore
   - If current date is within the range (or no range), continue

2. **Check Day of Week**:
   - Get current day of week (0-6)
   - Check if that day exists in `daySchedules`
   - If not, the experience is not active today

3. **Check Time**:
   - Get current time
   - Compare with `startTime` and `endTime` for today's day
   - If current time is between `startTime` and `endTime`, show as "live"
   - If current time is before `startTime` but it's the correct day, show as "upcoming"
   - If `endTime < startTime`, handle as overnight (end time is next day)

### 3. Example Calculation Logic

```dart
bool shouldShowRecurringExperience(Experience experience, DateTime now) {
  if (!experience.isRecurring || experience.recurrenceRule == null) {
    return false;
  }
  
  final rule = experience.recurrenceRule!;
  
  // Check date range
  if (rule.startDate != null) {
    if (now.isBefore(rule.startDate!.toDate())) {
      return false; // Not started yet
    }
  }
  
  if (rule.endDate != null) {
    if (now.isAfter(rule.endDate!.toDate())) {
      return false; // Already ended
    }
  }
  
  // Check day of week
  final dayOfWeek = now.weekday % 7; // Convert to 0-6 format (0=Sunday)
  final daySchedule = rule.daySchedules[dayOfWeek];
  
  if (daySchedule == null) {
    return false; // Not active on this day
  }
  
  // Check time
  final currentTime = TimeOfDay.fromDateTime(now);
  final startTime = parseTime(daySchedule.startTime); // "17:00" -> TimeOfDay(17, 0)
  final endTime = parseTime(daySchedule.endTime);     // "19:00" -> TimeOfDay(19, 0)
  
  if (endTime.hour < startTime.hour || 
      (endTime.hour == startTime.hour && endTime.minute < startTime.minute)) {
    // Overnight: end time is next day
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    // Same day
    return currentTime >= startTime && currentTime <= endTime;
  }
}
```

---

## Experience Instances Collection

### Important: Recurring Experiences Do NOT Create Instances

- **Recurring experiences**: NO instances are created. The app calculates occurrences from `recurrenceRule`.
- **Non-recurring experiences**: ONE instance is created in `experienceInstances` with specific `startAt` and `endAt` timestamps.

### Querying Instances

Only query `experienceInstances` for non-recurring experiences. For recurring experiences, query `experiences` and calculate occurrences client-side.

---

## Migration Notes

If you have existing recurring experiences in the old format:

1. **Old format** uses `daysOfWeek` array and single `startTime`/`endTime`
2. **New format** uses `daySchedules` object with per-day times

You may need to migrate old data:

```typescript
// Migration example (pseudo-code)
if (oldFormat.recurrenceRule.daysOfWeek) {
  const daySchedules = {};
  for (const day of oldFormat.recurrenceRule.daysOfWeek) {
    daySchedules[day] = {
      startTime: oldFormat.recurrenceRule.startTime,
      endTime: oldFormat.recurrenceRule.endTime
    };
  }
  newFormat.recurrenceRule = {
    daySchedules: daySchedules
  };
}
```

---

## Summary

**Key Points:**
- Recurring experiences use `daySchedules` object (not `daysOfWeek` array)
- Each day can have different start/end times
- Optional `startDate` and `endDate` for limited-time recurring experiences
- **No instances are created for recurring experiences** - calculate occurrences from `recurrenceRule`
- Only non-recurring experiences create instances in `experienceInstances` collection
- Handle overnight times (endTime < startTime) as ending the next day
- The app must calculate when to show recurring experiences based on current date/time and the recurrence rule

**Critical**: The app will NOT find recurring specials if it only queries `experienceInstances`. You MUST query `experiences` where `isRecurring == true` and calculate occurrences client-side.
