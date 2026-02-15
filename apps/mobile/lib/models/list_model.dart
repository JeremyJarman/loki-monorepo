import 'package:cloud_firestore/cloud_firestore.dart';

class ListModel {
  final String listId;
  final String userId;
  final String name;
  final String? description;
  final List<String> venueIds;
  final int shareCount;
  final String? imageUrl;

  ListModel({
    required this.listId,
    required this.userId,
    required this.name,
    this.description,
    this.venueIds = const [],
    this.shareCount = 0,
    this.imageUrl,
  });

  factory ListModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ListModel(
      listId: doc.id,
      userId: data['userId'] ?? '',
      name: data['name'] ?? '',
      description: data['description'],
      venueIds: List<String>.from(data['venueIds'] ?? []),
      shareCount: data['shareCount'] ?? 0,
      imageUrl: data['imageUrl'],
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'name': name,
      'description': description,
      'venueIds': venueIds,
      'shareCount': shareCount,
      if (imageUrl != null) 'imageUrl': imageUrl,
    };
  }

  ListModel copyWith({
    String? listId,
    String? userId,
    String? name,
    String? description,
    List<String>? venueIds,
    int? shareCount,
    String? imageUrl,
  }) {
    return ListModel(
      listId: listId ?? this.listId,
      userId: userId ?? this.userId,
      name: name ?? this.name,
      description: description ?? this.description,
      venueIds: venueIds ?? this.venueIds,
      shareCount: shareCount ?? this.shareCount,
      imageUrl: imageUrl ?? this.imageUrl,
    );
  }
}

