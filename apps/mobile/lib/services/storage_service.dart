import 'dart:io';
import 'dart:async';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart';

class StorageService {
  final FirebaseStorage? _storage;
  final ImagePicker _imagePicker = ImagePicker();
  
  // Flag to track if Storage is available
  bool _isStorageAvailable = false;

  StorageService() : _storage = _tryInitializeStorage() {
    _checkStorageAvailability();
  }

  // Try to initialize Storage, return null if not available
  static FirebaseStorage? _tryInitializeStorage() {
    try {
      return FirebaseStorage.instance;
    } catch (e) {
      debugPrint('Firebase Storage not available: $e');
      return null;
    }
  }

  // Check if Storage is actually available
  Future<void> _checkStorageAvailability() async {
    final storage = _storage;
    if (storage == null) {
      _isStorageAvailable = false;
      return;
    }
    try {
      // Try a simple operation to verify Storage is enabled
      await storage.ref().child('.test').getMetadata().timeout(
        const Duration(seconds: 2),
        onTimeout: () {
          throw TimeoutException('Storage check timeout');
        },
      );
      _isStorageAvailable = true;
    } catch (e) {
      // Storage might not be enabled or configured
      _isStorageAvailable = false;
      debugPrint('Firebase Storage check failed: $e');
      debugPrint('Note: Storage is optional. App will work without it.');
    }
  }

  bool get isStorageAvailable => _isStorageAvailable;

  /// Upload profile image. Returns null if Storage is not available.
  /// Uses new storage structure: users/{userId}/profile.jpg
  Future<String?> uploadProfileImage(String userId, File imageFile) async {
    final storage = _storage;
    if (storage == null || !_isStorageAvailable) {
      debugPrint('Storage not available. Profile image upload skipped.');
      return null;
    }
    try {
      // Use new clean structure: users/{userId}/profile.jpg
      final ref = storage.ref().child('users/$userId/profile.jpg');
      await ref.putFile(imageFile);
      return await ref.getDownloadURL();
    } catch (e) {
      debugPrint('Failed to upload profile image: $e');
      return null; // Return null instead of throwing
    }
  }

  /// Upload venue image. Returns null if Storage is not available.
  Future<String?> uploadVenueImage(String venueId, File imageFile, int index) async {
    final storage = _storage;
    if (storage == null || !_isStorageAvailable) {
      debugPrint('Storage not available. Venue image upload skipped.');
      return null;
    }
    try {
      final ref = storage.ref().child('venue_images/$venueId/$index.jpg');
      await ref.putFile(imageFile);
      return await ref.getDownloadURL();
    } catch (e) {
      debugPrint('Failed to upload venue image: $e');
      return null; // Return null instead of throwing
    }
  }

  /// Upload event image. Returns null if Storage is not available.
  Future<String?> uploadEventImage(String eventId, File imageFile) async {
    final storage = _storage;
    if (storage == null || !_isStorageAvailable) {
      debugPrint('Storage not available. Event image upload skipped.');
      return null;
    }
    try {
      final ref = storage.ref().child('event_images/$eventId.jpg');
      await ref.putFile(imageFile);
      return await ref.getDownloadURL();
    } catch (e) {
      debugPrint('Failed to upload event image: $e');
      return null; // Return null instead of throwing
    }
  }

  Future<XFile?> pickImage() async {
    return await _imagePicker.pickImage(source: ImageSource.gallery);
  }

  Future<XFile?> pickImageFromCamera() async {
    return await _imagePicker.pickImage(source: ImageSource.camera);
  }

  /// Upload list image. Returns null if Storage is not available.
  /// Uses storage structure: lists/{listId}/image.jpg
  Future<String?> uploadListImage(String listId, File imageFile) async {
    final storage = _storage;
    if (storage == null || !_isStorageAvailable) {
      debugPrint('Storage not available. List image upload skipped.');
      return null;
    }
    try {
      final ref = storage.ref().child('lists/$listId/image.jpg');
      await ref.putFile(imageFile);
      return await ref.getDownloadURL();
    } catch (e) {
      debugPrint('Failed to upload list image: $e');
      return null; // Return null instead of throwing
    }
  }
}

