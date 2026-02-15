import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:async';
import '../models/venue_model.dart';
import '../models/venue_preference.dart';
import '../theme/app_colors.dart';
import '../models/experience_instance_model.dart';
import '../models/experience_model.dart';
import '../screens/venue_profile_screen.dart';
import '../screens/save_to_screen.dart';
import '../services/location_service.dart';
import '../services/firestore_service.dart';
import '../services/cache_service.dart';
import '../utils/opening_hours_helper.dart';
import 'menu_item_card.dart';
import 'event_card_mini.dart';
import 'special_card_mini.dart';

class VenueCard extends StatefulWidget {
  final VenueModel venue;
  final Position? userPosition;

  const VenueCard({
    super.key,
    required this.venue,
    this.userPosition,
  });

  @override
  State<VenueCard> createState() => _VenueCardState();
}

class _VenueCardState extends State<VenueCard> with SingleTickerProviderStateMixin {
  int _currentImageIndex = 0;
  bool _isExpanded = false;
  late TabController _tabController;
  final LocationService _locationService = LocationService();
  final FirestoreService _firestoreService = FirestoreService();
  
  // Cache computed values to avoid recalculating on every build
  String? _cachedDistance;
  
  // Track active events and specials for indicators
  int _activeEventsCount = 0;
  int _activeSpecialsCount = 0;
  
  // Store subscriptions to cancel them on dispose
  StreamSubscription<List<ExperienceInstanceModel>>? _eventsCountSubscription;
  StreamSubscription<List<ExperienceInstanceModel>>? _specialsCountSubscription;
  
  // Menu tab scroll controller and section tracking
  final ScrollController _menuScrollController = ScrollController();
  final Map<String, GlobalKey> _menuSectionKeys = {};
  String? _selectedMenuSection;
  bool _isScrollingToSection = false;
  bool _menuScrollListenerAdded = false;
  // Store section titles and keys as they're found when building menu
  final Map<String, String> _menuSectionTitles = {}; // key -> title
  bool _showMenuSectionSelector = false; // Show selector only when scrolled past first section
  
  // Performance optimization: throttle scroll updates
  DateTime? _lastScrollUpdate;
  static const _scrollThrottleMs = 100; // Update at most every 100ms

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _computeCachedValues();
    _checkActiveEventsAndSpecials();
    _tabController.addListener(() {
      if (_tabController.indexIsChanging || _tabController.index != _tabController.previousIndex) {
        setState(() {
          _currentImageIndex = 0; // Reset to first image when tab changes
        });
      }
    });
  }
  
  void _checkActiveEventsAndSpecials() {
    final activeExperienceIds = widget.venue.getActiveExperienceIds();
    if (activeExperienceIds.isEmpty) {
      setState(() {
        _activeEventsCount = 0;
        _activeSpecialsCount = 0;
      });
      return;
    }
    
    // Cancel previous subscriptions if they exist
    _eventsCountSubscription?.cancel();
    _specialsCountSubscription?.cancel();
    
    // Check for active events
    _eventsCountSubscription = _firestoreService
        .getExperienceInstancesByExperienceIdsAndType(activeExperienceIds, 'event')
        .listen((instances) {
      if (mounted) {
        setState(() {
          _activeEventsCount = instances.length;
        });
      }
    });
    
    // Check for active specials
    _specialsCountSubscription = _firestoreService
        .getExperienceInstancesByExperienceIdsAndType(activeExperienceIds, 'special')
        .listen((instances) {
      if (mounted) {
        setState(() {
          _activeSpecialsCount = instances.length;
        });
      }
    });
  }
  
  @override
  void didUpdateWidget(VenueCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Recompute if inputs changed
    if (oldWidget.venue != widget.venue || oldWidget.userPosition != widget.userPosition) {
      _computeCachedValues();
    }
  }
  
  void _computeCachedValues() {
    _cachedDistance = _computeDistance();
  }

  @override
  void dispose() {
    // Cancel subscriptions to prevent memory leaks
    _eventsCountSubscription?.cancel();
    _specialsCountSubscription?.cancel();
    _tabController.dispose();
    _menuScrollController.dispose();
    super.dispose();
  }


  void _navigateToProfile() {
    // Cache the venue when navigating to profile screen
    // This reduces Firestore queries when the profile screen loads
    final cacheService = CacheService();
    cacheService.cacheVenue(widget.venue);
    
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VenueProfileScreen(
          venue: widget.venue,
          userPosition: widget.userPosition,
        ),
      ),
    );
  }

  List<String> _getCurrentCarouselImages() {
    // Get images based on selected tab
    final selectedIndex = _tabController.index;
    switch (selectedIndex) {
      case 0: // Venue tab
        return widget.venue.imageUrls;
      case 1: // Menu tab
        // Fall back to venue images if food images are empty
        return widget.venue.foodImageUrls.isNotEmpty 
            ? widget.venue.foodImageUrls 
            : widget.venue.imageUrls;
      case 2: // Events tab
        // Use venue images as fallback
        return widget.venue.imageUrls;
      case 3: // Specials tab
        // Use venue images as fallback
        return widget.venue.imageUrls;
      default:
        return widget.venue.imageUrls;
    }
  }

  List<String> _getCurrentCarouselFocus() {
    final selectedIndex = _tabController.index;
    switch (selectedIndex) {
      case 0:
        return widget.venue.imageFocus;
      case 1:
        return widget.venue.foodImageUrls.isNotEmpty
            ? widget.venue.foodImageFocus
            : widget.venue.imageFocus;
      case 2:
      case 3:
      default:
        return widget.venue.imageFocus;
    }
  }

  @override
  Widget build(BuildContext context) {
    final carouselImages = _getCurrentCarouselImages();
    final carouselFocus = _getCurrentCarouselFocus();
    return Card(
      margin: EdgeInsets.zero,
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image with Venue Name + Icon set overlay, rounded corners all round
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: AspectRatio(
              aspectRatio: 1.0,
              child: Stack(
              children: [
                // Image Carousel (dynamic based on selected tab)
                if (carouselImages.isNotEmpty && 
                    carouselImages.any((url) => url.isNotEmpty))
                  SizedBox(
                    width: double.infinity,
                    height: double.infinity,
                    child: PageView.builder(
                    itemCount: carouselImages.length,
                    onPageChanged: (index) {
                      setState(() {
                        _currentImageIndex = index;
                      });
                    },
                    itemBuilder: (context, index) {
                      final imageUrl = carouselImages[index];
                      if (imageUrl.isEmpty) {
                        return Container(
                          color: Theme.of(context).colorScheme.surface,
                          child: Center(
                            child: CircularProgressIndicator(
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                        );
                      }
                      final focus = index < carouselFocus.length ? carouselFocus[index] : 'center';
                      final alignment = imageFocusToAlignment(focus);
                      return SizedBox(
                        width: double.infinity,
                        height: double.infinity,
                        child: FittedBox(
                          fit: BoxFit.cover,
                          alignment: alignment,
                          child: CachedNetworkImage(
                            imageUrl: imageUrl,
                            width: 1000,
                            height: 1000,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: Theme.of(context).colorScheme.surface,
                              child: Center(
                                child: CircularProgressIndicator(
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                            ),
                            errorWidget: (context, url, error) => Container(
                              color: Theme.of(context).colorScheme.surface,
                              child: Center(
                                child: CircularProgressIndicator(
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                )
                else
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                    child: Container(
                      color: Theme.of(context).colorScheme.surface,
                      child: Center(
                        child: CircularProgressIndicator(
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                  ),
              
              // Gradient overlay + Venue name + Icon set (distance, likes, open) in white
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Colors.black.withOpacity(0.85),
                        Colors.black.withOpacity(0.5),
                        Colors.transparent,
                      ],
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(16, 36, 16, 12),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: _navigateToProfile,
                              child: Text(
                                widget.venue.name,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  shadows: [
                                    Shadow(
                                      offset: Offset(1, 1),
                                      blurRadius: 3,
                                      color: Colors.black54,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => _showInteractDrawer(context),
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white.withOpacity(0.3),
                                    width: 1,
                                  ),
                                ),
                                child: const Icon(
                                  Icons.more_vert,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          Icon(Icons.location_on_outlined, size: 16, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(
                            _cachedDistance != null && _cachedDistance != 'Distance unavailable'
                                ? _cachedDistance!
                                : '—',
                            style: const TextStyle(
                              fontSize: 13,
                              color: Colors.white,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(width: 12),
                          Icon(Icons.favorite_border, size: 16, color: Colors.white),
                          const SizedBox(width: 4),
                          Text(
                            '${widget.venue.followersCount}',
                            style: const TextStyle(
                              fontSize: 13,
                              color: Colors.white,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Icon(Icons.access_time_outlined, size: 16, color: Colors.white),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              OpeningHoursHelper.getCurrentStatus(widget.venue.openingHours),
                              style: const TextStyle(
                                fontSize: 13,
                                color: Colors.white,
                                fontWeight: FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              
              // Image Indicators (dots) - positioned at top right
              if (carouselImages.length > 1)
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(
                        carouselImages.length,
                        (index) => Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _currentImageIndex == index
                                ? Colors.white
                                : Colors.white.withOpacity(0.5),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
          ),

          // Divider above tabs (light grey, not full width)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Divider(height: 1, color: Colors.grey.shade300, thickness: 1),
          ),
          const SizedBox(height: 0),
          // Tabs
          AnimatedBuilder(
            animation: _tabController,
            builder: (context, child) {
              return TabBar(
                controller: _tabController,
                tabs: [
                  const Tab(text: 'About'),
                  const Tab(text: 'Menu'),
                  _buildTabWithIndicator('Events', _activeEventsCount, 2),
                  _buildTabWithIndicator('Specials', _activeSpecialsCount, 3),
                ],
                labelColor: Colors.black,
                unselectedLabelColor: Colors.grey,
                indicatorColor: Theme.of(context).colorScheme.primary,
                labelPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              );
            },
          ),
          const SizedBox(height: 0),
          // Tab Content
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            height: _isExpanded ? 400 : 72,
            child: TabBarView(
              controller: _tabController,
              physics: _isExpanded ? const AlwaysScrollableScrollPhysics() : const NeverScrollableScrollPhysics(),
              children: [
                _buildVenueTab(),
                _buildMenuTab(),
                _buildEventsTab(),
                _buildSpecialsTab(),
              ],
            ),
          ),
          // See More / See Less Button
          if (!_isExpanded)
            Center(
              child: TextButton.icon(
                onPressed: () {
                  setState(() {
                    _isExpanded = true;
                  });
                },
                icon: const Icon(Icons.expand_more),
                label: const Text('See more'),
              ),
            )
          else
            Center(
              child: TextButton.icon(
                onPressed: () {
                  setState(() {
                    _isExpanded = false;
                  });
                },
                icon: const Icon(Icons.expand_less),
                label: const Text('See less'),
              ),
            ),
        ],
      ),
    );
  }

  String _computeDistance() {
    if (widget.userPosition == null) return 'Distance unavailable';
    final userPos = widget.userPosition;
    if (userPos == null) return 'Distance unavailable';
    final distance = _locationService.calculateDistance(
      userPos.latitude,
      userPos.longitude,
      widget.venue.location.latitude,
      widget.venue.location.longitude,
    );
    return _locationService.formatDistance(distance);
  }

  Future<void> _openMaps() async {
    final lat = widget.venue.location.latitude;
    final lon = widget.venue.location.longitude;
    final url = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$lat,$lon',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _bookTable() async {
    // TODO: Implement book a table functionality
    // This could open a booking URL or show a booking dialog
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Book a table functionality coming soon')),
    );
  }

  void _showInteractDrawer(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.35,
        maxChildSize: 0.85,
        builder: (_, scrollController) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.dark
                ? AppColors.backgroundDark
                : Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.max,
            children: [
              // Header: X left, venue name center
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 12, 16, 16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(sheetContext),
                    ),
                    Expanded(
                      child: Text(
                        widget.venue.name,
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: [
                    _InteractOption(
                      icon: Icons.share,
                      label: 'Share',
                      onTap: () {
                        Navigator.pop(sheetContext);
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Share coming soon')),
                        );
                      },
                    ),
                    _InteractOption(
                      icon: Icons.bookmark_border,
                      label: 'Save',
                      onTap: () {
                        Navigator.pop(sheetContext);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => SaveToScreen(
                              venue: widget.venue,
                            ),
                          ),
                        );
                      },
                    ),
                    _InteractDrawerVibeOptions(
                      venueId: widget.venue.venueId,
                      firestoreService: _firestoreService,
                      onTap: () => Navigator.pop(sheetContext),
                    ),
                    _InteractOption(
                      icon: Icons.directions,
                      label: 'Navigate',
                      onTap: () {
                        Navigator.pop(sheetContext);
                        _openMaps();
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }


  Widget _buildTabWithIndicator(String text, int count, int tabIndex) {
    final isSelected = _tabController.index == tabIndex;
    final indicatorColor = isSelected
        ? Theme.of(context).colorScheme.primary
        : Colors.grey;
    
    return Tab(
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          Text(text),
          if (count > 0)
            Positioned(
              top: -4,
              right: -6,
              child: Container(
                width: 5,
                height: 5,
                decoration: BoxDecoration(
                  color: indicatorColor,
                  shape: BoxShape.circle,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildVenueTab() {
    return SingleChildScrollView(
      physics: _isExpanded ? const AlwaysScrollableScrollPhysics() : const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Public Opinion Highlights
          Builder(
            builder: (context) {
              final publicOpinionHighlights = widget.venue.publicOpinionHighlights;
              if (publicOpinionHighlights != null && publicOpinionHighlights.isNotEmpty) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      publicOpinionHighlights,
                      style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(context).textTheme.bodyLarge?.color ?? const Color(0xFF333333),
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                );
              }
              return const SizedBox.shrink();
            },
          ),

          // Atmosphere (no background, primary color)
          Builder(
            builder: (context) {
              final atmosphere = widget.venue.atmosphere;
              if (atmosphere != null && atmosphere.isNotEmpty) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.local_bar,
                          color: Theme.of(context).colorScheme.primary,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Atmosphere: $atmosphere',
                          style: TextStyle(
                            fontSize: 14,
                            color: Theme.of(context).colorScheme.primary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                  ],
                );
              }
              return const SizedBox.shrink();
            },
          ),

          // Navigate and Book Table buttons (only shown when expanded)
          if (_isExpanded) ...[
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _openMaps,
                    icon: Icon(
                      Icons.directions,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    label: Text(
                      'Navigate',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _bookTable,
                    icon: const Icon(Icons.restaurant_menu),
                    label: const Text('Book a Table'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMenuTab() {
    final menuSections = widget.venue.menuSections;
    final hasMenuItems = menuSections != null && menuSections.isNotEmpty;
    
    // Clear and repopulate section titles from the actual menu sections
    _menuSectionTitles.clear();
    
    if (hasMenuItems) {
      final sortedSectionKeys = menuSections.keys.toList()
        ..sort((a, b) {
          final aIndex = int.tryParse(a) ?? 999;
          final bIndex = int.tryParse(b) ?? 999;
          return aIndex.compareTo(bIndex);
        });
      
      for (final sectionKey in sortedSectionKeys) {
        final section = menuSections[sectionKey] as Map<String, dynamic>?;
        if (section == null) continue;
        
        final items = section['items'] as List<dynamic>?;
        if (items == null || items.isEmpty) continue;
        
        final sectionTitle = section['title'] as String?;
        if (sectionTitle != null && sectionTitle.isNotEmpty) {
          _menuSectionTitles[sectionKey] = sectionTitle;
        }
      }
    }
    
    // Initialize section keys and selected section on first build
    if (hasMenuItems) {
      if (_menuSectionKeys.isEmpty) {
        _initializeMenuSectionKeys(menuSections);
      }
      // Add listener only once
      if (!_menuScrollListenerAdded) {
        _menuScrollController.addListener(_onMenuScroll);
        _menuScrollListenerAdded = true;
      }
    }
    
    // Reset selector visibility when menu is collapsed
    if (!_isExpanded && _showMenuSectionSelector) {
      _showMenuSectionSelector = false;
    }
    
    return Column(
      children: [
        // Scrollable tab bar for menu sections - always show if menu sections exist
        if (hasMenuItems)
        // Show menu section selector only when expanded and scrolled past first section
        if (_isExpanded && _showMenuSectionSelector)
          Container(
            height: 47, // Reduced by 1 more pixel to fix overflow
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              border: Border(
                bottom: BorderSide(
                  color: Theme.of(context).dividerColor.withOpacity(0.1),
                  width: 1,
                ),
              ),
            ),
            child: _buildMenuSectionTabs(menuSections ?? {}),
          ),
        
        // Menu content with scroll controller
        Expanded(
          child: SingleChildScrollView(
            controller: _menuScrollController,
            physics: _isExpanded ? const AlwaysScrollableScrollPhysics() : const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (hasMenuItems) ...[
                  // Display menu items by section
                  ..._buildMenuSections(menuSections),
                ] else ...[
            // Use food images, or fall back to venue images if food images are empty
            Builder(
              builder: (context) {
                final imagesToUse = widget.venue.foodImageUrls.isNotEmpty 
                    ? widget.venue.foodImageUrls 
                    : widget.venue.imageUrls;
                
                if (imagesToUse.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Text(
                        'No menu available',
                        style: TextStyle(fontSize: 16, color: Colors.grey),
                      ),
                    ),
                  );
                }
                
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Menu',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).textTheme.titleLarge?.color,
                      ),
                    ),
                    const SizedBox(height: 12),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                        childAspectRatio: 0.75,
                      ),
                      itemCount: imagesToUse.length,
                      itemBuilder: (context, index) {
                        final imageUrl = imagesToUse[index];
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: imageUrl.isNotEmpty
                              ? CachedNetworkImage(
                                  imageUrl: imageUrl,
                                  fit: BoxFit.cover,
                                  placeholder: (context, url) => Container(
                                    color: Colors.grey[300],
                                    child: const Center(child: CircularProgressIndicator()),
                                  ),
                                  errorWidget: (context, url, error) => Container(
                                    color: Theme.of(context).colorScheme.surface,
                                    child: Center(
                                      child: CircularProgressIndicator(
                                        color: Theme.of(context).colorScheme.primary,
                                      ),
                                    ),
                                  ),
                                )
                              : Container(
                                  color: Theme.of(context).colorScheme.surface,
                                  child: Center(
                                    child: CircularProgressIndicator(
                                      color: Theme.of(context).colorScheme.primary,
                                    ),
                                  ),
                                ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                );
              },
            ),
          ],
        ],
            ),
          ),
        ),
      ],
    );
  }

  void _initializeMenuSectionKeys(Map<String, dynamic> menuSections) {
    final sortedSectionKeys = menuSections.keys.toList()
      ..sort((a, b) {
        final aIndex = int.tryParse(a) ?? 999;
        final bIndex = int.tryParse(b) ?? 999;
        return aIndex.compareTo(bIndex);
      });
    
    for (final sectionKey in sortedSectionKeys) {
      final section = menuSections[sectionKey] as Map<String, dynamic>?;
      if (section == null) continue;
      
      final items = section['items'] as List<dynamic>?;
      if (items == null || items.isEmpty) continue;
      
      final sectionTitle = section['title'] as String?;
      if (sectionTitle != null && sectionTitle.isNotEmpty) {
        _menuSectionKeys[sectionKey] = GlobalKey();
        _selectedMenuSection ??= sectionKey;
      }
    }
  }

  void _onMenuScroll() {
    if (!mounted) return;
    if (_isScrollingToSection) return;
    if (!_menuScrollController.hasClients) return;
    
    // Throttle scroll updates to reduce frame skipping
    final now = DateTime.now();
    if (_lastScrollUpdate != null) {
      final timeSinceLastUpdate = now.difference(_lastScrollUpdate!);
      if (timeSinceLastUpdate.inMilliseconds < _scrollThrottleMs) {
        return; // Skip this update
      }
    }
    _lastScrollUpdate = now;
    
    // Cache sorted keys to avoid sorting on every scroll
    final sortedKeys = _menuSectionKeys.keys.toList()
      ..sort((a, b) {
        final aIndex = int.tryParse(a) ?? 999;
        final bIndex = int.tryParse(b) ?? 999;
        return aIndex.compareTo(bIndex);
      });
    
    if (sortedKeys.isEmpty) return;
    
    // Check if we've scrolled past the first section title (simplified check)
    bool shouldShowSelector = false;
    final firstSectionKey = sortedKeys.first;
    final firstKey = _menuSectionKeys[firstSectionKey];
    
    if (firstKey != null) {
      final context = firstKey.currentContext;
      if (context != null && context.mounted) {
        final RenderObject? renderObject = context.findRenderObject();
        if (renderObject is RenderBox && renderObject.hasSize) {
          try {
            // Simplified: use scroll offset instead of complex position calculations
            // Show selector when scrolled past first section (roughly 50px threshold)
            shouldShowSelector = _menuScrollController.offset > 50;
          } catch (e) {
            shouldShowSelector = _menuScrollController.offset > 50;
          }
        }
      }
    }
    
    // Update selector visibility only if changed
    if (_showMenuSectionSelector != shouldShowSelector) {
      if (mounted) {
        setState(() {
          _showMenuSectionSelector = shouldShowSelector;
        });
      }
    }
    
    // Find which section is currently visible - use simpler logic
    String? newSelectedSection;
    final scrollOffset = _menuScrollController.offset;
    final topOffset = _showMenuSectionSelector ? 63 : 16; // 47px selector + 16px padding
    
    // Estimate which section is at the top based on scroll offset
    // This is much faster than calculating positions for every section
    for (final sectionKey in sortedKeys) {
      final key = _menuSectionKeys[sectionKey];
      if (key == null) continue;
      
      final context = key.currentContext;
      if (context == null || !context.mounted) continue;
      
      final RenderObject? renderObject = context.findRenderObject();
      if (renderObject is! RenderBox || !renderObject.hasSize) continue;
      
      try {
        // Quick check: get local position in scroll view
        final box = renderObject;
        final localPosition = box.localToGlobal(Offset.zero);
        
        // Get scroll view position for relative calculation
        final scrollViewContext = _menuScrollController.position.context.storageContext;
        final scrollViewBox = scrollViewContext.findRenderObject() as RenderBox?;
        if (scrollViewBox != null && scrollViewBox.hasSize) {
          final scrollViewPosition = scrollViewBox.localToGlobal(Offset.zero);
          final relativeY = localPosition.dy - scrollViewPosition.dy;
          
          // Section is selected if it's near the top of viewport
          if (relativeY >= topOffset - 30 && relativeY <= topOffset + 30) {
            newSelectedSection = sectionKey;
            break; // Found the section at top, no need to check others
          }
        }
            } catch (e) {
        // Skip this section if calculation fails
        continue;
      }
    }
    
    // Update selected section only if changed
    if (newSelectedSection != null && _selectedMenuSection != newSelectedSection) {
      if (mounted) {
        setState(() {
          _selectedMenuSection = newSelectedSection;
        });
      }
    }
  }

  Widget _buildMenuSectionTabs(Map<String, dynamic> menuSections) {
    // Use the stored section titles from _buildMenuSections
    if (_menuSectionTitles.isEmpty) {
      return const SizedBox.shrink();
    }
    
    // Sort keys by their numeric value
    final sortedKeys = _menuSectionTitles.keys.toList()
      ..sort((a, b) {
        final aIndex = int.tryParse(a) ?? 999;
        final bIndex = int.tryParse(b) ?? 999;
        return aIndex.compareTo(bIndex);
      });
    
    return SizedBox(
      height: 47, // Match container height (reduced by 1 pixel)
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5), // Reduced vertical padding by 1
        itemCount: sortedKeys.length,
        itemBuilder: (context, index) {
          final sectionKey = sortedKeys[index];
          final sectionTitle = _menuSectionTitles[sectionKey];
          
          if (sectionTitle == null || sectionTitle.isEmpty) {
            return const SizedBox.shrink();
          }
          
          final isSelected = _selectedMenuSection == sectionKey;
        
        return GestureDetector(
          onTap: () {
            if (mounted) {
              setState(() {
                _selectedMenuSection = sectionKey;
              });
              _scrollToMenuSection(sectionKey);
            }
          },
          behavior: HitTestBehavior.opaque,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5), // Reduced padding by 1
            margin: const EdgeInsets.only(right: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  sectionTitle,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold, // Always bold
                    color: isSelected
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black87,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 2),
                // Underline indicator
                Container(
                  height: 2,
                  width: 50, // Fixed width instead of double.infinity
                  decoration: BoxDecoration(
                    color: isSelected
                        ? Theme.of(context).colorScheme.primary
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ],
            ),
          ),
        );
      },
      ),
    );
  }

  void _scrollToMenuSection(String sectionKey) {
    if (!mounted) return;
    
    final key = _menuSectionKeys[sectionKey];
    if (key == null) return;
    
    final context = key.currentContext;
    if (context == null) return;
    
    if (!context.mounted) return;
    
    if (!_menuScrollController.hasClients) return;
    
    _isScrollingToSection = true;
    if (mounted) {
      setState(() {
        _selectedMenuSection = sectionKey;
      });
    }
    
    // Calculate scroll position and use menu scroll controller directly
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !context.mounted) return;
      if (!_menuScrollController.hasClients) {
        if (mounted) {
          setState(() {
            _isScrollingToSection = false;
          });
        }
        return;
      }
      
      try {
        final RenderBox? renderBox = context.findRenderObject() as RenderBox?;
        if (renderBox == null || !renderBox.hasSize) {
          if (mounted) {
            setState(() {
              _isScrollingToSection = false;
            });
          }
          return;
        }
        
        // Get the position of the section in the scroll view's coordinate system
        final sectionPosition = renderBox.localToGlobal(Offset.zero);
        
        // Get the scroll view's render box
        final scrollViewContext = _menuScrollController.position.context.storageContext;
        
        final scrollViewBox = scrollViewContext.findRenderObject() as RenderBox?;
        if (scrollViewBox == null) {
          if (mounted) {
            setState(() {
              _isScrollingToSection = false;
            });
          }
          return;
        }
        
        final scrollViewPosition = scrollViewBox.localToGlobal(Offset.zero);
        final offset = sectionPosition.dy - scrollViewPosition.dy;
        
        // Scroll to position the section at the top (accounting for current scroll offset)
        final targetOffset = _menuScrollController.offset + offset;
        
        _menuScrollController.animateTo(
          targetOffset.clamp(0.0, _menuScrollController.position.maxScrollExtent),
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
        ).then((_) {
          Future.delayed(const Duration(milliseconds: 100), () {
            if (mounted) {
              setState(() {
                _isScrollingToSection = false;
              });
            }
          });
        }).catchError((error) {
          if (mounted) {
            setState(() {
              _isScrollingToSection = false;
            });
          }
        });
      } catch (e) {
        if (mounted) {
          setState(() {
            _isScrollingToSection = false;
          });
        }
      }
    });
  }

  List<Widget> _buildMenuSections(Map<String, dynamic> menuSections) {
    final widgets = <Widget>[];
    
    // Sort sections by their index (key)
    final sortedSectionKeys = menuSections.keys.toList()
      ..sort((a, b) {
        final aIndex = int.tryParse(a) ?? 999;
        final bIndex = int.tryParse(b) ?? 999;
        return aIndex.compareTo(bIndex);
      });
    
    for (final sectionKey in sortedSectionKeys) {
      final section = menuSections[sectionKey] as Map<String, dynamic>?;
      if (section == null) continue;
      
      final items = section['items'] as List<dynamic>?;
      if (items == null || items.isEmpty) continue; // Skip empty sections
      
      final sectionTitle = section['title'] as String?;
      
      // Add section title if present (with GlobalKey for scrolling)
      if (sectionTitle != null && sectionTitle.isNotEmpty) {
        // Store the section title for the tabs
        _menuSectionTitles[sectionKey] = sectionTitle;
        
        final sectionGlobalKey = _menuSectionKeys[sectionKey];
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 12),
            child: sectionGlobalKey != null
                ? Text(
                    sectionTitle,
                    key: sectionGlobalKey,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).textTheme.titleLarge?.color,
                    ),
                  )
                : Text(
                    sectionTitle,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).textTheme.titleLarge?.color,
                    ),
                  ),
          ),
        );
      }
      
      // Add menu items
      for (final itemData in items) {
        if (itemData is! Map<String, dynamic>) continue;
        
        final itemName = itemData['name'] as String? ?? '';
        if (itemName.isEmpty) continue;
        
        final itemDescription = itemData['description'] as String?;
        final itemImageUrl = itemData['imageUrl'] as String?;
        
        // Safely parse price - handle both String and num types
        num? itemPrice;
        final priceValue = itemData['price'];
        if (priceValue != null) {
          if (priceValue is num) {
            itemPrice = priceValue;
          } else if (priceValue is String) {
            // Try to parse string to number
            itemPrice = num.tryParse(priceValue);
          }
        }
        
        widgets.add(
          MenuItemCard(
            name: itemName,
            description: itemDescription,
            imageUrl: itemImageUrl,
            price: itemPrice,
          ),
        );
      }
    }
    
    return widgets;
  }

  Widget _buildEventsTab() {
    final activeExperienceIds = widget.venue.getActiveExperienceIds();
    
    
    if (activeExperienceIds.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'No active events',
            style: TextStyle(fontSize: 16, color: Colors.grey),
          ),
        ),
      );
    }

    // Combine experiences and instances streams into one
    return StreamBuilder<Map<String, dynamic>>(
      stream: _combineExperiencesAndInstancesStream(activeExperienceIds, 'event'),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Error loading events: ${snapshot.error}',
                style: const TextStyle(fontSize: 14, color: Colors.red),
                textAlign: TextAlign.center,
              ),
            ),
          );
        }

        final data = snapshot.data;
        if (data == null) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No active events',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
            ),
          );
        }

        final eventExperiences = data['experiences'] as List<ExperienceModel>;
        final instances = data['instances'] as List<ExperienceInstanceModel>;

        if (eventExperiences.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No active events',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
            ),
          );
        }

        if (instances.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No upcoming events',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
            ),
          );
        }

        // Create a map of experienceId -> ExperienceModel for quick lookup
        final experienceMap = {
          for (var exp in eventExperiences) exp.experienceId: exp
        };

            return ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: instances.length,
              itemBuilder: (context, index) {
                final instance = instances[index];
                final experience = experienceMap[instance.experienceId];
                return EventCardMini(
                  instance: instance,
                  experience: experience,
                  venue: widget.venue,
                  showVenueName: false, // Don't show venue name since we're in venue card
                );
              },
            );
      },
    );
  }

  Stream<Map<String, dynamic>> _combineExperiencesAndInstancesStream(
    List<String> activeExperienceIds,
    String type,
  ) {
    final controller = StreamController<Map<String, dynamic>>();
    StreamSubscription<List<ExperienceModel>>? experiencesSub;
    StreamSubscription<List<ExperienceInstanceModel>>? instancesSub;
    List<ExperienceModel>? currentExperiences;
    List<ExperienceInstanceModel>? currentInstances;

    void emitIfReady() {
      if (currentExperiences != null && currentInstances != null) {
        controller.add({
          'experiences': currentExperiences!,
          'instances': currentInstances!,
        });
      }
    }

    // Get experiences stream as broadcast to allow multiple listeners
    final experiencesStream = _firestoreService
        .getExperiencesByIdsStream(activeExperienceIds)
        .asBroadcastStream()
        .map((experiences) => experiences.where((e) => e.type == type).toList());

    experiencesSub = experiencesStream.listen(
      (experiences) {
        currentExperiences = experiences;
        final experienceIds = experiences.map((e) => e.experienceId).toList();

        // Cancel previous instances subscription if it exists
        instancesSub?.cancel();

        if (experienceIds.isEmpty) {
          currentInstances = [];
          emitIfReady();
        } else {
          // Get instances stream as broadcast
          final instancesStream = _firestoreService
              .getExperienceInstancesByExperienceIdsAndType(experienceIds, type)
              .asBroadcastStream();

          instancesSub = instancesStream.listen(
            (instances) {
              currentInstances = instances;
              emitIfReady();
            },
            onError: (error) {
              controller.addError(error);
            },
          );
        }
      },
      onError: (error) {
        controller.addError(error);
      },
    );

    // Clean up on cancel
    controller.onCancel = () {
      experiencesSub?.cancel();
      instancesSub?.cancel();
    };

    return controller.stream;
  }

  Widget _buildSpecialsTab() {
    final activeExperienceIds = widget.venue.getActiveExperienceIds();
    
    if (activeExperienceIds.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'No active specials',
            style: TextStyle(fontSize: 16, color: Colors.grey),
          ),
        ),
      );
    }

    // Combine experiences and instances streams into one
    return StreamBuilder<Map<String, dynamic>>(
      stream: _combineExperiencesAndInstancesStream(activeExperienceIds, 'special'),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Error loading specials: ${snapshot.error}',
                style: const TextStyle(fontSize: 14, color: Colors.red),
                textAlign: TextAlign.center,
              ),
            ),
          );
        }

        final data = snapshot.data;
        if (data == null) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No active specials',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
            ),
          );
        }

        final specialExperiences = data['experiences'] as List<ExperienceModel>;
        final instances = data['instances'] as List<ExperienceInstanceModel>;

        if (specialExperiences.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No active specials',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
            ),
          );
        }

        if (instances.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No upcoming specials',
                style: TextStyle(fontSize: 16, color: Colors.grey),
              ),
            ),
          );
        }

        // Create a map of experienceId -> ExperienceModel for quick lookup
        final experienceMap = {
          for (var exp in specialExperiences) exp.experienceId: exp
        };

        return ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: instances.length,
          itemBuilder: (context, index) {
            final instance = instances[index];
            final experience = experienceMap[instance.experienceId];
            return SpecialCardMini(
              instance: instance,
              experience: experience,
              venue: widget.venue,
              showVenueName: false, // Don't show venue name since we're in venue card
            );
          },
        );
      },
    );
  }
}

class _InteractOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _InteractOption({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: Theme.of(context).colorScheme.primary),
      title: Text(label),
      onTap: onTap,
    );
  }
}

class _InteractDrawerVibeOptions extends StatelessWidget {
  final String venueId;
  final FirestoreService firestoreService;
  final VoidCallback onTap;

  const _InteractDrawerVibeOptions({
    required this.venueId,
    required this.firestoreService,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) {
      return ListTile(
        leading: Icon(Icons.favorite_border, color: Theme.of(context).colorScheme.primary),
        title: const Text('Like it / Love it / Not my vibe'),
        subtitle: const Text('Sign in to save your vibe'),
      );
    }
    return StreamBuilder<VenuePreference>(
      stream: firestoreService.getVenuePreferenceStream(currentUser.uid, venueId),
      builder: (context, snapshot) {
        final preference = snapshot.data ?? VenuePreference.none;
        final primaryColor = Theme.of(context).colorScheme.primary;
        final mutedColor = Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey;
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: Icon(
                Icons.favorite,
                color: preference == VenuePreference.love ? Colors.red : mutedColor,
              ),
              title: const Text('Love it'),
              onTap: () async {
                final next = preference == VenuePreference.love ? VenuePreference.none : VenuePreference.love;
                await firestoreService.setVenuePreference(currentUser.uid, venueId, next);
                onTap();
              },
            ),
            ListTile(
              leading: Icon(
                Icons.thumb_up,
                color: preference == VenuePreference.like ? primaryColor : mutedColor,
              ),
              title: const Text('Like it'),
              onTap: () async {
                final next = preference == VenuePreference.like ? VenuePreference.none : VenuePreference.like;
                await firestoreService.setVenuePreference(currentUser.uid, venueId, next);
                onTap();
              },
            ),
            ListTile(
              leading: Icon(
                Icons.not_interested,
                color: preference == VenuePreference.notMyVibe
                    ? (Theme.of(context).brightness == Brightness.dark ? Colors.orange.shade200 : Colors.orange.shade700)
                    : mutedColor,
              ),
              title: const Text('Not my vibe'),
              onTap: () async {
                final next = preference == VenuePreference.notMyVibe ? VenuePreference.none : VenuePreference.notMyVibe;
                await firestoreService.setVenuePreference(currentUser.uid, venueId, next);
                onTap();
              },
            ),
          ],
        );
      },
    );
  }
}
