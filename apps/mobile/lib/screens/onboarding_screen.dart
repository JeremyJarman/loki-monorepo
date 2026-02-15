import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/onboarding_preferences.dart';
import '../services/firestore_service.dart';

/// Multi-step onboarding: general preferences, vibe, music, allergies/special requirements.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  final FirestoreService _firestoreService = FirestoreService();
  int _currentPage = 0;
  bool _isSaving = false;

  late OnboardingPreferences _prefs;

  static const List<String> _generalOptions = [
    'Coffee & cafés',
    'Bars & nightlife',
    'Restaurants & dining',
    'Live music',
    'Outdoor & nature',
    'Date nights',
    'Group hangouts',
    'Solo time',
    'Work-friendly',
    'Family-friendly',
  ];

  static const List<String> _vibeOptions = [
    'Cozy',
    'Lively',
    'Quiet',
    'Romantic',
    'Casual',
    'Upscale',
    'Intimate',
    'Spacious',
    'Low-key',
    'Vibrant',
  ];

  static const List<String> _musicOptions = [
    'Jazz',
    'Electronic',
    'Live bands',
    'Acoustic',
    'Hip-hop',
    'Classical',
    'No preference',
    'Background only',
    'DJ sets',
    'Silent / minimal',
  ];

  final TextEditingController _allergiesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _prefs = const OnboardingPreferences();
    _loadExisting();
  }

  Future<void> _loadExisting() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    final existing = await _firestoreService.getOnboardingPreferences(uid);
    if (mounted) {
      setState(() {
        _prefs = existing;
        _allergiesController.text = existing.allergiesOrRequirements;
      });
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    _allergiesController.dispose();
    super.dispose();
  }

  void _toggle(List<String> list, String item, void Function(List<String>) set) {
    final next = list.contains(item)
        ? list.where((x) => x != item).toList()
        : [...list, item];
    setState(() => set(next));
  }

  void _next() {
    if (_currentPage < 3) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      setState(() => _currentPage++);
    }
  }

  void _back() {
    if (_currentPage > 0) {
      _pageController.previousPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      setState(() => _currentPage--);
    } else {
      Navigator.of(context).pop();
    }
  }

  Future<void> _saveAndFinish() async {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please sign in to save preferences')),
        );
      }
      return;
    }
    setState(() => _isSaving = true);
    try {
      final prefs = _prefs.copyWith(
        allergiesOrRequirements: _allergiesController.text.trim(),
      );
      await _firestoreService.saveOnboardingPreferences(uid, prefs);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Preferences saved')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Your preferences'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _back,
        ),
      ),
      body: Column(
        children: [
          // Progress
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            child: Row(
              children: List.generate(4, (i) {
                return Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    height: 4,
                    decoration: BoxDecoration(
                      color: i <= _currentPage
                          ? Theme.of(context).colorScheme.primary
                          : Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                );
              }),
            ),
          ),
          Expanded(
            child: PageView(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              onPageChanged: (i) => setState(() => _currentPage = i),
              children: [
                _buildGeneralPage(),
                _buildVibePage(),
                _buildMusicPage(),
                _buildAllergiesPage(),
              ],
            ),
          ),
          // Bottom nav
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  if (_currentPage > 0)
                    TextButton(
                      onPressed: _isSaving ? null : _back,
                      child: const Text('Back'),
                    ),
                  const Spacer(),
                  if (_currentPage < 3)
                    FilledButton(
                      onPressed: _next,
                      child: const Text('Next'),
                    )
                  else
                    FilledButton(
                      onPressed: _isSaving ? null : _saveAndFinish,
                      child: _isSaving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Save & finish'),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChipGrid({
    required List<String> options,
    required List<String> selected,
    required void Function(List<String>) onUpdate,
  }) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((option) {
        final isSelected = selected.contains(option);
        return FilterChip(
          label: Text(option),
          selected: isSelected,
          onSelected: (_) => _toggle(selected, option, onUpdate),
        );
      }).toList(),
    );
  }

  Widget _buildGeneralPage() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'General preferences',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'What do you usually look for? Pick any that apply.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).textTheme.bodySmall?.color,
                ),
          ),
          const SizedBox(height: 24),
          _buildChipGrid(
            options: _generalOptions,
            selected: _prefs.generalPreferences,
            onUpdate: (v) => setState(
                () => _prefs = _prefs.copyWith(generalPreferences: v)),
          ),
        ],
      ),
    );
  }

  Widget _buildVibePage() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Vibe & atmosphere',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'What kind of vibe do you enjoy?',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).textTheme.bodySmall?.color,
                ),
          ),
          const SizedBox(height: 24),
          _buildChipGrid(
            options: _vibeOptions,
            selected: _prefs.vibePreferences,
            onUpdate: (v) =>
                setState(() => _prefs = _prefs.copyWith(vibePreferences: v)),
          ),
        ],
      ),
    );
  }

  Widget _buildMusicPage() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Music preferences',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'What music do you like when you\'re out?',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).textTheme.bodySmall?.color,
                ),
          ),
          const SizedBox(height: 24),
          _buildChipGrid(
            options: _musicOptions,
            selected: _prefs.musicPreferences,
            onUpdate: (v) =>
                setState(() => _prefs = _prefs.copyWith(musicPreferences: v)),
          ),
        ],
      ),
    );
  }

  Widget _buildAllergiesPage() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Allergies & special requirements',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            'Anything we should know? Dietary restrictions, allergies, accessibility, or other needs.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).textTheme.bodySmall?.color,
                ),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _allergiesController,
            maxLines: 4,
            decoration: const InputDecoration(
              hintText: 'e.g. Nut allergy, vegetarian, wheelchair access...',
              border: OutlineInputBorder(),
              alignLabelWithHint: true,
            ),
          ),
        ],
      ),
    );
  }
}
