import 'package:cloud_firestore/cloud_firestore.dart';

class FollowModel {
  final String followerId;
  final String followingId;
  final Timestamp timestamp;

  FollowModel({
    required this.followerId,
    required this.followingId,
    required this.timestamp,
  });

  factory FollowModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return FollowModel(
      followerId: data['followerId'] ?? '',
      followingId: data['followingId'] ?? '',
      timestamp: data['timestamp'] as Timestamp,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'followerId': followerId,
      'followingId': followingId,
      'timestamp': timestamp,
    };
  }
}

