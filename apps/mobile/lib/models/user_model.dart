import 'package:cloud_firestore/cloud_firestore.dart';

class UserModel {
  final String uid;
  final String username;
  final String? about;
  final String? profileImageUrl;
  final int followersCount;
  final int followingCount;
  final List<String> favoriteVenueIds;

  UserModel({
    required this.uid,
    required this.username,
    this.about,
    this.profileImageUrl,
    this.followersCount = 0,
    this.followingCount = 0,
    this.favoriteVenueIds = const [],
  });

  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return UserModel(
      uid: doc.id,
      username: data['username'] ?? '',
      about: data['about'],
      profileImageUrl: data['profileImageUrl'],
      followersCount: data['followersCount'] ?? 0,
      followingCount: data['followingCount'] ?? 0,
      favoriteVenueIds: List<String>.from(data['favoriteVenueIds'] ?? []),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'username': username,
      'about': about,
      'profileImageUrl': profileImageUrl,
      'followersCount': followersCount,
      'followingCount': followingCount,
      'favoriteVenueIds': favoriteVenueIds,
    };
  }

  UserModel copyWith({
    String? uid,
    String? username,
    String? about,
    String? profileImageUrl,
    int? followersCount,
    int? followingCount,
    List<String>? favoriteVenueIds,
  }) {
    return UserModel(
      uid: uid ?? this.uid,
      username: username ?? this.username,
      about: about ?? this.about,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      followersCount: followersCount ?? this.followersCount,
      followingCount: followingCount ?? this.followingCount,
      favoriteVenueIds: favoriteVenueIds ?? this.favoriteVenueIds,
    );
  }
}

