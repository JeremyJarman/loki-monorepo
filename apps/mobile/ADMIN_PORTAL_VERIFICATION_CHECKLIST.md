# Admin Portal Verification Checklist

Use this checklist to verify your `loki-admin` forms are saving experiences correctly.

## ✅ Required Fields Check

When saving an experience, ensure these fields are included:

- [ ] `venueId` (string) - Must match venue document ID
- [ ] `type` (string) - Exactly `"event"` or `"special"` (lowercase)
- [ ] `title` (string) - Non-empty
- [ ] `description` (string) - Non-empty
- [ ] `isRecurring` (boolean) - Must be `true` or `false`
- [ ] `createdAt` (Timestamp) - Use `FieldValue.serverTimestamp()`
- [ ] `updatedAt` (Timestamp) - Use `FieldValue.serverTimestamp()`

## ✅ Optional Fields Check

- [ ] `imageUrl` (string?) - Can be null/omitted
- [ ] `cost` (number?) - Must be `int` or `double`, NOT string
- [ ] `recurrenceRule` (object?) - Only if `isRecurring == true`

## ❌ Fields That Should NOT Be Saved

Verify these are NOT being saved to `experiences`:

- [ ] `startAt` (Timestamp) - ❌ DO NOT SAVE
- [ ] `endAt` (Timestamp) - ❌ DO NOT SAVE
- [ ] `startTime` (Timestamp) - ❌ DO NOT SAVE
- [ ] `endTime` (Timestamp) - ❌ DO NOT SAVE
- [ ] `recurrence` (old format) - ❌ Use `recurrenceRule` instead

## 🔍 Code Pattern to Look For

### ✅ CORRECT Save Pattern:

```dart
// Good example
await firestore.collection('experiences').add({
  'venueId': selectedVenueId,
  'type': selectedType, // "event" or "special"
  'title': titleController.text,
  'description': descriptionController.text,
  'imageUrl': imageUrl, // optional
  'cost': cost != null ? double.tryParse(cost) ?? int.tryParse(cost) : null, // number, not string!
  'isRecurring': isRecurring,
  if (isRecurring) 'recurrenceRule': {
    'daysOfWeek': selectedDays, // [0, 1, 2, ...]
    'startTime': startTime, // "HH:mm" format
    'endTime': endTime, // "HH:mm" format
  },
  'createdAt': FieldValue.serverTimestamp(),
  'updatedAt': FieldValue.serverTimestamp(),
});
```

### ❌ WRONG Patterns to Avoid:

```dart
// BAD - Saving timestamps
await firestore.collection('experiences').add({
  'startAt': Timestamp.fromDate(startDate), // ❌ WRONG
  'endAt': Timestamp.fromDate(endDate),     // ❌ WRONG
  // ...
});

// BAD - Cost as string
'cost': costController.text, // ❌ WRONG - should be number

// BAD - Old recurrence format
'recurrence': [1, 3, 5], // ❌ WRONG - use recurrenceRule instead
```

## 📋 Specific Checks for Your Code

1. **Find the experience save/create function** in loki-admin
2. **Check the collection name**: Should be `'experiences'` (plural)
3. **Check cost field**: 
   - If using a text field, convert to number: `double.tryParse(costText) ?? int.tryParse(costText)`
   - Should NOT be saved as string
4. **Check recurrence handling**:
   - If `isRecurring == true`, should save `recurrenceRule` object
   - Should NOT save `recurrence` array (old format)
   - `recurrenceRule` should have: `daysOfWeek`, `startTime`, `endTime`
5. **Check for timestamp fields**:
   - Search for `startAt`, `endAt`, `startTime`, `endTime` in save code
   - These should NOT be saved to `experiences` collection

## 🧪 Test After Changes

After updating the admin portal:

1. Create a new experience via the admin portal
2. Check Firestore Console:
   - Document should be in `experiences` collection
   - Should have `isRecurring` (boolean)
   - Should have `recurrenceRule` (if recurring) with correct structure
   - Should NOT have `startAt` or `endAt`
   - `cost` should be type "number" (not "string")
3. Verify in the app that instances are generated (if backend is set up)

## 📝 What to Share

If you want me to review your admin portal code, please share:
- The file path where experiences are saved
- The function/method that handles the save operation
- Or point me to the specific files in loki-admin
