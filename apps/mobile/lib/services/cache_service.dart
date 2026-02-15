import 'package:flutter/foundation.dart';
import '../models/venue_model.dart';
import '../models/experience_model.dart';

/// Simple in-memory cache for venues and experiences
/// This reduces repeated Firestore queries when navigating between screens
class CacheService {
  static final CacheService _instance = CacheService._internal();
  factory CacheService() => _instance;
  CacheService._internal();

  // Cache for venues - key: venueId, value: VenueModel
  final Map<String, VenueModel> _venueCache = {};
  
  // Cache for experiences - key: experienceId, value: ExperienceModel
  final Map<String, ExperienceModel> _experienceCache = {};
  
  // Cache timestamps to implement TTL (Time To Live)
  final Map<String, DateTime> _venueCacheTimestamps = {};
  final Map<String, DateTime> _experienceCacheTimestamps = {};
  
  // Cache duration (5 minutes)
  static const Duration _cacheDuration = Duration(minutes: 5);

  /// Get a venue from cache
  VenueModel? getVenue(String venueId) {
    final cached = _venueCache[venueId];
    if (cached != null) {
      final timestamp = _venueCacheTimestamps[venueId];
      if (timestamp != null && DateTime.now().difference(timestamp) < _cacheDuration) {
        if (kDebugMode) {
          debugPrint('CacheService: Venue cache HIT for $venueId');
        }
        return cached;
      } else {
        // Cache expired, remove it
        _venueCache.remove(venueId);
        _venueCacheTimestamps.remove(venueId);
        if (kDebugMode) {
          debugPrint('CacheService: Venue cache EXPIRED for $venueId');
        }
      }
    }
    if (kDebugMode) {
      debugPrint('CacheService: Venue cache MISS for $venueId');
    }
    return null;
  }

  /// Cache a venue
  void cacheVenue(VenueModel venue) {
    _venueCache[venue.venueId] = venue;
    _venueCacheTimestamps[venue.venueId] = DateTime.now();
    if (kDebugMode) {
      debugPrint('CacheService: Cached venue ${venue.venueId}');
    }
  }

  /// Cache multiple venues
  void cacheVenues(List<VenueModel> venues) {
    for (final venue in venues) {
      cacheVenue(venue);
    }
  }

  /// Get an experience from cache
  ExperienceModel? getExperience(String experienceId) {
    final cached = _experienceCache[experienceId];
    if (cached != null) {
      final timestamp = _experienceCacheTimestamps[experienceId];
      if (timestamp != null && DateTime.now().difference(timestamp) < _cacheDuration) {
        if (kDebugMode) {
          debugPrint('CacheService: Experience cache HIT for $experienceId');
        }
        return cached;
      } else {
        // Cache expired, remove it
        _experienceCache.remove(experienceId);
        _experienceCacheTimestamps.remove(experienceId);
        if (kDebugMode) {
          debugPrint('CacheService: Experience cache EXPIRED for $experienceId');
        }
      }
    }
    if (kDebugMode) {
      debugPrint('CacheService: Experience cache MISS for $experienceId');
    }
    return null;
  }

  /// Cache an experience
  void cacheExperience(ExperienceModel experience) {
    _experienceCache[experience.experienceId] = experience;
    _experienceCacheTimestamps[experience.experienceId] = DateTime.now();
    if (kDebugMode) {
      debugPrint('CacheService: Cached experience ${experience.experienceId}');
    }
  }

  /// Cache multiple experiences
  void cacheExperiences(List<ExperienceModel> experiences) {
    for (final experience in experiences) {
      cacheExperience(experience);
    }
  }

  /// Get multiple experiences from cache
  List<ExperienceModel> getExperiences(List<String> experienceIds) {
    final cached = <ExperienceModel>[];
    final missing = <String>[];
    
    for (final id in experienceIds) {
      final experience = getExperience(id);
      if (experience != null) {
        cached.add(experience);
      } else {
        missing.add(id);
      }
    }
    
    if (kDebugMode) {
      debugPrint('CacheService: getExperiences - found ${cached.length}/${experienceIds.length} in cache, missing: $missing');
    }
    
    return cached;
  }

  /// Clear all caches
  void clearAll() {
    _venueCache.clear();
    _experienceCache.clear();
    _venueCacheTimestamps.clear();
    _experienceCacheTimestamps.clear();
    if (kDebugMode) {
      debugPrint('CacheService: Cleared all caches');
    }
  }

  /// Clear expired entries
  void clearExpired() {
    final now = DateTime.now();
    
    // Clear expired venues
    final expiredVenues = _venueCacheTimestamps.entries
        .where((entry) => now.difference(entry.value) >= _cacheDuration)
        .map((entry) => entry.key)
        .toList();
    for (final id in expiredVenues) {
      _venueCache.remove(id);
      _venueCacheTimestamps.remove(id);
    }
    
    // Clear expired experiences
    final expiredExperiences = _experienceCacheTimestamps.entries
        .where((entry) => now.difference(entry.value) >= _cacheDuration)
        .map((entry) => entry.key)
        .toList();
    for (final id in expiredExperiences) {
      _experienceCache.remove(id);
      _experienceCacheTimestamps.remove(id);
    }
    
    if (kDebugMode && (expiredVenues.isNotEmpty || expiredExperiences.isNotEmpty)) {
      debugPrint('CacheService: Cleared ${expiredVenues.length} expired venues and ${expiredExperiences.length} expired experiences');
    }
  }

  /// Get cache statistics
  Map<String, dynamic> getStats() {
    return {
      'venues': _venueCache.length,
      'experiences': _experienceCache.length,
    };
  }
}
