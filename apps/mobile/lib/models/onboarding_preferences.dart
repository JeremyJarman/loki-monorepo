/// User onboarding preferences: general prefs, vibe, music, allergies/special requirements.
class OnboardingPreferences {
  final List<String> generalPreferences;
  final List<String> vibePreferences;
  final List<String> musicPreferences;
  final String allergiesOrRequirements;

  const OnboardingPreferences({
    this.generalPreferences = const [],
    this.vibePreferences = const [],
    this.musicPreferences = const [],
    this.allergiesOrRequirements = '',
  });

  static const String _keyGeneral = 'onboardingGeneralPreferences';
  static const String _keyVibe = 'onboardingVibePreferences';
  static const String _keyMusic = 'onboardingMusicPreferences';
  static const String _keyAllergies = 'onboardingAllergiesOrRequirements';

  Map<String, dynamic> toFirestore() {
    return {
      _keyGeneral: generalPreferences,
      _keyVibe: vibePreferences,
      _keyMusic: musicPreferences,
      _keyAllergies: allergiesOrRequirements,
    };
  }

  static OnboardingPreferences fromFirestore(Map<String, dynamic>? data) {
    if (data == null) return const OnboardingPreferences();
    return OnboardingPreferences(
      generalPreferences: List<String>.from(data[_keyGeneral] ?? []),
      vibePreferences: List<String>.from(data[_keyVibe] ?? []),
      musicPreferences: List<String>.from(data[_keyMusic] ?? []),
      allergiesOrRequirements: data[_keyAllergies] as String? ?? '',
    );
  }

  OnboardingPreferences copyWith({
    List<String>? generalPreferences,
    List<String>? vibePreferences,
    List<String>? musicPreferences,
    String? allergiesOrRequirements,
  }) {
    return OnboardingPreferences(
      generalPreferences: generalPreferences ?? this.generalPreferences,
      vibePreferences: vibePreferences ?? this.vibePreferences,
      musicPreferences: musicPreferences ?? this.musicPreferences,
      allergiesOrRequirements:
          allergiesOrRequirements ?? this.allergiesOrRequirements,
    );
  }
}
