# Coordinate Format Guide for Venue Locations

## Google Maps URL Format

When you copy coordinates from a Google Maps URL like:
```
https://www.google.com/maps?q=48.2022365,16.3599378
```

The format is: **`latitude,longitude`** (latitude first, then longitude)

## Firestore GeoPoint Format

Firestore uses `GeoPoint` which expects:
- **First parameter**: `latitude` (must be between -90 and 90)
- **Second parameter**: `longitude` (must be between -180 and 180)

## Example

For coordinates `48.2022365,16.3599378` from Google Maps:
- **Latitude**: `48.2022365`
- **Longitude**: `16.3599378`

When creating a GeoPoint in Firestore:
```javascript
// Correct format
new GeoPoint(48.2022365, 16.3599378)  // lat, lng

// WRONG - Don't swap them!
new GeoPoint(16.3599378, 48.2022365)  // This would be incorrect
```

## Common Issues

1. **Swapped coordinates**: If you accidentally swap lat/lng, distances will be wildly wrong
   - Example: Vienna, Austria should be `48.2, 16.3` not `16.3, 48.2`
   - If swapped, a venue in Vienna might show as being in a completely different part of the world

2. **Negative coordinates**: Make sure to include the negative sign if present
   - Example: New York is `40.7128, -74.0060` (longitude is negative)

3. **Coordinate validation**:
   - Latitude: -90 to 90 (North/South)
   - Longitude: -180 to 180 (East/West)

## How to Verify Coordinates

1. Check the debug console when the app runs - you'll see logs like:
   ```
   VenueCardMini: Venue location - Lat: 48.2022365, Lon: 16.3599378
   LocationService: Distance calculation - From: (...) To: (48.2022365, 16.3599378) Distance: Xm
   ```

2. Verify in Google Maps:
   - Go to https://www.google.com/maps
   - Paste the coordinates: `48.2022365,16.3599378`
   - It should show the correct location

3. Check Firestore:
   - In Firebase Console, check the venue document
   - The `location` field should show a GeoPoint
   - Verify the latitude and longitude values match what you expect

## Debugging Distance Issues

If distances are still wrong after verifying coordinates:

1. **Check user location accuracy**: Look for logs like:
   ```
   LocationService: Location accuracy status: ...
   LocationService: Got position - Lat: X, Lon: Y, Accuracy: Zm
   ```
   - If accuracy is > 100m, the user's location might be inaccurate

2. **Check coordinate order**: Make sure you're using:
   - `venue.location.latitude` (not `.longitude`)
   - `venue.location.longitude` (not `.latitude`)

3. **Test with known locations**: 
   - Use a venue you know the exact location of
   - Compare the distance shown in the app with Google Maps distance
   - If they match, coordinates are correct
   - If they don't, coordinates might be swapped or incorrect
