import 'package:cloud_firestore/cloud_firestore.dart';

class EventModel {
  final String eventId;
  final String venueId;
  final String name;
  final String description;
  final Timestamp dateTime;
  final String? cost;
  final String? imageUrl;

  EventModel({
    required this.eventId,
    required this.venueId,
    required this.name,
    required this.description,
    required this.dateTime,
    this.cost,
    this.imageUrl,
  });

  factory EventModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return EventModel(
      eventId: doc.id,
      venueId: data['venueId'] ?? '',
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      dateTime: data['dateTime'] as Timestamp,
      cost: data['cost'],
      imageUrl: data['imageUrl'],
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'venueId': venueId,
      'name': name,
      'description': description,
      'dateTime': dateTime,
      'cost': cost,
      'imageUrl': imageUrl,
    };
  }
}

