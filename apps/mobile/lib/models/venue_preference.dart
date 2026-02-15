/// User preference signal for a venue (Likes.MD: Love, Like, Not my vibe).
/// No star ratings — "Is this place right for me?" not "Is this place good?"
enum VenuePreference {
  none,
  love,   // ❤️ strong positive
  like,   // 👍 medium positive
  notMyVibe, // 🙅 strong negative, private
}

extension VenuePreferenceX on VenuePreference {
  String get firestoreValue {
    switch (this) {
      case VenuePreference.none:
        return '';
      case VenuePreference.love:
        return 'love';
      case VenuePreference.like:
        return 'like';
      case VenuePreference.notMyVibe:
        return 'not_my_vibe';
    }
  }

  static VenuePreference fromFirestore(String? value) {
    switch (value) {
      case 'love':
        return VenuePreference.love;
      case 'like':
        return VenuePreference.like;
      case 'not_my_vibe':
        return VenuePreference.notMyVibe;
      default:
        return VenuePreference.none;
    }
  }
}
