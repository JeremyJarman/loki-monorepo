import 'package:cloud_firestore/cloud_firestore.dart';

/// Represents WHAT an experience is (the definition)
/// This is the "IDEA" collection - no timestamps, just the definition
class ExperienceModel {
  final String experienceId;
  final String venueId;
  final String type; // "event" | "special"
  final String title;
  final String description;
  final String? imageUrl;
  final num? cost; // number (can be int or double)
  /// When true, cost is displayed with " pp" (per person) on specials.
  final bool costPerPerson;
  final bool isRecurring;
  final RecurrenceRule? recurrenceRule;
  final List<String>? tags; // Array of tag strings (max 3)
  final String? genre; // Music genre (only relevant when tags include "Live Music" or "DJ Night")
  final Timestamp createdAt;
  final Timestamp updatedAt;

  ExperienceModel({
    required this.experienceId,
    required this.venueId,
    required this.type,
    required this.title,
    required this.description,
    this.imageUrl,
    this.cost,
    this.costPerPerson = false,
    required this.isRecurring,
    this.recurrenceRule,
    this.tags,
    this.genre,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ExperienceModel.fromFirestore(DocumentSnapshot doc) {
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

    // Handle cost - can be int, double, or null
    num? costValue;
    if (data['cost'] != null) {
      if (data['cost'] is num) {
        costValue = data['cost'] as num;
      } else if (data['cost'] is String) {
        costValue = num.tryParse(data['cost'] as String);
      }
    }

    // Handle recurrenceRule
    RecurrenceRule? recurrenceRuleValue;
    if (data['recurrenceRule'] != null && data['recurrenceRule'] is Map) {
      final ruleData = data['recurrenceRule'] as Map<String, dynamic>;
      recurrenceRuleValue = RecurrenceRule.fromMap(ruleData);
    }

    // Handle tags - can be array of strings or null
    List<String>? tagsValue;
    if (data['tags'] != null) {
      if (data['tags'] is List) {
        tagsValue = List<String>.from(data['tags'] as List);
      }
    }

    // Handle genre - string or null
    final genreValue = data['genre'] as String?;

    return ExperienceModel(
      experienceId: doc.id,
      venueId: _toString(data['venueId'] ?? data['venueID'], ''),
      type: typeValue,
      title: _toString(data['title'], ''),
      description: _toString(data['description'], ''),
      imageUrl: data['imageUrl'] as String?,
      cost: costValue,
      costPerPerson: data['costPerPerson'] as bool? ?? false,
      isRecurring: data['isRecurring'] as bool? ?? false,
      recurrenceRule: recurrenceRuleValue,
      tags: tagsValue,
      genre: genreValue,
      createdAt: data['createdAt'] as Timestamp? ?? Timestamp.now(),
      updatedAt: data['updatedAt'] as Timestamp? ?? Timestamp.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'venueId': venueId,
      'type': type,
      'title': title,
      'description': description,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (cost != null) 'cost': cost,
      if (costPerPerson) 'costPerPerson': costPerPerson,
      'isRecurring': isRecurring,
      if (recurrenceRule != null) 'recurrenceRule': recurrenceRule!.toMap(),
      if (tags != null) 'tags': tags,
      if (genre != null) 'genre': genre,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
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

  // Format cost as string for display (without currency symbol - icon shows it)
  String? get costDisplay {
    if (cost == null) return null;
    if (cost is int) {
      return '$cost';
    } else if (cost is double) {
      return (cost as double).toStringAsFixed(2);
    }
    return '$cost';
  }
}

/// Day schedule for a specific day in recurrence rule
class DaySchedule {
  final String startTime; // "HH:mm" format (24-hour)
  final String endTime; // "HH:mm" format (24-hour)

  DaySchedule({
    required this.startTime,
    required this.endTime,
  });

  factory DaySchedule.fromMap(Map<String, dynamic> map) {
    return DaySchedule(
      startTime: map['startTime'] as String? ?? '00:00',
      endTime: map['endTime'] as String? ?? '23:59',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'startTime': startTime,
      'endTime': endTime,
    };
  }
}

/// Recurrence rule for recurring experiences
/// New format: uses daySchedules object where each day (0-6) can have different times
class RecurrenceRule {
  final Map<int, DaySchedule> daySchedules; // Key: day number (0=Sun, 6=Sat), Value: DaySchedule
  final Timestamp? startDate; // Optional: when the recurring experience starts
  final Timestamp? endDate; // Optional: when the recurring experience ends

  RecurrenceRule({
    required this.daySchedules,
    this.startDate,
    this.endDate,
  });

  factory RecurrenceRule.fromMap(Map<String, dynamic> map) {
    // Handle new format: daySchedules object
    Map<int, DaySchedule> schedules = {};
    if (map['daySchedules'] != null && map['daySchedules'] is Map) {
      final daySchedulesMap = map['daySchedules'] as Map<String, dynamic>;
      for (var entry in daySchedulesMap.entries) {
        final dayNum = int.tryParse(entry.key);
        if (dayNum != null && dayNum >= 0 && dayNum <= 6) {
          if (entry.value is Map) {
            schedules[dayNum] = DaySchedule.fromMap(entry.value as Map<String, dynamic>);
          }
        }
      }
    }
    
    // Fallback: Handle old format (daysOfWeek array) for backward compatibility
    if (schedules.isEmpty && map['daysOfWeek'] != null && map['daysOfWeek'] is List) {
      final daysOfWeek = List<int>.from(map['daysOfWeek'] as List);
      final startTime = map['startTime'] as String? ?? '00:00';
      final endTime = map['endTime'] as String? ?? '23:59';
      final daySchedule = DaySchedule(startTime: startTime, endTime: endTime);
      for (var day in daysOfWeek) {
        if (day >= 0 && day <= 6) {
          schedules[day] = daySchedule;
        }
      }
    }

    // Handle optional startDate and endDate
    Timestamp? startDate;
    if (map['startDate'] != null) {
      if (map['startDate'] is Timestamp) {
        startDate = map['startDate'] as Timestamp;
      } else if (map['startDate'] is Map) {
        // Handle Firestore Timestamp from JSON
        final tsData = map['startDate'] as Map<String, dynamic>;
        if (tsData['_seconds'] != null) {
          startDate = Timestamp.fromMillisecondsSinceEpoch(
            (tsData['_seconds'] as int) * 1000 + 
            ((tsData['_nanoseconds'] as int? ?? 0) ~/ 1000000)
          );
        }
      }
    }

    Timestamp? endDate;
    if (map['endDate'] != null) {
      if (map['endDate'] is Timestamp) {
        endDate = map['endDate'] as Timestamp;
      } else if (map['endDate'] is Map) {
        // Handle Firestore Timestamp from JSON
        final tsData = map['endDate'] as Map<String, dynamic>;
        if (tsData['_seconds'] != null) {
          endDate = Timestamp.fromMillisecondsSinceEpoch(
            (tsData['_seconds'] as int) * 1000 + 
            ((tsData['_nanoseconds'] as int? ?? 0) ~/ 1000000)
          );
        }
      }
    }

    return RecurrenceRule(
      daySchedules: schedules,
      startDate: startDate,
      endDate: endDate,
    );
  }

  Map<String, dynamic> toMap() {
    final result = <String, dynamic>{
      'daySchedules': {
        for (var entry in daySchedules.entries)
          entry.key.toString(): entry.value.toMap(),
      },
    };
    if (startDate != null) {
      result['startDate'] = startDate;
    }
    if (endDate != null) {
      result['endDate'] = endDate;
    }
    return result;
  }

  // Helper: Get list of days (for backward compatibility)
  List<int> get daysOfWeek => daySchedules.keys.toList()..sort();

  // Helper: Get start time for a specific day, or default if day not found
  String getStartTimeForDay(int day) {
    return daySchedules[day]?.startTime ?? '00:00';
  }

  // Helper: Get end time for a specific day, or default if day not found
  String getEndTimeForDay(int day) {
    return daySchedules[day]?.endTime ?? '23:59';
  }

  // Helper: Check if a day is scheduled
  bool hasDay(int day) {
    return daySchedules.containsKey(day);
  }
}
