import 'package:cloud_firestore/cloud_firestore.dart';
import 'experience_model.dart';

/// Represents WHEN an experience happens (a concrete occurrence in time)
/// This is the "TIME" collection - always has concrete timestamps
/// Auto-generated from experiences, queried by frontend for time-based UI
class ExperienceInstanceModel {
  final String instanceId;
  final String experienceId; // Reference to experiences collection
  final String venueId;
  final String type; // "event" | "special"
  final String title;
  final Timestamp startAt; // UTC timestamp
  final Timestamp endAt; // UTC timestamp
  final Timestamp createdAt;

  ExperienceInstanceModel({
    required this.instanceId,
    required this.experienceId,
    required this.venueId,
    required this.type,
    required this.title,
    required this.startAt,
    required this.endAt,
    required this.createdAt,
  });

  /// Build a virtual instance from an experience (e.g. for specials that live only in experiences collection).
  static ExperienceInstanceModel virtualFromExperience(ExperienceModel experience) {
    final farFuture = Timestamp.fromDate(DateTime.now().add(const Duration(days: 365 * 10)));
    return ExperienceInstanceModel(
      instanceId: experience.experienceId,
      experienceId: experience.experienceId,
      venueId: experience.venueId,
      type: experience.type,
      title: experience.title,
      startAt: experience.createdAt,
      endAt: farFuture,
      createdAt: experience.createdAt,
    );
  }

  factory ExperienceInstanceModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    
    // Handle type - convert to string if it's stored as int (0=event, 1=special) or string
    String typeValue = 'event';
    if (data['type'] != null) {
      if (data['type'] is String) {
        typeValue = data['type'] as String;
      } else if (data['type'] is int) {
        // If stored as int: 0 = event, 1 = special
        typeValue = (data['type'] as int) == 0 ? 'event' : 'special';
      } else {
        typeValue = data['type'].toString().toLowerCase();
      }
    }

    return ExperienceInstanceModel(
      instanceId: doc.id,
      experienceId: _toString(data['experienceId'], ''),
      venueId: _toString(data['venueId'] ?? data['venueID'], ''),
      type: typeValue,
      title: _toString(data['title'], ''),
      startAt: data['startAt'] as Timestamp,
      endAt: data['endAt'] as Timestamp,
      createdAt: data['createdAt'] as Timestamp? ?? Timestamp.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'experienceId': experienceId,
      'venueId': venueId,
      'type': type,
      'title': title,
      'startAt': startAt,
      'endAt': endAt,
      'createdAt': createdAt,
    };
  }

  // Helper to safely convert dynamic value to String
  static String _toString(dynamic value, String defaultValue) {
    if (value == null) return defaultValue;
    if (value is String) return value;
    if (value is int) return value.toString();
    if (value is double) return value.toString();
    return value.toString();
  }

  // Check if this instance is happening now
  bool get isLiveNow {
    final now = Timestamp.now();
    return startAt.compareTo(now) <= 0 && endAt.compareTo(now) > 0;
  }

  // Check if this instance is upcoming
  bool get isUpcoming {
    final now = Timestamp.now();
    return startAt.compareTo(now) > 0;
  }

  // Check if this instance has passed
  bool get hasPassed {
    final now = Timestamp.now();
    return endAt.compareTo(now) < 0;
  }
}
