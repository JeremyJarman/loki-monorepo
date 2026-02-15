import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// Parse focus list from Firestore; pad with 'center' to match length.
List<String> _parseFocusList(dynamic value, int length) {
  if (length == 0) return [];
  if (value is List) {
    final list = value.map((e) => e?.toString() ?? 'center').take(length).toList();
    while (list.length < length) list.add('center');
    return list;
  }
  return List.filled(length, 'center');
}

/// Alignment for 1:1 crop focus: center, top, bottom, left, right.
Alignment imageFocusToAlignment(String focus) {
  switch (focus) {
    case 'top': return Alignment.topCenter;
    case 'bottom': return Alignment.bottomCenter;
    case 'left': return Alignment.centerLeft;
    case 'right': return Alignment.centerRight;
    default: return Alignment.center;
  }
}

class VenueModel {
  final String venueId;
  final String name;
  final String description;
  final String? atmosphere;
  final String address;
  final String? phone;
  final GeoPoint location;
  final Map<String, dynamic>? openingHours;
  final List<String> imageUrls;
  final List<String> foodImageUrls;
  final List<String> menuImageUrls;
  /// Focus for 1:1 crop per image: 'center' | 'top' | 'bottom' | 'left' | 'right'. Same order as imageUrls.
  final List<String> imageFocus;
  final List<String> foodImageFocus;
  final List<String> menuImageFocus;
  final String? introduction;
  final String? designAndAtmosphere;
  final String? offeringsAndMenu;
  final String? publicOpinionHighlights;
  final double? satisfactionScore;
  final List<Map<String, dynamic>> experiences; // List of {experienceId: string, visibility: bool} (legacy: isActive)
  final Map<String, dynamic>? menuSections; // Map of section IDs to sections with title and items
  final int followersCount;
  final List<String> tags; // Tags for filtering (e.g., "Pet-Friendly", "Outdoor Seating", etc.)
  final String? currency; // Currency code (e.g., 'EUR', 'USD', 'GBP')

  VenueModel({
    required this.venueId,
    required this.name,
    required this.description,
    this.atmosphere,
    required this.address,
    this.phone,
    required this.location,
    this.openingHours,
    this.imageUrls = const [],
    this.foodImageUrls = const [],
    this.menuImageUrls = const [],
    this.imageFocus = const [],
    this.foodImageFocus = const [],
    this.menuImageFocus = const [],
    this.introduction,
    this.designAndAtmosphere,
    this.offeringsAndMenu,
    this.publicOpinionHighlights,
    this.satisfactionScore,
    this.experiences = const [],
    this.menuSections,
    this.followersCount = 0,
    this.tags = const [],
    this.currency,
  });

  factory VenueModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data();
    if (data is! Map<String, dynamic>) {
      throw FormatException('Venue document data is not a Map');
    }
    
    // Parse experiences field - can be a list of maps
    List<Map<String, dynamic>> experiencesList = [];
    if (data['experiences'] != null) {
      if (data['experiences'] is List) {
        experiencesList = List<Map<String, dynamic>>.from(
          (data['experiences'] as List).map((item) {
            if (item is Map) {
              return Map<String, dynamic>.from(item);
            }
            return <String, dynamic>{};
          }),
        );
      }
    }
    
    // Safely parse openingHours - handle both Map and List
    Map<String, dynamic>? openingHoursValue;
    if (data['openingHours'] != null) {
      if (data['openingHours'] is Map) {
        openingHoursValue = Map<String, dynamic>.from(data['openingHours'] as Map);
      } else if (data['openingHours'] is List) {
        // If it's a List, ignore it (should be a Map)
        if (kDebugMode) {
          print('Warning: openingHours is a List, expected Map for venue ${doc.id}');
        }
      }
    }
    
    // Safely parse menuSections - handle both Map and List
    Map<String, dynamic>? menuSectionsValue;
    if (data['menuSections'] != null) {
      if (data['menuSections'] is Map) {
        menuSectionsValue = Map<String, dynamic>.from(data['menuSections'] as Map);
      } else if (data['menuSections'] is List) {
        // Convert List to Map format (index-based keys: "0", "1", "2", etc.)
        final sectionsList = data['menuSections'] as List;
        menuSectionsValue = <String, dynamic>{};
        for (int i = 0; i < sectionsList.length; i++) {
          final section = sectionsList[i];
          if (section is Map) {
            menuSectionsValue[i.toString()] = Map<String, dynamic>.from(section);
          }
        }
        if (kDebugMode && menuSectionsValue.isNotEmpty) {
          print('Converted menuSections from List to Map format for venue ${doc.id}');
        }
      }
    }
    
    return VenueModel(
      venueId: doc.id,
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      atmosphere: data['atmosphere'],
      address: data['address'] ?? '',
      phone: data['phone'],
      location: data['location'] as GeoPoint,
      openingHours: openingHoursValue,
      imageUrls: List<String>.from(data['imageUrl'] ?? []),
      foodImageUrls: List<String>.from(data['foodImageUrl'] ?? []),
      menuImageUrls: List<String>.from(data['menuImageUrl'] ?? []),
      imageFocus: _parseFocusList(data['imageFocus'], (data['imageUrl'] as List?)?.length ?? 0),
      foodImageFocus: _parseFocusList(data['foodImageFocus'], (data['foodImageUrl'] as List?)?.length ?? 0),
      menuImageFocus: _parseFocusList(data['menuImageFocus'], (data['menuImageUrl'] as List?)?.length ?? 0),
      introduction: data['introduction'],
      designAndAtmosphere: data['designAndAtmosphere'],
      offeringsAndMenu: data['offeringsAndMenu'],
      publicOpinionHighlights: data['publicOpinionHighlights'],
      satisfactionScore: data['satisfactionScore']?.toDouble(),
      experiences: experiencesList,
      menuSections: menuSectionsValue,
      followersCount: data['followersCount'] ?? 0,
      tags: List<String>.from(data['tags'] ?? []),
      currency: data['currency'] as String?,
    );
  }
  
  // Helper method to get active experience IDs
  List<String> getActiveExperienceIds() {
    return experiences
        .where((exp) {
          final vis = exp['visibility'];
          if (vis != null) return vis == true;
          return exp['isActive'] != false; // legacy
        })
        .map((exp) => exp['experienceId'] as String? ?? '')
        .where((id) => id.isNotEmpty)
        .toList();
  }

  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'description': description,
      'atmosphere': atmosphere,
      'address': address,
      'phone': phone,
      'location': location,
      'openingHours': openingHours,
      'imageUrl': imageUrls,
    };
  }
}

