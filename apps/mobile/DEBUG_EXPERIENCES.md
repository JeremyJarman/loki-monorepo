# Debugging Experience Loading Issues

## What the Code is Looking For

The app queries the Firestore `experiences` collection with these filters:

### For Events Tab:
- Collection: `experiences`
- Where: `venueId` == `<venue_id>` AND `type` == `"event"`

### For Specials Tab:
- Collection: `experiences`
- Where: `venueId` == `<venue_id>` AND `type` == `"special"`

## Checklist to Verify Your Database

1. **Collection Name**
   - ✅ Is the collection named exactly `experiences`? (not `experience`, `Experiences`, etc.)

2. **Field Names**
   - ✅ Is the venue ID field named `venueId`? (lowercase 'd', not `venueID` or `venue_id`)
   - ✅ Is the type field named `type`? (lowercase)
   - ✅ Is the title field named `title`?

3. **Field Values**
   - ✅ Does `venueId` match the actual venue document ID?
   - ✅ Is `type` exactly `"event"` or `"special"`? (case-sensitive, with quotes)
   - ✅ Is `title` a non-empty string?

4. **Data Types**
   - ✅ Is `startTime` a Firestore Timestamp? (not a string or number)
   - ✅ Is `endTime` a Firestore Timestamp? (not a string or number)
   - ✅ Is `recurrence` an array of integers? (e.g., `[1, 3, 5]`)

## Example of Correct Document Structure

In Firestore Console, a document should look like:

```
Collection: experiences
Document ID: (auto-generated or custom)

Fields:
├── venueId (string): "your-venue-id-here"
├── title (string): "Live Music Night"
├── type (string): "event"
├── recurrence (array): [5, 6]  // Friday, Saturday
├── startTime (timestamp): 2024-01-15 20:00:00 UTC
├── endTime (timestamp): 2024-01-15 23:00:00 UTC
├── description (string): "Join us for live music"
├── imageUrl (string): "https://..."
└── cost (string): "$15"
```

## Common Issues and Solutions

### Issue: "No events scheduled" message
**Possible causes:**
1. No documents exist in `experiences` collection
2. `venueId` field doesn't match the venue's document ID
3. `type` field is not exactly `"event"` or `"special"`
4. Field name is `venueID` instead of `venueId`

**Solution:** Check the venue's document ID and ensure experiences have matching `venueId` field

### Issue: Error loading events
**Possible causes:**
1. Firestore permissions issue
2. Network connectivity issue
3. Invalid data types (e.g., startTime is a string instead of Timestamp)

**Solution:** Check Firestore console for errors, verify network connection, ensure data types are correct

### Issue: Events show but times are wrong
**Possible causes:**
1. `startTime` or `endTime` are stored as strings instead of Timestamps
2. Timezone issues

**Solution:** Ensure times are stored as Firestore Timestamp objects

## How to Test

1. Open Firebase Console → Firestore Database
2. Navigate to `experiences` collection
3. Check if documents exist
4. Verify one document has:
   - `venueId` field matching a venue ID from your `venues` collection
   - `type` field set to `"event"` or `"special"`
5. In the app, navigate to that venue's profile
6. Check the Events or Specials tab
7. The app will now show debug info including the venue ID being queried

## Quick Test Query

You can test in Firebase Console with this query:
```
Collection: experiences
Filter: venueId == "your-venue-id"
Filter: type == "event"
```

If this returns results in Firebase Console but not in the app, there may be a code issue.
If this returns no results in Firebase Console, the data structure needs to be fixed.
