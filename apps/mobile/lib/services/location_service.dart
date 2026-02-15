import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:flutter/foundation.dart';

class LocationService {
  // Debug: Set a custom location for testing (set to null to use device location)
  // Example: Position(latitude: 52.5200, longitude: 13.4050, timestamp: DateTime.now(), accuracy: 10, altitude: 0, heading: 0, speed: 0, speedAccuracy: 0)
  static Position? _debugOverrideLocation;

  /// Set a debug location override (only works in debug mode)
  static void setDebugLocationOverride(Position? position) {
    if (kDebugMode) {
      _debugOverrideLocation = position;
      debugPrint('LocationService: Debug location override set to: ${position?.latitude}, ${position?.longitude}');
    }
  }

  /// Clear the debug location override
  static void clearDebugLocationOverride() {
    if (kDebugMode) {
      _debugOverrideLocation = null;
      debugPrint('LocationService: Debug location override cleared');
    }
  }

  Future<Position?> getCurrentLocation() async {
    // In debug mode, return override location if set
    if (kDebugMode && _debugOverrideLocation != null) {
      debugPrint('LocationService: Using debug location override - Lat: ${_debugOverrideLocation!.latitude}, Lon: ${_debugOverrideLocation!.longitude}');
      return _debugOverrideLocation;
    }
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (kDebugMode) {
        debugPrint('LocationService: Location services are disabled');
      }
      return null;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (kDebugMode) {
          debugPrint('LocationService: Location permission denied');
        }
        return null;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      if (kDebugMode) {
        debugPrint('LocationService: Location permission denied forever');
      }
      return null;
    }

    // Check location accuracy status
    try {
      final accuracyStatus = await Geolocator.getLocationAccuracy();
      if (kDebugMode) {
        debugPrint('LocationService: Location accuracy status: $accuracyStatus');
      }
      
      // On iOS, if accuracy is reduced, we might get inaccurate positions
      if (accuracyStatus == LocationAccuracyStatus.reduced) {
        if (kDebugMode) {
          debugPrint('LocationService: WARNING - Location accuracy is reduced. Distances may be inaccurate.');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('LocationService: Could not check accuracy status: $e');
      }
    }

    // Request high accuracy location
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10, // Update if moved 10 meters
        ),
      );
      
      if (kDebugMode) {
        debugPrint('LocationService: Got position - Lat: ${position.latitude}, Lon: ${position.longitude}, Accuracy: ${position.accuracy}m');
      }
      
      // Warn if accuracy is poor
      if (position.accuracy > 100) {
        if (kDebugMode) {
          debugPrint('LocationService: WARNING - Position accuracy is ${position.accuracy}m (poor). Distances may be inaccurate.');
        }
      }
      
      return position;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('LocationService: Error getting position: $e');
      }
      return null;
    }
  }

  double calculateDistance(
    double startLatitude,
    double startLongitude,
    double endLatitude,
    double endLongitude,
  ) {
    final distance = Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
    
    if (kDebugMode) {
      debugPrint('LocationService: Distance calculation - '
          'From: ($startLatitude, $startLongitude) '
          'To: ($endLatitude, $endLongitude) '
          'Distance: ${distance.toStringAsFixed(2)}m (${(distance / 1000).toStringAsFixed(2)}km)');
    }
    
    return distance;
  }

  String formatDistance(double distanceInMeters) {
    if (distanceInMeters < 1000) {
      return '${distanceInMeters.toStringAsFixed(0)}m';
    } else {
      return '${(distanceInMeters / 1000).toStringAsFixed(1)}km';
    }
  }

  Future<String?> getAddressFromCoordinates(
    double latitude,
    double longitude,
  ) async {
    try {
      List<Placemark> placemarks =
          await placemarkFromCoordinates(latitude, longitude);
      if (placemarks.isNotEmpty) {
        final place = placemarks[0];
        return '${place.street}, ${place.locality}, ${place.country}';
      }
    } catch (e) {
      return null;
    }
    return null;
  }
}

