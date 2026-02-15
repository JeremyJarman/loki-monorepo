# Location Debug Guide

If you're testing on an emulator and getting a default location (like 37.4219983, -122.084 which is Google's HQ in Mountain View, CA), you can override it with a custom location for testing.

## Option 1: Set Location in Code (Quick Testing)

You can temporarily set a debug location override in your code. This only works in debug mode.

### Example: Set a custom location

In any screen's `initState()` or where you initialize location, add:

```dart
import 'package:geolocator/geolocator.dart';
import '../services/location_service.dart';

// In your initState() or wherever you need it:
if (kDebugMode) {
  // Example: Set to Dublin, Ireland
  LocationService.setDebugLocationOverride(
    Position(
      latitude: 53.3498,
      longitude: -6.2603,
      timestamp: DateTime.now(),
      accuracy: 10,
      altitude: 0,
      heading: 0,
      speed: 0,
      speedAccuracy: 0,
    ),
  );
}
```

### Example: Clear the override (use device location)

```dart
if (kDebugMode) {
  LocationService.clearDebugLocationOverride();
}
```

## Option 2: Change Emulator Location (Android Studio)

1. Open Android Studio
2. Click the **Extended Controls** button (three dots) in the emulator toolbar
3. Go to **Location** tab
4. Enter your desired coordinates:
   - **Latitude**: Your desired latitude
   - **Longitude**: Your desired longitude
5. Click **Send** to update the location

### Common Test Locations

- **Dublin, Ireland**: 53.3498, -6.2603
- **London, UK**: 51.5074, -0.1278
- **New York, USA**: 40.7128, -74.0060
- **Tokyo, Japan**: 35.6762, 139.6503
- **Sydney, Australia**: -33.8688, 151.2093

## Option 3: Use a Real Device

For the most accurate location testing, use a real device with GPS enabled. The app will automatically use the device's actual location.

## Notes

- Debug location override only works in **debug mode** (not in release builds)
- The override will persist until you clear it or restart the app
- If you set an override, it will be used instead of the device/emulator location
- Make sure to clear the override when you want to test with actual device location
