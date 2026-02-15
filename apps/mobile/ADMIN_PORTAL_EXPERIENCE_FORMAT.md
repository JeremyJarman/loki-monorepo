# Admin Portal Experience Save Format

## Required Format for Saving Experiences

The admin portal (`loki-admin`) **MUST** save experiences to the `experiences` collection using this exact structure:

### Collection: `experiences`

### Required Fields:

```dart
{
  'venueId': string,           // REQUIRED - The venue document ID
  'type': string,              // REQUIRED - Either "event" or "special" (lowercase)
  'title': string,             // REQUIRED - Experience title
  'description': string,       // REQUIRED - Experience description
  'isRecurring': boolean,      // REQUIRED - true if recurring, false if one-time
  'createdAt': Timestamp,      // REQUIRED - Use FieldValue.serverTimestamp() or Timestamp.now()
  'updatedAt': Timestamp,      // REQUIRED - Use FieldValue.serverTimestamp() or Timestamp.now()
}
```

### Optional Fields:

```dart
{
  'imageUrl': string?,         // Optional - Image URL
  'cost': number?,             // Optional - Can be int or double (NOT string!)
  'recurrenceRule': {          // Optional - Only if isRecurring == true
    'daysOfWeek': number[],    // Array of integers: 0=Sun, 1=Mon, ..., 6=Sat
    'startTime': string,       // "HH:mm" format, e.g., "20:00"
    'endTime': string,         // "HH:mm" format, e.g., "23:00"
  }
}
```

## ❌ DO NOT SAVE:

- ❌ `startAt` or `startTime` (Timestamp)
- ❌ `endAt` or `endTime` (Timestamp)
- ❌ `recurrence` (old format - use `recurrenceRule` instead)
- ❌ Any date/time fields in `experiences` collection

## ✅ Correct Example:

### One-Time Event:

```dart
await firestore.collection('experiences').add({
  'venueId': 'venue123',
  'type': 'event',
  'title': 'Live Music Night',
  'description': 'Join us for live music',
  'imageUrl': 'https://example.com/image.jpg',
  'cost': 15,  // number, not string!
  'isRecurring': false,
  'createdAt': FieldValue.serverTimestamp(),
  'updatedAt': FieldValue.serverTimestamp(),
});
```

### Recurring Event:

```dart
await firestore.collection('experiences').add({
  'venueId': 'venue123',
  'type': 'event',
  'title': 'Weekly Trivia',
  'description': 'Join us every Tuesday for trivia',
  'imageUrl': 'https://example.com/image.jpg',
  'cost': 10,  // number, not string!
  'isRecurring': true,
  'recurrenceRule': {
    'daysOfWeek': [2],        // Tuesday (0=Sun, 1=Mon, 2=Tue, etc.)
    'startTime': '19:00',     // 7:00 PM
    'endTime': '21:00',       // 9:00 PM
  },
  'createdAt': FieldValue.serverTimestamp(),
  'updatedAt': FieldValue.serverTimestamp(),
});
```

### Multiple Days Recurring:

```dart
await firestore.collection('experiences').add({
  'venueId': 'venue123',
  'type': 'special',
  'title': 'Happy Hour',
  'description': 'Half-price drinks',
  'isRecurring': true,
  'recurrenceRule': {
    'daysOfWeek': [1, 2, 3, 4, 5],  // Monday through Friday
    'startTime': '17:00',            // 5:00 PM
    'endTime': '19:00',              // 7:00 PM
  },
  'createdAt': FieldValue.serverTimestamp(),
  'updatedAt': FieldValue.serverTimestamp(),
});
```

## Field Type Requirements:

| Field | Type | Notes |
|-------|------|-------|
| `venueId` | `string` | Must match venue document ID exactly |
| `type` | `string` | Must be exactly `"event"` or `"special"` (lowercase) |
| `title` | `string` | Required, non-empty |
| `description` | `string` | Required, non-empty |
| `imageUrl` | `string?` | Optional, can be null |
| `cost` | `number?` | Optional, can be `int` or `double`, NOT string |
| `isRecurring` | `boolean` | Required, must be true or false |
| `recurrenceRule` | `object?` | Optional, only if `isRecurring == true` |
| `recurrenceRule.daysOfWeek` | `number[]` | Array of integers 0-6 |
| `recurrenceRule.startTime` | `string` | "HH:mm" format (24-hour) |
| `recurrenceRule.endTime` | `string` | "HH:mm" format (24-hour) |
| `createdAt` | `Timestamp` | Use `FieldValue.serverTimestamp()` |
| `updatedAt` | `Timestamp` | Use `FieldValue.serverTimestamp()` |

## Common Mistakes to Avoid:

1. ❌ **Saving timestamps** - Don't save `startAt`, `endAt`, `startTime`, or `endTime` as Timestamps
2. ❌ **Cost as string** - Don't save cost as `"$15"` or `"15"`, save as number `15` or `15.00`
3. ❌ **Wrong recurrence format** - Don't use old `recurrence` array, use `recurrenceRule` object
4. ❌ **Missing isRecurring** - Always include `isRecurring` boolean field
5. ❌ **Wrong type value** - Must be exactly `"event"` or `"special"` (lowercase, with quotes)

## Validation Checklist:

Before saving, verify:

- [ ] `venueId` is a valid string matching a venue document ID
- [ ] `type` is exactly `"event"` or `"special"` (lowercase)
- [ ] `title` is non-empty string
- [ ] `description` is non-empty string
- [ ] `isRecurring` is boolean (true/false)
- [ ] If `isRecurring == true`, `recurrenceRule` is provided with:
  - [ ] `daysOfWeek` is array of integers (0-6)
  - [ ] `startTime` is "HH:mm" format string
  - [ ] `endTime` is "HH:mm" format string
- [ ] `cost` is number (int or double) or null, NOT string
- [ ] `createdAt` and `updatedAt` are Timestamps
- [ ] NO timestamp fields like `startAt`, `endAt`, `startTime`, `endTime`

## Testing:

After saving an experience, verify in Firestore Console:

1. Document is in `experiences` collection (not `experienceInstances`)
2. No `startAt` or `endAt` fields exist
3. `cost` field type is "number" (not "string")
4. `isRecurring` field type is "boolean"
5. If recurring, `recurrenceRule` exists with correct structure
