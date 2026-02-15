# Experience Save Format - Admin Portal Reference

## ⚠️ CRITICAL: This is the EXACT format required for saving experiences

This document specifies the **exact format** that the admin portal MUST use when saving experiences to Firestore.

---

## Collection: `experiences`

**IMPORTANT**: This is the "WHAT" collection - NO timestamps allowed!

---

## Required Fields

Every experience document MUST include these fields:

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `venueId` | `string` | `"venue123"` | Must match venue document ID exactly |
| `type` | `string` | `"event"` or `"special"` | Must be lowercase, exactly one of these two values |
| `title` | `string` | `"Live Music Night"` | Required, non-empty |
| `description` | `string` | `"Join us for live music"` | Required, non-empty |
| `isRecurring` | `boolean` | `true` or `false` | Required, must be boolean (not string "true"/"false") |
| `createdAt` | `Timestamp` | `FieldValue.serverTimestamp()` | Required |
| `updatedAt` | `Timestamp` | `FieldValue.serverTimestamp()` | Required |

---

## Optional Fields

These fields can be included if applicable:

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `imageUrl` | `string?` | `"https://example.com/image.jpg"` | Can be null or omitted |
| `cost` | `number?` | `15` or `15.50` | **MUST be number (int or double), NOT string!** |
| `tags` | `string[]?` | `["Happy Hour", "Live Music"]` | Array of tag strings (max 3 tags per experience) |
| `genre` | `string?` | `"Rock"` or `"Jazz"` | Music genre - only relevant when "Live Music" or "DJ Night" tags are selected |
| `recurrenceRule` | `object?` | See below | Only if `isRecurring == true` |

### `tags` Field

- **Type**: `string[]` (array of strings) or `null`
- **Description**: Categorization tags for the experience
- **Max Length**: 3 tags per experience
- **Special Tags**:
  - **For Specials**: Meal Deal, Happy Hour, Drinks Special, Live Music, DJ Night, Trivia Night, Karaoke, Brunch Special, Lunch Special, Dinner Special, Late Night, Student Discount, Ladies Night, Bottomless, All You Can Eat, Weekend Special, Early Bird, Family Deal, Group Deal, YRW2026
  - **For Events**: Live Music, DJ Night, Trivia Night, Karaoke, Comedy Night, Open Mic, Quiz Night, Sports Viewing, Game Night, Themed Night, Workshop, Tasting Event, Launch Event, Private Event, Networking, Fundraiser, Birthday Party, Anniversary, Holiday Event, Festival, Concert, Performance, Exhibition
- **Example**: `["Happy Hour", "Drinks Special"]` or `["Live Music", "DJ Night"]`
- **Note**: If no tags are selected, this field can be `null` or omitted

### `genre` Field

- **Type**: `string` or `null`
- **Description**: Music genre for events/specials tagged with "Live Music" or "DJ Night"
- **Examples**: "Rock", "Jazz", "Electronic", "Hip-Hop", "Pop", "Country", "Blues", "Reggae"
- **Note**: 
  - Only relevant when `tags` includes "Live Music" or "DJ Night"
  - Can be `null` or omitted if not applicable
  - Free-form text field (no predefined list)

### `recurrenceRule` Structure (if recurring):

**⚠️ IMPORTANT**: The recurrence rule format has been updated. Use the new format below.

```typescript
{
  daySchedules: {
    [day: number]: {
      startTime: string;  // "HH:mm" format (24-hour), e.g., "17:00"
      endTime: string;    // "HH:mm" format (24-hour), e.g., "19:00"
    }
  };
  startDate?: Timestamp;  // Optional: when the recurring experience starts
  endDate?: Timestamp;    // Optional: when the recurring experience ends
}
```

**Day Number Mapping**:
- `0` = Sunday
- `1` = Monday
- `2` = Tuesday
- `3` = Wednesday
- `4` = Thursday
- `5` = Friday
- `6` = Saturday

**Key Points**:
- Each day can have different start/end times
- `startDate` and `endDate` are optional Timestamps for limited-time recurring experiences
- If `endTime < startTime`, it means the event ends the next day (e.g., 22:00 to 02:00 = 10 PM to 2 AM next day)

---

## ❌ DO NOT SAVE These Fields

**NEVER** save these fields to the `experiences` collection:

- ❌ `startAt` (Timestamp)
- ❌ `endAt` (Timestamp)
- ❌ `startTime` (Timestamp) - Use string in `recurrenceRule` instead
- ❌ `endTime` (Timestamp) - Use string in `recurrenceRule` instead
- ❌ `recurrence` (old array format) - Use `recurrenceRule` object instead
- ❌ Any date/time fields as Timestamps

---

## ✅ Correct Code Examples

### Example 1: One-Time Event with Tags

```dart
await firestore.collection('experiences').add({
  'venueId': 'venue123',
  'type': 'event',
  'title': 'Live Music Night',
  'description': 'Join us for live music',
  'imageUrl': 'https://example.com/image.jpg',
  'cost': 15,  // number, not string!
  'tags': ['Live Music', 'Concert'],
  'genre': 'Rock',
  'isRecurring': false,
  'createdAt': FieldValue.serverTimestamp(),
  'updatedAt': FieldValue.serverTimestamp(),
});
```

### Example 2: Recurring Event (Single Day) with Tags

```dart
await firestore.collection('experiences').add({
  'venueId': 'venue123',
  'type': 'event',
  'title': 'Weekly Trivia',
  'description': 'Join us every Tuesday for trivia',
  'imageUrl': 'https://example.com/image.jpg',
  'cost': 10,  // number, not string!
  'tags': ['Trivia Night', 'Quiz Night'],
  'isRecurring': true,
  'recurrenceRule': {
    'daySchedules': {
      '2': {  // Tuesday (0=Sun, 1=Mon, 2=Tue, etc.)
        'startTime': '19:00',  // 7:00 PM (24-hour format)
        'endTime': '21:00'    // 9:00 PM (24-hour format)
      }
    }
  },
  'createdAt': FieldValue.serverTimestamp(),
  'updatedAt': FieldValue.serverTimestamp(),
});
```

### Example 3: Recurring Special (Multiple Days) with Tags

```dart
await firestore.collection('experiences').add({
  'venueId': 'venue123',
  'type': 'special',
  'title': 'Happy Hour',
  'description': 'Half-price drinks Monday through Friday',
  'tags': ['Happy Hour', 'Drinks Special'],
  'isRecurring': true,
  'recurrenceRule': {
    'daySchedules': {
      '1': { 'startTime': '17:00', 'endTime': '19:00' },  // Monday
      '2': { 'startTime': '17:00', 'endTime': '19:00' },  // Tuesday
      '3': { 'startTime': '17:00', 'endTime': '19:00' },  // Wednesday
      '4': { 'startTime': '17:00', 'endTime': '19:00' },  // Thursday
      '5': { 'startTime': '17:00', 'endTime': '19:00' }   // Friday
    }
  },
  'createdAt': FieldValue.serverTimestamp(),
  'updatedAt': FieldValue.serverTimestamp(),
});
```

### Example 4: Recurring Event with Different Times Per Day

```dart
await firestore.collection('experiences').add({
  'venueId': 'venue123',
  'type': 'event',
  'title': 'Live Music Weekend',
  'description': 'Live music every Friday and Saturday',
  'tags': ['Live Music', 'DJ Night'],
  'genre': 'Electronic',
  'isRecurring': true,
  'recurrenceRule': {
    'daySchedules': {
      '5': { 'startTime': '20:00', 'endTime': '23:00' },  // Friday: 8 PM - 11 PM
      '6': { 'startTime': '21:00', 'endTime': '02:00' }  // Saturday: 9 PM - 2 AM (next day)
    }
  },
  'createdAt': FieldValue.serverTimestamp(),
  'updatedAt': FieldValue.serverTimestamp(),
});
```

### Example 5: Recurring Special with Date Range

```dart
await firestore.collection('experiences').add({
  'venueId': 'venue123',
  'type': 'special',
  'title': 'New Year Special',
  'description': 'Special menu items for the new year',
  'tags': ['Meal Deal', 'YRW2026'],
  'isRecurring': true,
  'recurrenceRule': {
    'daySchedules': {
      '1': { 'startTime': '12:00', 'endTime': '15:00' },  // Monday: Lunch
      '2': { 'startTime': '12:00', 'endTime': '15:00' },  // Tuesday: Lunch
      '3': { 'startTime': '12:00', 'endTime': '15:00' },  // Wednesday: Lunch
      '4': { 'startTime': '12:00', 'endTime': '15:00' },  // Thursday: Lunch
      '5': { 'startTime': '12:00', 'endTime': '15:00' }   // Friday: Lunch
    },
    'startDate': Timestamp.fromDate(DateTime(2025, 1, 1)),  // Jan 1, 2025
    'endDate': Timestamp.fromDate(DateTime(2025, 1, 14))    // Jan 14, 2025
  },
  'createdAt': FieldValue.serverTimestamp(),
  'updatedAt': FieldValue.serverTimestamp(),
});
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Saving Timestamps

```dart
// WRONG - Don't do this!
await firestore.collection('experiences').add({
  'startAt': Timestamp.fromDate(startDate),  // ❌ WRONG
  'endAt': Timestamp.fromDate(endDate),      // ❌ WRONG
  // ...
});
```

**Why it's wrong**: The `experiences` collection is for definitions only, not time-based data. Timestamps go in `experienceInstances` (auto-generated).

### ❌ Mistake 2: Cost as String

```dart
// WRONG - Don't do this!
'cost': costController.text,  // ❌ WRONG - this is a string
'cost': '$15',                // ❌ WRONG - this is a string
'cost': '15',                 // ❌ WRONG - this is a string
```

**Correct way**:
```dart
// CORRECT
'cost': 15,                                    // int
'cost': 15.50,                                 // double
'cost': double.tryParse(costText) ?? null,     // convert from text field
```

### ❌ Mistake 3: Old Recurrence Format

```dart
// WRONG - Don't use old format
'recurrence': [1, 3, 5],  // ❌ WRONG - old format
'recurrenceRule': {
  'daysOfWeek': [1, 3, 5],  // ❌ WRONG - old format
  'startTime': '19:00',
  'endTime': '21:00',
}
```

**Correct way**:
```dart
// CORRECT - Use new daySchedules format
'recurrenceRule': {
  'daySchedules': {
    '1': { 'startTime': '19:00', 'endTime': '21:00' },  // Monday
    '3': { 'startTime': '19:00', 'endTime': '21:00' },  // Wednesday
    '5': { 'startTime': '19:00', 'endTime': '21:00' }   // Friday
  }
}
```

### ❌ Mistake 4: Missing isRecurring

```dart
// WRONG - Always include isRecurring
await firestore.collection('experiences').add({
  'recurrenceRule': { ... },  // ❌ Missing isRecurring field
  // ...
});
```

**Correct way**:
```dart
// CORRECT
'isRecurring': true,
'recurrenceRule': { ... },
```

### ❌ Mistake 5: Wrong Type Value

```dart
// WRONG
'type': 'Event',      // ❌ Wrong case
'type': 'EVENT',      // ❌ Wrong case
'type': 0,            // ❌ Wrong type (should be string)

// CORRECT
'type': 'event',      // ✅ Lowercase string
'type': 'special',    // ✅ Lowercase string
```

---

## Field Type Conversion Guide

### Converting Cost from Text Input

If your form uses a text field for cost:

```dart
// Get cost from text field
String? costText = costController.text.trim();

// Convert to number (handles both int and double)
num? cost;
if (costText.isNotEmpty) {
  // Try double first (handles decimals)
  cost = double.tryParse(costText);
  // If not a double, try int
  if (cost == null) {
    cost = int.tryParse(costText);
  }
}

// Save (will be null if invalid or empty)
'cost': cost,  // This is now a number or null, not a string
```

### Converting Time from Time Picker

If your form uses a time picker:

```dart
// If you have a TimeOfDay object
TimeOfDay selectedTime = TimePickerResult;

// Convert to "HH:mm" format string
String startTime = '${selectedTime.hour.toString().padLeft(2, '0')}:'
                   '${selectedTime.minute.toString().padLeft(2, '0')}';

// Use in recurrenceRule
'recurrenceRule': {
  'daysOfWeek': selectedDays,
  'startTime': startTime,  // e.g., "20:00"
  'endTime': endTime,      // e.g., "23:00"
}
```

### Converting Days Selection

If your form uses day checkboxes/buttons:

```dart
// Example: User selects Monday, Wednesday, Friday
List<bool> daySelections = [false, true, false, true, false, true, false];
//                            Sun   Mon   Tue   Wed   Thu   Fri   Sat
String startTime = '19:00';  // From time picker
String endTime = '21:00';    // From time picker

// Convert to daySchedules object
Map<String, Map<String, String>> daySchedules = {};
for (int i = 0; i < daySelections.length; i++) {
  if (daySelections[i]) {
    daySchedules[i.toString()] = {
      'startTime': startTime,
      'endTime': endTime,
    };
  }
}
// Result: {
//   '1': { 'startTime': '19:00', 'endTime': '21:00' },  // Monday
//   '3': { 'startTime': '19:00', 'endTime': '21:00' },  // Wednesday
//   '5': { 'startTime': '19:00', 'endTime': '21:00' }   // Friday
// }

// Use in recurrenceRule
'recurrenceRule': {
  'daySchedules': daySchedules,
}
```

**Note**: If different days have different times, you'll need to store per-day times and build the `daySchedules` object accordingly.

---

## Validation Checklist

Before saving, verify:

- [ ] `venueId` is a non-empty string matching a venue document ID
- [ ] `type` is exactly `"event"` or `"special"` (lowercase)
- [ ] `title` is non-empty string
- [ ] `description` is non-empty string
- [ ] `isRecurring` is boolean (`true` or `false`)
- [ ] If `isRecurring == true`:
  - [ ] `recurrenceRule` is provided
  - [ ] `recurrenceRule.daySchedules` is an object with day numbers (0-6) as keys
  - [ ] Each day in `daySchedules` has `startTime` and `endTime` as "HH:mm" format strings
  - [ ] `recurrenceRule.startDate` and `recurrenceRule.endDate` are optional Timestamps (if provided)
- [ ] `cost` is number (int or double) or null, NOT string
- [ ] `tags` is array of strings (max 3) or null
- [ ] `genre` is string or null (only relevant when tags include "Live Music" or "DJ Night")
- [ ] `createdAt` and `updatedAt` are Timestamps (use `FieldValue.serverTimestamp()`)
- [ ] NO fields named `startAt`, `endAt`, `startTime`, or `endTime` as Timestamps
- [ ] NO field named `recurrence` (old format)
- [ ] NO field named `daysOfWeek` in `recurrenceRule` (old format - use `daySchedules` instead)

---

## Testing After Implementation

1. **Create a test experience** via admin portal
2. **Check Firestore Console**:
   - Document is in `experiences` collection (not `experienceInstances`)
   - `isRecurring` field type is "boolean"
   - `cost` field type is "number" (if provided)
   - `recurrenceRule` exists with correct structure (if recurring)
   - NO `startAt` or `endAt` fields exist
3. **Verify in app**: Check that the experience appears correctly

---

## Quick Reference: Days of Week

| Day | Number | Array Index |
|-----|--------|-------------|
| Sunday | 0 | `[0]` |
| Monday | 1 | `[1]` |
| Tuesday | 2 | `[2]` |
| Wednesday | 3 | `[3]` |
| Thursday | 4 | `[4]` |
| Friday | 5 | `[5]` |
| Saturday | 6 | `[6]` |

**Examples**:
- Monday only: `[1]`
- Weekdays: `[1, 2, 3, 4, 5]`
- Weekend: `[0, 6]` or `[6, 0]`
- Tuesday & Thursday: `[2, 4]`

---

## Summary

**Remember**: 
- `experiences` = WHAT (definition, no timestamps)
- `experienceInstances` = WHEN (auto-generated, has timestamps)
- Cost = number, not string
- Recurrence = `recurrenceRule` object with `daySchedules` (not `daysOfWeek` array)
- Always include `isRecurring` boolean
- Tags = array of strings (max 3), or null
- Genre = string (for "Live Music" or "DJ Night" tags), or null
- Use `daySchedules` object format: `{ "1": { "startTime": "17:00", "endTime": "19:00" } }`
- Each day can have different times
- Optional `startDate` and `endDate` for limited-time recurring experiences
