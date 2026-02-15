import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geolocator/geolocator.dart';
import '../models/user_model.dart';
import '../models/venue_model.dart';
import '../models/event_model.dart';
import '../models/list_model.dart';
import '../models/experience_model.dart';
import '../models/experience_instance_model.dart';
import '../models/venue_preference.dart';
import '../models/onboarding_preferences.dart';
import 'cache_service.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final CacheService _cache = CacheService();

  // Users Collection
  Future<void> createUser(UserModel user) async {
    await _firestore.collection('users').doc(user.uid).set(user.toFirestore());
  }

  Future<UserModel?> getUser(String uid) async {
    final doc = await _firestore.collection('users').doc(uid).get();
    if (doc.exists) {
      return UserModel.fromFirestore(doc);
    }
    return null;
  }

  Future<bool> isHandleAvailable(String handle) async {
    if (handle.isEmpty) return false;
    
    final query = await _firestore
        .collection('users')
        .where('username', isEqualTo: handle.toLowerCase().trim())
        .limit(1)
        .get();
    
    return query.docs.isEmpty;
  }

  Future<UserModel?> getUserByHandle(String handle) async {
    final query = await _firestore
        .collection('users')
        .where('username', isEqualTo: handle.toLowerCase().trim())
        .limit(1)
        .get();
    
    if (query.docs.isNotEmpty) {
      return UserModel.fromFirestore(query.docs.first);
    }
    return null;
  }

  Future<void> updateUser(String uid, Map<String, dynamic> data) async {
    await _firestore.collection('users').doc(uid).update(data);
  }

  /// Load onboarding preferences from user document (optional fields).
  Future<OnboardingPreferences> getOnboardingPreferences(String uid) async {
    final doc = await _firestore.collection('users').doc(uid).get();
    if (!doc.exists || doc.data() == null) return const OnboardingPreferences();
    return OnboardingPreferences.fromFirestore(doc.data());
  }

  /// Save onboarding preferences to user document (merges with existing).
  Future<void> saveOnboardingPreferences(
    String uid,
    OnboardingPreferences prefs,
  ) async {
    await _firestore.collection('users').doc(uid).set(
          prefs.toFirestore(),
          SetOptions(merge: true),
        );
  }

  Stream<UserModel?> getUserStream(String uid) {
    return _firestore
        .collection('users')
        .doc(uid)
        .snapshots()
        .map((doc) => doc.exists ? UserModel.fromFirestore(doc) : null);
  }

  // User venue preferences (Likes.MD: Love, Like, Not my vibe)
  static const String _venuePreferencesSubcollection = 'venuePreferences';

  Future<void> setVenuePreference(
    String userId,
    String venueId,
    VenuePreference preference,
  ) async {
    final ref = _firestore
        .collection('users')
        .doc(userId)
        .collection(_venuePreferencesSubcollection)
        .doc(venueId);
    if (preference == VenuePreference.none) {
      await ref.delete();
    } else {
      await ref.set({'value': preference.firestoreValue});
    }
  }

  Stream<VenuePreference> getVenuePreferenceStream(String userId, String venueId) {
    return _firestore
        .collection('users')
        .doc(userId)
        .collection(_venuePreferencesSubcollection)
        .doc(venueId)
        .snapshots()
        .map((doc) {
      if (!doc.exists || doc.data() == null) return VenuePreference.none;
      final value = doc.data()?['value'] as String?;
      return VenuePreferenceX.fromFirestore(value);
    });
  }

  // Venues Collection
  Stream<List<VenueModel>> getVenuesStream() {
    return _firestore
        .collection('venues')
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => VenueModel.fromFirestore(doc))
            .toList());
  }

  Future<List<VenueModel>> getVenuesNearby(
    double latitude,
    double longitude,
    double radiusInKm,
  ) async {
    // Calculate bounding box for geospatial query
    final distance = radiusInKm * 1000; // Convert to meters
    final latDelta = distance / 111000; // Approximate degrees
    final lonDelta = distance / (111000 * (latitude / 90).abs());

    final minLat = latitude - latDelta;
    final maxLat = latitude + latDelta;
    final minLon = longitude - lonDelta;
    final maxLon = longitude + lonDelta;

    final query = await _firestore
        .collection('venues')
        .where('location.latitude', isGreaterThanOrEqualTo: minLat)
        .where('location.latitude', isLessThanOrEqualTo: maxLat)
        .get();

    // Filter by longitude and calculate actual distance
    final venues = query.docs
        .map((doc) => VenueModel.fromFirestore(doc))
        .where((venue) {
      final venueLon = venue.location.longitude;
      if (venueLon < minLon || venueLon > maxLon) return false;

      final distance = Geolocator.distanceBetween(
        latitude,
        longitude,
        venue.location.latitude,
        venue.location.longitude,
      );
      return distance <= distance;
    }).toList();

    // Sort by distance
    venues.sort((a, b) {
      final distA = Geolocator.distanceBetween(
        latitude,
        longitude,
        a.location.latitude,
        a.location.longitude,
      );
      final distB = Geolocator.distanceBetween(
        latitude,
        longitude,
        b.location.latitude,
        b.location.longitude,
      );
      return distA.compareTo(distB);
    });

    return venues;
  }

  Future<VenueModel?> getVenue(String venueId) async {
    // Check cache first
    final cached = _cache.getVenue(venueId);
    if (cached != null) {
      return cached;
    }
    
    // If not in cache, fetch from Firestore
    final doc = await _firestore.collection('venues').doc(venueId).get();
    if (doc.exists) {
      final venue = VenueModel.fromFirestore(doc);
      _cache.cacheVenue(venue);
      return venue;
    }
    return null;
  }

  Stream<VenueModel?> getVenueStream(String venueId) {
    return _firestore
        .collection('venues')
        .doc(venueId)
        .snapshots()
        .map((doc) {
          if (doc.exists) {
            final venue = VenueModel.fromFirestore(doc);
            _cache.cacheVenue(venue); // Cache when stream updates
            return venue;
          }
          return null;
        });
  }

  /// Get venues by IDs (one-shot). Uses cache first, then Firestore in batches of 10.
  Future<List<VenueModel>> getVenuesByIds(List<String> venueIds) async {
    if (venueIds.isEmpty) return [];
    final uniqueIds = venueIds.toSet().toList();
    final result = <VenueModel>[];
    final missing = <String>[];
    for (final id in uniqueIds) {
      final cached = _cache.getVenue(id);
      if (cached != null) {
        result.add(cached);
      } else {
        missing.add(id);
      }
    }
    if (missing.isEmpty) return result;
    for (var i = 0; i < missing.length; i += 10) {
      final batch = missing.skip(i).take(10).toList();
      final snapshot = await _firestore
          .collection('venues')
          .where(FieldPath.documentId, whereIn: batch)
          .get();
      for (final doc in snapshot.docs) {
        final venue = VenueModel.fromFirestore(doc);
        _cache.cacheVenue(venue);
        result.add(venue);
      }
    }
    return result;
  }

  // Events Collection
  Stream<List<EventModel>> getEventsStream() {
    return _firestore
        .collection('events')
        .orderBy('dateTime', descending: false)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => EventModel.fromFirestore(doc))
            .toList());
  }

  Future<EventModel?> getEvent(String eventId) async {
    final doc = await _firestore.collection('events').doc(eventId).get();
    if (doc.exists) {
      return EventModel.fromFirestore(doc);
    }
    return null;
  }

  Stream<List<EventModel>> getEventsByVenueId(String venueId) {
    return _firestore
        .collection('events')
        .where('venueId', isEqualTo: venueId)
        .snapshots()
        .map((snapshot) {
          final events = snapshot.docs
              .map((doc) => EventModel.fromFirestore(doc))
              .toList();
          // Sort by dateTime in memory (avoids needing composite index)
          events.sort((a, b) => a.dateTime.compareTo(b.dateTime));
          return events;
        });
  }

  // Lists Collection
  Future<String> createList(ListModel list) async {
    final docRef = await _firestore.collection('lists').add(list.toFirestore());
    return docRef.id;
  }

  Stream<List<ListModel>> getUserLists(String userId) {
    return _firestore
        .collection('lists')
        .where('userId', isEqualTo: userId)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ListModel.fromFirestore(doc))
            .toList());
  }

  Stream<List<ListModel>> getAllListsStream() {
    return _firestore
        .collection('lists')
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ListModel.fromFirestore(doc))
            .toList());
  }

  Future<ListModel?> getList(String listId) async {
    final doc = await _firestore.collection('lists').doc(listId).get();
    if (doc.exists) {
      return ListModel.fromFirestore(doc);
    }
    return null;
  }

  Stream<ListModel?> getListStream(String listId) {
    return _firestore
        .collection('lists')
        .doc(listId)
        .snapshots()
        .map((doc) => doc.exists ? ListModel.fromFirestore(doc) : null);
  }

  Future<void> updateList(String listId, Map<String, dynamic> data) async {
    await _firestore.collection('lists').doc(listId).update(data);
  }

  Future<void> deleteList(String listId) async {
    await _firestore.collection('lists').doc(listId).delete();
  }

  Future<void> removeVenueFromList(String listId, String venueId) async {
    final listDoc = await _firestore.collection('lists').doc(listId).get();
    if (!listDoc.exists) return;
    
    final data = listDoc.data() as Map<String, dynamic>;
    final venueIds = List<String>.from(data['venueIds'] ?? []);
    
    if (venueIds.contains(venueId)) {
      venueIds.remove(venueId);
      await _firestore.collection('lists').doc(listId).update({
        'venueIds': venueIds,
      });
    }
  }

  // Get venues by IDs
  Stream<List<VenueModel>> getVenuesByIdsStream(List<String> venueIds) {
    if (venueIds.isEmpty) {
      return Stream.value([]);
    }

    // Firestore 'in' queries are limited to 10 items, so we need to batch
    if (venueIds.length <= 10) {
      return _firestore
          .collection('venues')
          .where(FieldPath.documentId, whereIn: venueIds)
          .snapshots()
          .map((snapshot) => snapshot.docs
              .map((doc) => VenueModel.fromFirestore(doc))
              .toList());
    }

    // For more than 10, we'll fetch all venues and filter
    // This is less efficient but works for larger lists
    return _firestore
        .collection('venues')
        .snapshots()
        .map((snapshot) {
      final allVenues = snapshot.docs
          .map((doc) => VenueModel.fromFirestore(doc))
          .toList();
      
      // Filter to only include venues in the list
      final venueMap = {for (var v in allVenues) v.venueId: v};
      return venueIds
          .where((id) => venueMap.containsKey(id))
          .map((id) => venueMap[id]!)
          .toList();
    });
  }

  // Follows Collection
  Future<void> followUser(String followerId, String followingId) async {
    final batch = _firestore.batch();

    // Add follow relationship
    final followRef = _firestore.collection('follows').doc();
    batch.set(followRef, {
      'followerId': followerId,
      'followingId': followingId,
      'timestamp': FieldValue.serverTimestamp(),
    });

    // Update follower count
    final followingUserRef = _firestore.collection('users').doc(followingId);
    batch.update(followingUserRef, {
      'followersCount': FieldValue.increment(1),
    });

    // Update following count
    final followerUserRef = _firestore.collection('users').doc(followerId);
    batch.update(followerUserRef, {
      'followingCount': FieldValue.increment(1),
    });

    await batch.commit();
  }

  Future<void> unfollowUser(String followerId, String followingId) async {
    final batch = _firestore.batch();

    // Remove follow relationship
    final followsQuery = await _firestore
        .collection('follows')
        .where('followerId', isEqualTo: followerId)
        .where('followingId', isEqualTo: followingId)
        .get();

    for (var doc in followsQuery.docs) {
      batch.delete(doc.reference);
    }

    // Update follower count
    final followingUserRef = _firestore.collection('users').doc(followingId);
    batch.update(followingUserRef, {
      'followersCount': FieldValue.increment(-1),
    });

    // Update following count
    final followerUserRef = _firestore.collection('users').doc(followerId);
    batch.update(followerUserRef, {
      'followingCount': FieldValue.increment(-1),
    });

    await batch.commit();
  }

  Future<bool> isFollowing(String followerId, String followingId) async {
    final query = await _firestore
        .collection('follows')
        .where('followerId', isEqualTo: followerId)
        .where('followingId', isEqualTo: followingId)
        .limit(1)
        .get();
    return query.docs.isNotEmpty;
  }

  Stream<List<String>> getFollowingIds(String userId) {
    return _firestore
        .collection('follows')
        .where('followerId', isEqualTo: userId)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => doc.data()['followingId'] as String).toList());
  }

  // Venue Follows Collection
  Future<void> followVenue(String userId, String venueId) async {
    final batch = _firestore.batch();

    // Add follow relationship in venueFollows collection
    final followRef = _firestore.collection('venueFollows').doc();
    batch.set(followRef, {
      'userId': userId,
      'venueId': venueId,
      'timestamp': FieldValue.serverTimestamp(),
    });

    // Update venue follower count
    final venueRef = _firestore.collection('venues').doc(venueId);
    batch.update(venueRef, {
      'followersCount': FieldValue.increment(1),
    });

    await batch.commit();
  }

  Future<void> unfollowVenue(String userId, String venueId) async {
    final batch = _firestore.batch();

    // Remove follow relationship
    final followsQuery = await _firestore
        .collection('venueFollows')
        .where('userId', isEqualTo: userId)
        .where('venueId', isEqualTo: venueId)
        .get();

    for (var doc in followsQuery.docs) {
      batch.delete(doc.reference);
    }

    // Update venue follower count
    final venueRef = _firestore.collection('venues').doc(venueId);
    batch.update(venueRef, {
      'followersCount': FieldValue.increment(-1),
    });

    await batch.commit();
  }

  Future<bool> isFollowingVenue(String userId, String venueId) async {
    final query = await _firestore
        .collection('venueFollows')
        .where('userId', isEqualTo: userId)
        .where('venueId', isEqualTo: venueId)
        .limit(1)
        .get();
    return query.docs.isNotEmpty;
  }

  Stream<int> getVenueFollowersCount(String venueId) {
    return _firestore
        .collection('venues')
        .doc(venueId)
        .snapshots()
        .map((snapshot) {
      final data = snapshot.data();
      return data?['followersCount'] as int? ?? 0;
    });
  }

  // ============================================
  // EXPERIENCES Collection (WHAT - Definition)
  // ============================================
  // Use for: Admin portal, editing experiences
  // DO NOT use for time-based queries

  Stream<List<ExperienceModel>> getExperiencesByVenueId(String venueId) {
    return _firestore
        .collection('experiences')
        .where('venueId', isEqualTo: venueId)
        .snapshots()
        .map((snapshot) {
          final experiences = snapshot.docs
              .map((doc) => ExperienceModel.fromFirestore(doc))
              .toList();
          // Sort by title
          experiences.sort((a, b) => a.title.compareTo(b.title));
          return experiences;
        });
  }

  Stream<List<ExperienceModel>> getExperiencesByVenueIdAndType(
    String venueId,
    String type, // "event" or "special"
  ) {
    return _firestore
        .collection('experiences')
        .where('venueId', isEqualTo: venueId)
        .where('type', isEqualTo: type)
        .snapshots()
        .map((snapshot) {
          final experiences = snapshot.docs
              .map((doc) => ExperienceModel.fromFirestore(doc))
              .toList();
          // Sort by title
          experiences.sort((a, b) => a.title.compareTo(b.title));
          return experiences;
        });
  }

  Future<ExperienceModel?> getExperience(String experienceId) async {
    // Check cache first
    final cached = _cache.getExperience(experienceId);
    if (cached != null) {
      return cached;
    }
    
    // If not in cache, fetch from Firestore
    final doc = await _firestore.collection('experiences').doc(experienceId).get();
    if (doc.exists) {
      final experience = ExperienceModel.fromFirestore(doc);
      _cache.cacheExperience(experience);
      return experience;
    }
    return null;
  }

  Stream<ExperienceModel?> getExperienceStream(String experienceId) {
    // Check cache first and emit immediately if available
    final cached = _cache.getExperience(experienceId);
    
    if (kDebugMode) {
      debugPrint('FirestoreService.getExperienceStream($experienceId): cached=${cached != null ? cached.experienceId : "null"}');
    }
    
    // Create Firestore stream
    final firestoreStream = _firestore
        .collection('experiences')
        .doc(experienceId)
        .snapshots()
        .map((doc) {
          if (doc.exists) {
            final experience = ExperienceModel.fromFirestore(doc);
            _cache.cacheExperience(experience);
            if (kDebugMode) {
              debugPrint('FirestoreService.getExperienceStream($experienceId): Fetched from Firestore, imageUrl=${experience.imageUrl}');
            }
            return experience;
          }
          return null;
        });
    
    // If we have cached value, emit it immediately, then continue with Firestore updates
    if (cached != null) {
      final controller = StreamController<ExperienceModel?>.broadcast();
      bool hasEmittedCached = false;
      
      // Emit cached value immediately when listener subscribes (synchronously)
      controller.onListen = () {
        if (!controller.isClosed && !hasEmittedCached) {
          hasEmittedCached = true;
          if (kDebugMode) {
            debugPrint('FirestoreService.getExperienceStream($experienceId): Emitting cached value, imageUrl=${cached.imageUrl}');
          }
          // Emit synchronously - this will be received by StreamBuilder immediately
          controller.add(cached);
        }
      };
      
      // Listen to Firestore for updates
      StreamSubscription? subscription;
      subscription = firestoreStream.listen(
        (experience) {
          if (!controller.isClosed) {
            // Emit Firestore updates (they might have changed from cache)
            controller.add(experience);
          }
        },
        onError: (error) {
          if (!controller.isClosed) {
            controller.addError(error);
          }
        },
        onDone: () {
          if (!controller.isClosed) {
            controller.close();
          }
        },
      );
      
      controller.onCancel = () {
        subscription?.cancel();
      };
      
      return controller.stream;
    }
    
    // If not in cache, just stream from Firestore
    if (kDebugMode) {
      debugPrint('FirestoreService.getExperienceStream($experienceId): Not in cache, streaming from Firestore');
    }
    return firestoreStream;
  }

  /// Get experiences by a list of experienceIds (for active experiences on a venue)
  /// Uses cache to reduce Firestore queries
  Stream<List<ExperienceModel>> getExperiencesByIdsStream(List<String> experienceIds) {
    if (experienceIds.isEmpty) {
      return Stream.value([]);
    }

    // Check cache first
    final cachedExperiences = _cache.getExperiences(experienceIds);
    final cachedIds = cachedExperiences.map((e) => e.experienceId).toSet();
    final missingIds = experienceIds.where((id) => !cachedIds.contains(id)).toList();

    if (missingIds.isEmpty) {
      // All experiences are in cache, return them immediately
      if (kDebugMode) {
        debugPrint('FirestoreService: All ${experienceIds.length} experiences found in cache');
      }
      return Stream.value(cachedExperiences);
    }

    if (kDebugMode) {
      debugPrint('FirestoreService: Found ${cachedExperiences.length}/${experienceIds.length} in cache, fetching ${missingIds.length} from Firestore');
    }

    // Firestore 'in' queries are limited to 10 items, so we need to batch
    Stream<List<ExperienceModel>> firestoreStream;
    if (missingIds.length <= 10) {
      firestoreStream = _firestore
          .collection('experiences')
          .where(FieldPath.documentId, whereIn: missingIds)
          .snapshots()
          .map((snapshot) => snapshot.docs
              .map((doc) => ExperienceModel.fromFirestore(doc))
              .toList());
    } else {
      // For more than 10, we'll fetch all experiences and filter
      firestoreStream = _firestore
          .collection('experiences')
          .snapshots()
          .map((snapshot) {
            final allExperiences = snapshot.docs
                .map((doc) => ExperienceModel.fromFirestore(doc))
                .toList();
            
            // Filter to only include experiences in the missing list
            final experienceMap = {for (var e in allExperiences) e.experienceId: e};
            return missingIds
                .where((id) => experienceMap.containsKey(id))
                .map((id) => experienceMap[id]!)
                .toList();
          });
    }

    // Combine cached and Firestore results
    return firestoreStream.map((firestoreExperiences) {
      // Cache the Firestore results
      _cache.cacheExperiences(firestoreExperiences);
      
      // Combine cached and Firestore results
      final allExperiences = <ExperienceModel>[...cachedExperiences, ...firestoreExperiences];
      
      // Ensure we return them in the same order as requested
      final experienceMap = {for (var e in allExperiences) e.experienceId: e};
      return experienceIds
          .where((id) => experienceMap.containsKey(id))
          .map((id) => experienceMap[id]!)
          .toList();
    });
  }

  // ============================================
  // EXPERIENCE INSTANCES Collection (WHEN - Time)
  // ============================================
  // Use for: Frontend time-based queries
  // ALL time-based queries MUST use this collection

  /// Get all experience instances for a venue (upcoming and live)
  Stream<List<ExperienceInstanceModel>> getExperienceInstancesByVenueId(String venueId) {
    final now = Timestamp.now();
    return _firestore
        .collection('experienceInstances')
        .where('venueId', isEqualTo: venueId)
        .where('endAt', isGreaterThan: now) // Only future or live instances
        // Note: No orderBy here to avoid needing composite index - we sort in memory instead
        .snapshots()
        .map((snapshot) {
          final instances = snapshot.docs
              .map((doc) => ExperienceInstanceModel.fromFirestore(doc))
              .toList();
          // Sort by startAt in memory (avoids needing composite index)
          instances.sort((a, b) => a.startAt.compareTo(b.startAt));
          return instances;
        });
  }

  /// Get experience instances for a venue filtered by type (events or specials)
  Stream<List<ExperienceInstanceModel>> getExperienceInstancesByVenueIdAndType(
    String venueId,
    String type, // "event" or "special"
  ) {
    final now = Timestamp.now();
    // Avoid composite index requirement by filtering in memory
    // Query by endAt only (single where clause), then filter by venueId and type in memory
    return _firestore
        .collection('experienceInstances')
        .where('endAt', isGreaterThan: now) // Only future or live instances
        .snapshots()
        .map((snapshot) {
          final allInstances = snapshot.docs
              .map((doc) => ExperienceInstanceModel.fromFirestore(doc))
              .toList();
          
          // Filter to only include instances with matching venueId and type
          final filteredInstances = allInstances
              .where((instance) => 
                  instance.venueId == venueId && 
                  instance.type == type)
              .toList();
          
          // Sort by startAt in memory (avoids needing composite index)
          filteredInstances.sort((a, b) => a.startAt.compareTo(b.startAt));
          return filteredInstances;
        });
  }

  /// Get live instances (happening now)
  Stream<List<ExperienceInstanceModel>> getLiveInstancesByVenueId(String venueId) {
    final now = Timestamp.now();
    return _firestore
        .collection('experienceInstances')
        .where('venueId', isEqualTo: venueId)
        .where('startAt', isLessThanOrEqualTo: now)
        .where('endAt', isGreaterThan: now)
        // Note: No orderBy here to avoid needing composite index - sort in memory if needed
        .snapshots()
        .map((snapshot) {
          final instances = snapshot.docs
              .map((doc) => ExperienceInstanceModel.fromFirestore(doc))
              .toList();
          // Sort by startAt in memory
          instances.sort((a, b) => a.startAt.compareTo(b.startAt));
          return instances;
        });
  }

  /// Get upcoming instances (future only)
  Stream<List<ExperienceInstanceModel>> getUpcomingInstancesByVenueId(String venueId) {
    final now = Timestamp.now();
    return _firestore
        .collection('experienceInstances')
        .where('venueId', isEqualTo: venueId)
        .where('startAt', isGreaterThan: now)
        // Note: No orderBy here to avoid needing composite index - sort in memory instead
        .snapshots()
        .map((snapshot) {
          final instances = snapshot.docs
              .map((doc) => ExperienceInstanceModel.fromFirestore(doc))
              .toList();
          // Sort by startAt in memory
          instances.sort((a, b) => a.startAt.compareTo(b.startAt));
          return instances;
        });
  }

  Future<ExperienceInstanceModel?> getExperienceInstance(String instanceId) async {
    final doc = await _firestore.collection('experienceInstances').doc(instanceId).get();
    if (doc.exists) {
      return ExperienceInstanceModel.fromFirestore(doc);
    }
    return null;
  }

  /// Get all upcoming and live experience instances across all venues (for home feed)
  /// Includes both upcoming (startAt > now) and live (startAt <= now && endAt > now) instances
  /// Also includes virtual instances for recurring experiences that don't have instances yet
  Stream<List<ExperienceInstanceModel>> getAllUpcomingInstances() {
    final now = Timestamp.now();
    
    // Get instances from experienceInstances collection
    final instancesStream = _firestore
        .collection('experienceInstances')
        .where('endAt', isGreaterThan: now) // Include both upcoming and live instances
        .snapshots()
        .map((snapshot) {
          final instances = snapshot.docs
              .map((doc) => ExperienceInstanceModel.fromFirestore(doc))
              .toList();
          // Sort by startAt in memory (live instances first, then upcoming)
          instances.sort((a, b) {
            final aIsLive = a.startAt.compareTo(now) <= 0 && a.endAt.compareTo(now) > 0;
            final bIsLive = b.startAt.compareTo(now) <= 0 && b.endAt.compareTo(now) > 0;
            
            // Live instances come first
            if (aIsLive && !bIsLive) return -1;
            if (!aIsLive && bIsLive) return 1;
            
            // Then sort by startAt
            return a.startAt.compareTo(b.startAt);
          });
          return instances;
        });

    // Also get all recurring experiences to generate virtual instances
    final experiencesStream = _firestore
        .collection('experiences')
        .where('isRecurring', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => ExperienceModel.fromFirestore(doc))
            .toList());

    // Combine both streams - use instances stream and enrich with virtual instances
    return _combineInstancesAndExperiences(instancesStream, experiencesStream, now);
  }

  /// Get all upcoming instances filtered by type (events or specials)
  Stream<List<ExperienceInstanceModel>> getAllUpcomingInstancesByType(String type) {
    final now = Timestamp.now();
    return _firestore
        .collection('experienceInstances')
        .where('type', isEqualTo: type)
        .where('startAt', isGreaterThan: now)
        .snapshots()
        .map((snapshot) {
          final instances = snapshot.docs
              .map((doc) => ExperienceInstanceModel.fromFirestore(doc))
              .toList();
          // Sort by startAt in memory
          instances.sort((a, b) => a.startAt.compareTo(b.startAt));
          return instances;
        });
  }

  /// Paginated specials from the experiences collection (specials are stored only there, not in experienceInstances).
  /// Returns a page of experiences and the last doc for next page.
  /// Firestore may require a composite index: experiences (type Asc, updatedAt Asc).
  Future<Map<String, dynamic>> getSpecialExperiencesPage({
    int limit = 5,
    DocumentSnapshot? startAfter,
  }) async {
    Query<Map<String, dynamic>> query = _firestore
        .collection('experiences')
        .where('type', isEqualTo: 'special')
        .orderBy('updatedAt', descending: true)
        .limit(limit);
    if (startAfter != null) {
      query = query.startAfterDocument(startAfter);
    }
    final snapshot = await query.get();
    final experiences = snapshot.docs
        .map((doc) => ExperienceModel.fromFirestore(doc))
        .toList();
    final lastDoc = snapshot.docs.isNotEmpty ? snapshot.docs.last : null;
    return {
      'experiences': experiences,
      'lastDoc': lastDoc,
      'hasMore': snapshot.docs.length >= limit,
    };
  }

  /// Load a page of specials from experiences collection and filter to only those visible on their venue (visibility != false).
  /// Returns virtual instances (for UI compatibility), lastDoc for next page, and hasMore.
  Future<Map<String, dynamic>> getVisibleSpecialExperiencesPage({
    int limit = 5,
    DocumentSnapshot? startAfter,
  }) async {
    final page = await getSpecialExperiencesPage(limit: limit, startAfter: startAfter);
    final experiences = page['experiences'] as List<ExperienceModel>;
    final lastDoc = page['lastDoc'] as DocumentSnapshot?;
    final hasMore = page['hasMore'] as bool;

    if (experiences.isEmpty) {
      return {'instances': <ExperienceInstanceModel>[], 'lastDoc': null, 'hasMore': false};
    }

    final venueIds = experiences.map((e) => e.venueId).toSet().toList();
    final venues = await getVenuesByIds(venueIds);
    final venueMap = {for (var v in venues) v.venueId: v};

    final visible = experiences
        .where((exp) {
          final venue = venueMap[exp.venueId];
          if (venue == null) return false;
          return venue.getActiveExperienceIds().contains(exp.experienceId);
        })
        .toList();

    final instances = visible
        .map((exp) => ExperienceInstanceModel.virtualFromExperience(exp))
        .toList();

    return {
      'instances': instances,
      'lastDoc': lastDoc,
      'hasMore': hasMore,
    };
  }

  /// Get experience instances by a list of experienceIds (for active experiences on a venue)
  /// Returns only upcoming or live instances
  Stream<List<ExperienceInstanceModel>> getExperienceInstancesByExperienceIds(
    List<String> experienceIds,
  ) {
    if (experienceIds.isEmpty) {
      return Stream.value([]);
    }

    final now = Timestamp.now();
    
    // Firestore 'in' queries are limited to 10 items, so we need to batch
    if (experienceIds.length <= 10) {
      return _firestore
          .collection('experienceInstances')
          .where('experienceId', whereIn: experienceIds)
          .where('endAt', isGreaterThan: now) // Only future or live instances
          .snapshots()
          .map((snapshot) {
            final instances = snapshot.docs
                .map((doc) => ExperienceInstanceModel.fromFirestore(doc))
                .toList();
            // Sort by startAt in memory
            instances.sort((a, b) => a.startAt.compareTo(b.startAt));
            return instances;
          });
    }

    // For more than 10, fetch all upcoming instances and filter
    return _firestore
        .collection('experienceInstances')
        .where('endAt', isGreaterThan: now)
        .snapshots()
        .map((snapshot) {
          final allInstances = snapshot.docs
              .map((doc) => ExperienceInstanceModel.fromFirestore(doc))
              .toList();
          
          // Filter to only include instances with matching experienceIds
          final filteredInstances = allInstances
              .where((instance) => experienceIds.contains(instance.experienceId))
              .toList();
          
          // Sort by startAt in memory
          filteredInstances.sort((a, b) => a.startAt.compareTo(b.startAt));
          return filteredInstances;
        });
  }

  /// Get experience instances by experienceIds filtered by type (events or specials).
  /// Includes both live (started, not ended) and upcoming (not yet started) instances so
  /// visible specials show even when they are upcoming. Also includes virtual instances
  /// for recurring experiences that don't have instances yet.
  Stream<List<ExperienceInstanceModel>> getExperienceInstancesByExperienceIdsAndType(
    List<String> experienceIds,
    String type, // "event" or "special"
  ) {
    if (experienceIds.isEmpty) {
      return Stream.value([]);
    }

    final now = Timestamp.now();
    
    // Get instances from experienceInstances collection
    Stream<List<ExperienceInstanceModel>> instancesStream;
    
    // Avoid composite index requirement by filtering in memory
    // Query by endAt only (single where clause), then filter by type and experienceIds in memory
    instancesStream = _firestore
        .collection('experienceInstances')
        .where('endAt', isGreaterThan: now) // Only future or live instances
        .snapshots()
        .map((snapshot) {
          final allInstances = snapshot.docs
              .map((doc) => ExperienceInstanceModel.fromFirestore(doc))
              .toList();
          
          if (kDebugMode) {
            debugPrint('getExperienceInstancesByExperienceIdsAndType: Found ${allInstances.length} total instances (before filtering)');
            debugPrint('Filtering for type=$type, experienceIds=$experienceIds');
          }
          
          // Filter to only include instances with matching type and experienceIds
          final filteredInstances = allInstances
              .where((instance) => 
                  instance.type == type && 
                  experienceIds.contains(instance.experienceId))
              .toList();
          
          if (kDebugMode) {
            debugPrint('getExperienceInstancesByExperienceIdsAndType: After filtering: ${filteredInstances.length} instances');
            for (var inst in filteredInstances) {
              debugPrint('  - Instance: ${inst.instanceId}, ExperienceId: ${inst.experienceId}, Type: ${inst.type}, Title: ${inst.title}');
            }
          }
          
          // Sort by startAt in memory
          filteredInstances.sort((a, b) => a.startAt.compareTo(b.startAt));
          return filteredInstances;
        });

    // Also get experiences to check for recurring ones without instances
    final experiencesStream = experienceIds.length <= 10
        ? _firestore
            .collection('experiences')
            .where(FieldPath.documentId, whereIn: experienceIds)
            .where('type', isEqualTo: type)
            .snapshots()
            .map((snapshot) => snapshot.docs
                .map((doc) => ExperienceModel.fromFirestore(doc))
                .toList())
        : _firestore
            .collection('experiences')
            .where('type', isEqualTo: type)
            .snapshots()
            .map((snapshot) {
              final allExperiences = snapshot.docs
                  .map((doc) => ExperienceModel.fromFirestore(doc))
                  .toList();
              return allExperiences
                  .where((exp) => experienceIds.contains(exp.experienceId))
                  .toList();
            });

    // Combine both streams using StreamController approach (similar to venue_card)
    // This allows multiple listeners and avoids the async* single-subscription issue
    final controller = StreamController<List<ExperienceInstanceModel>>.broadcast();
    StreamSubscription<List<ExperienceInstanceModel>>? instancesSub;
    StreamSubscription<List<ExperienceModel>>? experiencesSub;
    List<ExperienceInstanceModel>? currentInstances;
    List<ExperienceModel>? currentExperiences;
    
    // Emit initial empty list immediately to prevent infinite loading
    // This will be overridden when real data arrives
    // Use onListen to ensure it's emitted when the first listener subscribes
    controller.onListen = () {
      if (!controller.isClosed) {
        if (kDebugMode) {
          debugPrint('getExperienceInstancesByExperienceIdsAndType: onListen - emitting initial empty list');
        }
        // Emit synchronously in onListen to ensure StreamBuilder gets it immediately
        controller.add(<ExperienceInstanceModel>[]);
      }
    };

    void emitIfReady() {
      if (kDebugMode) {
        debugPrint('emitIfReady: currentInstances=${currentInstances?.length ?? "null"}, currentExperiences=${currentExperiences?.length ?? "null"}');
      }
      
      // Emit when we have both, or when we have instances (even without experiences)
      // This prevents infinite loading if experiences stream is slow
      if (currentInstances != null && currentExperiences != null) {
        // Get experienceIds that already have instances
        final experienceIdsWithInstances = currentInstances!
            .map((instance) => instance.experienceId)
            .toSet();
        
        // Find recurring experiences without instances and generate virtual instances
        final virtualInstances = <ExperienceInstanceModel>[];
        for (final experience in currentExperiences!) {
          // Skip if already has instances or not recurring
          if (experienceIdsWithInstances.contains(experience.experienceId) || 
              !experience.isRecurring || 
              experience.recurrenceRule == null) {
            continue;
          }
          
          // Generate next occurrence for this recurring experience
          final nextInstance = _generateNextRecurringInstance(experience, now);
          if (nextInstance != null) {
            virtualInstances.add(nextInstance);
          }
        }
        
        // Combine real and virtual instances
        final allInstances = [...currentInstances!, ...virtualInstances];
        allInstances.sort((a, b) => a.startAt.compareTo(b.startAt));
        
        if (kDebugMode) {
          debugPrint('emitIfReady: Emitting ${allInstances.length} total instances (${currentInstances!.length} real + ${virtualInstances.length} virtual)');
        }
        
        if (!controller.isClosed) {
          if (kDebugMode) {
            debugPrint('emitIfReady: Adding ${allInstances.length} instances to controller stream');
          }
          controller.add(allInstances);
        } else if (kDebugMode) {
          debugPrint('emitIfReady: Controller is closed, cannot emit');
        }
      } else if (currentInstances != null) {
        // If we have instances but experiences haven't loaded yet, emit instances only
        // This prevents infinite loading when experiences stream is slow
        // We'll update with virtual instances when experiences load
        if (kDebugMode) {
          debugPrint('emitIfReady: Emitting ${currentInstances!.length} instances (experiences not loaded yet)');
        }
        if (!controller.isClosed) {
          if (kDebugMode) {
            debugPrint('emitIfReady: Adding ${currentInstances!.length} instances to controller stream (experiences not loaded yet)');
          }
          controller.add(currentInstances!);
        } else if (kDebugMode) {
          debugPrint('emitIfReady: Controller is closed, cannot emit instances');
        }
      } else if (currentExperiences != null && currentInstances == null) {
        // If we have experiences but no instances yet, emit empty list
        // This prevents infinite loading when instances stream is slow
        if (kDebugMode) {
          debugPrint('emitIfReady: Emitting empty list (instances not loaded yet)');
        }
        if (!controller.isClosed) {
          controller.add(<ExperienceInstanceModel>[]);
        }
      } else {
        // Both are null - wait for data (onListen already emitted empty list)
        if (kDebugMode) {
          debugPrint('emitIfReady: Not ready yet - waiting for data (both null)');
        }
      }
    }

    // Convert streams to broadcast to allow multiple subscriptions
    final instancesBroadcast = instancesStream.asBroadcastStream();
    final experiencesBroadcast = experiencesStream.asBroadcastStream();

    // Don't initialize to empty lists - keep as null so emitIfReady waits for real data
    // The onListen callback will emit the initial empty list

    // Listen to instances stream
    instancesSub = instancesBroadcast.listen(
      (instances) {
        if (kDebugMode) {
          debugPrint('getExperienceInstancesByExperienceIdsAndType: Received ${instances.length} instances for type=$type');
        }
        currentInstances = instances;
        emitIfReady();
      },
      onError: (error) {
        if (!controller.isClosed) {
          controller.addError(error);
        }
      },
    );

    // Listen to experiences stream
    experiencesSub = experiencesBroadcast.listen(
      (experiences) {
        if (kDebugMode) {
          debugPrint('getExperienceInstancesByExperienceIdsAndType: Received ${experiences.length} experiences for type=$type');
        }
        currentExperiences = experiences;
        emitIfReady();
      },
      onError: (error) {
        if (!controller.isClosed) {
          controller.addError(error);
        }
      },
    );

    // Clean up subscriptions when controller is cancelled
    controller.onCancel = () {
      instancesSub?.cancel();
      experiencesSub?.cancel();
    };

    // Return controller stream directly - onListen will emit initial empty list
    // This matches the pattern used in venue_card.dart which works correctly
    return controller.stream;
  }

  /// Combine instances and experiences streams to add virtual instances for recurring experiences
  Stream<List<ExperienceInstanceModel>> _combineInstancesAndExperiences(
    Stream<List<ExperienceInstanceModel>> instancesStream,
    Stream<List<ExperienceModel>> experiencesStream,
    Timestamp now,
  ) async* {
    try {
      // Get initial experiences snapshot
      List<ExperienceModel> experiences = await experiencesStream.first;
      
      // Process instances stream and combine with experiences
      await for (final instances in instancesStream) {
      // Get experienceIds that already have instances
      final experienceIdsWithInstances = instances
          .map((instance) => instance.experienceId)
          .toSet();
      
      // Find recurring experiences without instances and generate virtual instances
      final virtualInstances = <ExperienceInstanceModel>[];
      for (final experience in experiences) {
        // Skip if already has instances or not recurring
        if (experienceIdsWithInstances.contains(experience.experienceId) || 
            !experience.isRecurring || 
            experience.recurrenceRule == null) {
          continue;
        }
        
        // Generate next occurrence for this recurring experience
        final nextInstance = _generateNextRecurringInstance(experience, now);
        if (nextInstance != null) {
          virtualInstances.add(nextInstance);
        }
      }
      
      // Combine real and virtual instances
      final allInstances = [...instances, ...virtualInstances];
      allInstances.sort((a, b) => a.startAt.compareTo(b.startAt));
      yield allInstances;
      }
    } catch (e) {
      // If there's an error, yield empty list to prevent stream from hanging
      if (kDebugMode) {
        debugPrint('Error in _combineInstancesAndExperiences: $e');
      }
      yield <ExperienceInstanceModel>[];
    }
  }

  /// Generate a virtual instance for the next occurrence of a recurring experience
  ExperienceInstanceModel? _generateNextRecurringInstance(
    ExperienceModel experience,
    Timestamp now,
  ) {
    if (!experience.isRecurring || experience.recurrenceRule == null) {
      return null;
    }

    final rule = experience.recurrenceRule!;
    final nowDate = now.toDate();
    
    // Check if recurrence is within date range (if specified)
    if (rule.startDate != null && now.toDate().isBefore(rule.startDate!.toDate())) {
      return null; // Recurrence hasn't started yet
    }
    if (rule.endDate != null && now.toDate().isAfter(rule.endDate!.toDate())) {
      return null; // Recurrence has ended
    }
    
    // Convert Dart weekday (1=Mon, 7=Sun) to recurrence format (0=Sun, 6=Sat)
    final currentDayOfWeek = nowDate.weekday == 7 ? 0 : nowDate.weekday;
    
    // Find the next occurrence
    DateTime? nextOccurrence;
    int? nextDay;
    
    // Check today first
    if (rule.hasDay(currentDayOfWeek)) {
      final todayStart = _parseTimeForDate(rule.getStartTimeForDay(currentDayOfWeek), nowDate);
      if (todayStart.isAfter(nowDate)) {
        nextOccurrence = todayStart;
        nextDay = currentDayOfWeek;
      }
    }
    
    // If not today, find the next day in the recurrence
    if (nextOccurrence == null) {
      for (int daysAhead = 1; daysAhead <= 14; daysAhead++) {
        final checkDate = nowDate.add(Duration(days: daysAhead));
        // Convert Dart weekday (1=Mon, 7=Sun) to recurrence format (0=Sun, 6=Sat)
        final checkDayOfWeek = checkDate.weekday == 7 ? 0 : checkDate.weekday;
        
        if (rule.hasDay(checkDayOfWeek)) {
          nextOccurrence = _parseTimeForDate(rule.getStartTimeForDay(checkDayOfWeek), checkDate);
          nextDay = checkDayOfWeek;
          break;
        }
      }
    }
    
    if (nextOccurrence == null || nextDay == null) {
      return null;
    }
    
    // Calculate end time using the specific day's schedule
    // Handle case where endTime < startTime (ends next day)
    final endTimeStr = rule.getEndTimeForDay(nextDay);
    final startTimeStr = rule.getStartTimeForDay(nextDay);
    DateTime endTime = _parseTimeForDate(endTimeStr, nextOccurrence);
    
    // If end time is earlier than start time, it means it ends the next day
    final endTimeParts = endTimeStr.split(':');
    final startTimeParts = startTimeStr.split(':');
    final endHour = int.parse(endTimeParts[0]);
    final startHour = int.parse(startTimeParts[0]);
    if (endHour < startHour || (endHour == startHour && 
        (endTimeParts.length > 1 ? int.parse(endTimeParts[1]) : 0) < 
        (startTimeParts.length > 1 ? int.parse(startTimeParts[1]) : 0))) {
      endTime = endTime.add(const Duration(days: 1));
    }
    
    // Create virtual instance
    return ExperienceInstanceModel(
      instanceId: 'virtual_${experience.experienceId}_${nextOccurrence.millisecondsSinceEpoch}',
      experienceId: experience.experienceId,
      venueId: experience.venueId,
      type: experience.type,
      title: experience.title,
      startAt: Timestamp.fromDate(nextOccurrence),
      endAt: Timestamp.fromDate(endTime),
      createdAt: Timestamp.now(),
    );
  }

  /// Parse a time string (HH:mm) for a specific date
  DateTime _parseTimeForDate(String timeStr, DateTime date) {
    final parts = timeStr.split(':');
    final hour = int.parse(parts[0]);
    final minute = parts.length > 1 ? int.parse(parts[1]) : 0;
    return DateTime(date.year, date.month, date.day, hour, minute);
  }
}

