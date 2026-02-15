import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../widgets/experience_instance_card.dart';
import '../widgets/special_card_mini.dart';
import '../models/experience_instance_model.dart';
import '../models/experience_model.dart';
import '../models/venue_model.dart';
import '../services/firestore_service.dart';
import '../services/location_service.dart';
import '../utils/responsive_layout.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final FirestoreService _firestoreService = FirestoreService();
  final LocationService _locationService = LocationService();
  final ScrollController _scrollController = ScrollController();
  Position? _userPosition;

  // Paginated specials: load 5 at a time, visibility-filtered, cached in memory
  static const int _specialsPageSize = 5;
  List<ExperienceInstanceModel> _specialInstances = [];
  DocumentSnapshot? _lastSpecialDoc;
  bool _hasMoreSpecials = true;
  bool _loadingMoreSpecials = false;
  bool _specialsFirstLoadDone = false;

  @override
  void initState() {
    super.initState();
    // Defer non-critical work to after first frame to reduce startup jank
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _getCurrentLocation();
      _loadMoreSpecials();
    });
  }

  Future<void> _loadMoreSpecials() async {
    if (_loadingMoreSpecials || !_hasMoreSpecials) return;
    setState(() => _loadingMoreSpecials = true);
    try {
      final page = await _firestoreService.getVisibleSpecialExperiencesPage(
        limit: _specialsPageSize,
        startAfter: _lastSpecialDoc,
      );
      final list = page['instances'] as List<ExperienceInstanceModel>;
      final lastDoc = page['lastDoc'] as DocumentSnapshot?;
      final hasMore = page['hasMore'] as bool;
      if (mounted) {
        setState(() {
          _specialInstances = [..._specialInstances, ...list];
          _lastSpecialDoc = lastDoc;
          _hasMoreSpecials = hasMore;
          _loadingMoreSpecials = false;
          _specialsFirstLoadDone = true;
        });
      }
    } catch (e) {
      debugPrint('Error loading specials: $e');
      if (mounted) {
        setState(() {
          _loadingMoreSpecials = false;
          _specialsFirstLoadDone = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _getCurrentLocation() async {
    try {
      final position = await _locationService.getCurrentLocation();
      if (mounted) {
        setState(() {
          _userPosition = position;
        });
        if (kDebugMode && position != null) {
          debugPrint('HomeScreen: User position set to - Lat: ${position.latitude}, Lon: ${position.longitude}');
        }
      }
    } catch (e) {
      // Location service failed, but we can still show the screen
      debugPrint('Error getting location: $e');
      if (mounted) {
        setState(() {
          _userPosition = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // On web, don't show the app bar if we're using top navigation
    final showAppBar = !kIsWeb;
    
    return Column(
      children: [
        // Custom App Bar (hidden on web when using top nav)
        if (showAppBar)
          Container(
            color: Theme.of(context).scaffoldBackgroundColor,
            child: SafeArea(
              bottom: false,
              child: ResponsivePadding(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Text(
                    'Home',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).textTheme.bodyLarge?.color,
                        ),
                  ),
                ),
              ),
            ),
          ),

        // Content
        Expanded(
          child: ResponsivePadding(
            child: _buildContent(),
          ),
        ),
      ],
    );
  }

  Widget _buildContent() {
    return StreamBuilder<List<ExperienceInstanceModel>>(
      stream: _firestoreService.getAllUpcomingInstances(),
      builder: (context, instancesSnapshot) {
        // Show loading if stream is loading (but only on first load)
        if (instancesSnapshot.connectionState == ConnectionState.waiting &&
            !instancesSnapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        // Handle errors gracefully - show data if available
        if (instancesSnapshot.hasError && !instancesSnapshot.hasData) {
          debugPrint('Error loading instances: ${instancesSnapshot.error}');
        }

        var instances = instancesSnapshot.data ?? [];

        // Separate into live and upcoming events only (upcoming specials come from paginated _specialInstances)
        final now = DateTime.now();
        final liveInstances = <ExperienceInstanceModel>[];
        final upcomingEvents = <ExperienceInstanceModel>[];

        for (final instance in instances) {
          final startDate = instance.startAt.toDate();
          final endDate = instance.endAt.toDate();
          if (startDate.isBefore(now) && endDate.isAfter(now)) {
            liveInstances.add(instance);
          } else if (startDate.isAfter(now) && instance.type != 'special') {
            upcomingEvents.add(instance);
          }
        }

        liveInstances.sort((a, b) => a.startAt.compareTo(b.startAt));
        upcomingEvents.sort((a, b) => a.startAt.compareTo(b.startAt));

        // Build list: live, then upcoming specials (from cache), then upcoming events
        final itemsWithSections = <_SectionItem>[];

        if (liveInstances.isNotEmpty) {
          itemsWithSections.add(_SectionItem(isHeader: true, title: 'Live Now'));
          for (final instance in liveInstances) {
            itemsWithSections.add(_SectionItem(isHeader: false, instance: instance));
          }
        }

        // Upcoming specials: paginated, visibility-filtered, cached in _specialInstances
        itemsWithSections.add(_SectionItem(isHeader: true, title: 'Upcoming Specials'));
        if (_specialInstances.isNotEmpty) {
          for (final instance in _specialInstances) {
            itemsWithSections.add(_SectionItem(isHeader: false, instance: instance));
          }
        }

        if (upcomingEvents.isNotEmpty) {
          itemsWithSections.add(_SectionItem(isHeader: true, title: 'Upcoming Events'));
          for (final instance in upcomingEvents) {
            itemsWithSections.add(_SectionItem(isHeader: false, instance: instance));
          }
        }

        final hasAnyContent = liveInstances.isNotEmpty ||
            _specialInstances.isNotEmpty ||
            upcomingEvents.isNotEmpty ||
            _hasMoreSpecials ||
            _loadingMoreSpecials;
        if (!hasAnyContent && _specialsFirstLoadDone) {
          return const Center(child: Text('No upcoming events found'));
        }

        // Build sections for possible grid layout on web
        final sections = <_HomeSection>[];
        String? currentTitle;
        for (final item in itemsWithSections) {
          if (item.isHeader) {
            currentTitle = item.title;
          } else if (currentTitle != null && item.instance != null) {
            if (sections.isNotEmpty && sections.last.title == currentTitle) {
              sections.last.instances.add(item.instance!);
            } else {
              sections.add(_HomeSection(title: currentTitle, instances: [item.instance!]));
            }
          }
        }
        // Ensure Upcoming Specials section exists (may have 0 instances so not created above)
        if (sections.every((s) => s.title != 'Upcoming Specials')) {
          final idx = sections.indexWhere((s) => s.title == 'Upcoming Events');
          if (idx >= 0) {
            sections.insert(idx, _HomeSection(title: 'Upcoming Specials', instances: _specialInstances));
          } else {
            sections.add(_HomeSection(title: 'Upcoming Specials', instances: _specialInstances));
          }
        }

        final width = MediaQuery.of(context).size.width;
        final useGrid = kIsWeb && width > 800;
        final crossAxisCount = width > 1100 ? 3 : 2;

        return CustomScrollView(
          controller: _scrollController,
          slivers: [
            for (final section in sections) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 16, bottom: 8),
                  child: Text(
                    section.title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
              ),
              if (useGrid)
                SliverGrid(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 0.82,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      if (section.title == 'Upcoming Specials' &&
                          index == section.instances.length) {
                        return _buildLoadMoreSpecials();
                      }
                      final instance = section.instances[index];
                      return RepaintBoundary(
                        child: _buildInstanceCard(instance),
                      );
                    },
                    childCount: section.instances.length +
                        (section.title == 'Upcoming Specials'
                            ? (_hasMoreSpecials || _loadingMoreSpecials ? 1 : 0)
                            : 0),
                  ),
                )
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      if (section.title == 'Upcoming Specials' &&
                          index == section.instances.length) {
                        return _buildLoadMoreSpecials();
                      }
                      final instance = section.instances[index];
                      return RepaintBoundary(
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: _buildInstanceCard(instance),
                        ),
                      );
                    },
                    childCount: section.instances.length +
                        (section.title == 'Upcoming Specials'
                            ? (_hasMoreSpecials || _loadingMoreSpecials ? 1 : 0)
                            : 0),
                  ),
                ),
            ],
          ],
        );
      },
    );
  }

  Widget _buildLoadMoreSpecials() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Center(
        child: _loadingMoreSpecials
            ? const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            : TextButton(
                onPressed: _hasMoreSpecials ? _loadMoreSpecials : null,
                child: const Text('Load more specials'),
              ),
      ),
    );
  }

  Widget _buildInstanceCard(ExperienceInstanceModel instance) {
    return StreamBuilder<ExperienceModel?>(
      stream: _firestoreService.getExperienceStream(instance.experienceId),
      builder: (context, experienceSnapshot) {
        final experience = experienceSnapshot.data;
        return StreamBuilder<VenueModel?>(
          stream: _firestoreService.getVenueStream(instance.venueId),
          builder: (context, venueSnapshot) {
            final venue = venueSnapshot.data;
            if (instance.type == 'special') {
              return SpecialCardMini(
                key: ValueKey('special_${instance.instanceId}'),
                instance: instance,
                experience: experience,
                venue: venue,
                userPosition: _userPosition,
              );
            }
            return ExperienceInstanceCard(
              key: ValueKey('event_${instance.instanceId}'),
              instance: instance,
              experience: experience,
              venue: venue,
              userPosition: _userPosition,
            );
          },
        );
      },
    );
  }
}

// Helper class for section headers and items
class _SectionItem {
  final bool isHeader;
  final String? title;
  final ExperienceInstanceModel? instance;

  _SectionItem({
    required this.isHeader,
    this.title,
    this.instance,
  });
}

class _HomeSection {
  final String title;
  final List<ExperienceInstanceModel> instances;

  _HomeSection({required this.title, required this.instances});
}
