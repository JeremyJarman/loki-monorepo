import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/venue_model.dart';
import '../models/venue_preference.dart';
import '../models/experience_model.dart';
import '../models/experience_instance_model.dart';
import '../screens/venue_profile_screen.dart';
import '../screens/save_to_screen.dart';
import '../theme/app_colors.dart';
import '../services/location_service.dart';
import '../services/firestore_service.dart';
import '../utils/opening_hours_helper.dart';
import 'special_card_mini.dart';
import 'menu_item_card.dart';

/// Display card for venues: image gallery (venue/food toggle) in one rounded frame,
/// gap, then text frame with distance, open status, tags, and expandable Menu/Specials.
class VenueDisplayCard extends StatefulWidget {
  final VenueModel venue;
  final Position? userPosition;
  /// When non-empty, only tags matching this search are shown.
  final String searchQuery;

  const VenueDisplayCard({
    super.key,
    required this.venue,
    this.userPosition,
    this.searchQuery = '',
  });

  @override
  State<VenueDisplayCard> createState() => _VenueDisplayCardState();
}

class _VenueDisplayCardState extends State<VenueDisplayCard> {
  final LocationService _locationService = LocationService();
  final FirestoreService _firestoreService = FirestoreService();
  int _currentImageIndex = 0;
  bool _showVenueGallery = true; // true = venue images, false = food images
  bool _menuExpanded = false;
  bool _specialsExpanded = false;

  String? _cachedDistance;

  /// Tags that match the current search query (or all tags if search is empty).
  List<String> get _filteredTags {
    final q = widget.searchQuery.trim().toLowerCase();
    if (q.isEmpty) return widget.venue.tags;
    return widget.venue.tags
        .where((tag) => tag.toLowerCase().contains(q) || q.contains(tag.toLowerCase()))
        .toList();
  }

  @override
  void initState() {
    super.initState();
    _cachedDistance = _computeDistance();
  }

  @override
  void didUpdateWidget(VenueDisplayCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.venue != widget.venue || oldWidget.userPosition != widget.userPosition) {
      _cachedDistance = _computeDistance();
    }
  }

  String _computeDistance() {
    if (widget.userPosition == null) return 'Distance unavailable';
    final distance = _locationService.calculateDistance(
      widget.userPosition!.latitude,
      widget.userPosition!.longitude,
      widget.venue.location.latitude,
      widget.venue.location.longitude,
    );
    return _locationService.formatDistance(distance);
  }

  List<String> get _venueImages => widget.venue.imageUrls;
  List<String> get _foodImages =>
      widget.venue.foodImageUrls.isNotEmpty
          ? widget.venue.foodImageUrls
          : widget.venue.imageUrls;

  List<String> get _currentGallery =>
      _showVenueGallery ? _venueImages : _foodImages;

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

  @override
  Widget build(BuildContext context) {
    const double cornerRadius = 12;
    const double imageInset = 10;
    const double imageRadius = 10;
    final theme = Theme.of(context);
    final openStatus = OpeningHoursHelper.getCurrentStatus(widget.venue.openingHours);
    final distanceText = _cachedDistance != null && _cachedDistance != 'Distance unavailable'
        ? _cachedDistance!
        : '—';

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: Colors.white,
        elevation: 4,
        shadowColor: Colors.black.withOpacity(0.25),
        borderRadius: BorderRadius.circular(cornerRadius),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Inset image with white border, rounded top and bottom
            Padding(
              padding: const EdgeInsets.all(imageInset),
              child: InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => VenueProfileScreen(
                        venue: widget.venue,
                        userPosition: widget.userPosition,
                      ),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(imageRadius),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(imageRadius),
                  child: AspectRatio(
                    aspectRatio: 4 / 3,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        _buildImageCarousel(),
                        Positioned(
                          left: 0,
                          right: 0,
                          bottom: 0,
                          child: Container(
                            height: 80,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.transparent,
                                  Colors.black.withOpacity(0.7),
                                ],
                              ),
                            ),
                          ),
                        ),
                        if (_currentGallery.length > 1)
                          Positioned(
                            bottom: 52,
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
                                  _currentGallery.length,
                                  (index) => Container(
                                    width: 6,
                                    height: 6,
                                    margin: const EdgeInsets.symmetric(horizontal: 2),
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: index == _currentImageIndex
                                          ? Colors.white
                                          : Colors.white.withOpacity(0.5),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        Positioned(
                          left: 0,
                          right: 0,
                          bottom: 0,
                          child: Padding(
                            padding: const EdgeInsets.fromLTRB(12, 24, 12, 12),
                            child: Text(
                              widget.venue.name,
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                shadows: const [
                                  Shadow(
                                    offset: Offset(1, 1),
                                    blurRadius: 3,
                                    color: Colors.black54,
                                  ),
                                ],
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                        // Bottom right: single toggle button (shows opposite label)
                        Positioned(
                          bottom: 12,
                          right: 12,
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () {
                                setState(() {
                                  _showVenueGallery = !_showVenueGallery;
                                  _currentImageIndex = 0;
                                });
                              },
                              borderRadius: BorderRadius.circular(20),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.95),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: Colors.white.withOpacity(0.8),
                                    width: 1,
                                  ),
                                ),
                                child: Text(
                                  _showVenueGallery ? 'Food' : 'Venue',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.black87,
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
              ),
            ),
            // Content: stats row (distance | likes | open | three-dot), tags, divider, Menu/Specials
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Row: distance | heart + count | open status | three-dot
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.location_on_outlined, size: 18, color: Colors.black),
                          const SizedBox(width: 4),
                          Text(
                            distanceText,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Colors.black,
                              fontWeight: FontWeight.w500,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.favorite_border, size: 18, color: Colors.black),
                          const SizedBox(width: 4),
                          Text(
                            '${widget.venue.followersCount}',
                            style: const TextStyle(
                              fontSize: 14,
                              color: Colors.black,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      Flexible(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Icon(Icons.access_time_outlined, size: 18, color: Colors.black),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                openStatus,
                                style: const TextStyle(
                                  fontSize: 14,
                                  color: Colors.black,
                                  fontWeight: FontWeight.w500,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Material(
                        color: Colors.transparent,
                        child: IconButton(
                          icon: Icon(Icons.more_vert, size: 20, color: Colors.black),
                          onPressed: () => _showInteractDrawer(context),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        ),
                      ),
                    ],
                  ),
                  if (_filteredTags.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: _filteredTags.map((tag) {
                        return Chip(
                          label: Text(tag, style: const TextStyle(fontSize: 12)),
                          backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                          side: BorderSide(
                            color: theme.colorScheme.primary.withOpacity(0.3),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          labelStyle: TextStyle(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.w500,
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                  const SizedBox(height: 12),
                  // Light grey divider, not full width
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Divider(height: 1, color: Colors.grey.shade300, thickness: 1),
                  ),
                  const SizedBox(height: 12),
                  // Menu and Specials buttons
                  Row(
                    children: [
                      Expanded(
                        child: _SectionButton(
                          label: 'Menu',
                          isExpanded: _menuExpanded,
                          onTap: () {
                            setState(() {
                              _menuExpanded = !_menuExpanded;
                              if (_menuExpanded) _specialsExpanded = false;
                            });
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _SectionButton(
                          label: 'Specials',
                          isExpanded: _specialsExpanded,
                          onTap: () {
                            setState(() {
                              _specialsExpanded = !_specialsExpanded;
                              if (_specialsExpanded) _menuExpanded = false;
                            });
                          },
                        ),
                      ),
                    ],
                  ),
                  if (_menuExpanded) ...[
                    const SizedBox(height: 12),
                    _buildMenuContent(),
                  ],
                  if (_specialsExpanded) ...[
                    const SizedBox(height: 12),
                    _buildSpecialsContent(),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageCarousel() {
    final images = _currentGallery;
    if (images.isEmpty) {
      return Container(
        color: Theme.of(context).colorScheme.surface,
        child: Center(
          child: Icon(
            Icons.image_not_supported_outlined,
            size: 48,
            color: Theme.of(context).textTheme.bodySmall?.color,
          ),
        ),
      );
    }
    return PageView.builder(
      itemCount: images.length,
      onPageChanged: (index) {
        setState(() {
          _currentImageIndex = index;
        });
      },
      itemBuilder: (context, index) {
        final imageUrl = images[index];
        if (imageUrl.isEmpty) {
          return Container(
            color: Theme.of(context).colorScheme.surface,
            child: const Center(child: CircularProgressIndicator()),
          );
        }
        return CachedNetworkImage(
          imageUrl: imageUrl,
          fit: BoxFit.cover,
          placeholder: (context, url) => Container(
            color: Theme.of(context).colorScheme.surface,
            child: const Center(child: CircularProgressIndicator()),
          ),
          errorWidget: (context, url, error) => Container(
            color: Theme.of(context).colorScheme.surface,
            child: Center(
              child: Icon(
                Icons.broken_image_outlined,
                size: 48,
                color: Theme.of(context).textTheme.bodySmall?.color,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildMenuContent() {
    final menuSections = widget.venue.menuSections;
    final hasMenuItems = menuSections != null && menuSections.isNotEmpty;

    if (!hasMenuItems) {
      final imagesToUse = widget.venue.foodImageUrls.isNotEmpty
          ? widget.venue.foodImageUrls
          : widget.venue.imageUrls;
      if (imagesToUse.isEmpty) {
        return const Padding(
          padding: EdgeInsets.symmetric(vertical: 16),
          child: Text(
            'No menu available',
            style: TextStyle(fontSize: 14, color: Colors.grey),
          ),
        );
      }
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Menu',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).textTheme.titleLarge?.color,
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 120,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: imagesToUse.length,
              itemBuilder: (context, index) {
                final imageUrl = imagesToUse[index];
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: SizedBox(
                      width: 120,
                      child: imageUrl.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: imageUrl,
                              fit: BoxFit.cover,
                              placeholder: (_, __) => Container(color: Colors.grey[300]),
                              errorWidget: (_, __, ___) => Container(color: Colors.grey[300]),
                            )
                          : Container(color: Colors.grey[300]),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      );
    }

    final sortedKeys = menuSections.keys.toList()
      ..sort((a, b) {
        final aIndex = int.tryParse(a) ?? 999;
        final bIndex = int.tryParse(b) ?? 999;
        return aIndex.compareTo(bIndex);
      });

    final widgets = <Widget>[];
    for (final sectionKey in sortedKeys) {
      final section = menuSections[sectionKey] as Map<String, dynamic>?;
      if (section == null) continue;
      final items = section['items'] as List<dynamic>?;
      if (items == null || items.isEmpty) continue;
      final sectionTitle = section['title'] as String?;
      if (sectionTitle != null && sectionTitle.isNotEmpty) {
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 6),
            child: Text(
              sectionTitle,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).textTheme.titleLarge?.color,
              ),
            ),
          ),
        );
      }
      for (final itemData in items) {
        if (itemData is! Map<String, dynamic>) continue;
        final itemName = itemData['name'] as String? ?? '';
        if (itemName.isEmpty) continue;
        final itemDescription = itemData['description'] as String?;
        final itemImageUrl = itemData['imageUrl'] as String?;
        num? itemPrice;
        final priceValue = itemData['price'];
        if (priceValue != null) {
          if (priceValue is num) {
            itemPrice = priceValue;
          } else if (priceValue is String) {
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

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: widgets,
    );
  }

  Stream<Map<String, dynamic>> _specialsStream() {
    final activeIds = widget.venue.getActiveExperienceIds();
    final controller = StreamController<Map<String, dynamic>>();
    StreamSubscription<List<ExperienceModel>>? expSub;
    StreamSubscription<List<ExperienceInstanceModel>>? instSub;
    List<ExperienceModel>? experiences;
    List<ExperienceInstanceModel>? instances;

    void emit() {
      if (experiences != null && instances != null) {
        controller.add({'experiences': experiences!, 'instances': instances!});
      }
    }

    if (activeIds.isEmpty) {
      controller.add({'experiences': <ExperienceModel>[], 'instances': <ExperienceInstanceModel>[]});
      return controller.stream;
    }

    expSub = _firestoreService
        .getExperiencesByIdsStream(activeIds)
        .asBroadcastStream()
        .map((list) => list.where((e) => e.type == 'special').toList())
        .listen(
          (list) {
            experiences = list;
            final ids = list.map((e) => e.experienceId).toList();
            instSub?.cancel();
            if (ids.isEmpty) {
              instances = [];
              emit();
            } else {
              instSub = _firestoreService
                  .getExperienceInstancesByExperienceIdsAndType(ids, 'special')
                  .asBroadcastStream()
                  .listen(
                    (instList) {
                      instances = instList;
                      emit();
                    },
                    onError: controller.addError,
                  );
            }
          },
          onError: controller.addError,
        );

    controller.onCancel = () {
      expSub?.cancel();
      instSub?.cancel();
    };
    return controller.stream;
  }

  Widget _buildSpecialsContent() {
    final activeIds = widget.venue.getActiveExperienceIds();
    if (activeIds.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Text(
          'No active specials',
          style: TextStyle(fontSize: 14, color: Colors.grey),
        ),
      );
    }

    return StreamBuilder<Map<String, dynamic>>(
      stream: _specialsStream(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            )),
          );
        }
        if (snapshot.hasError) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'Error loading specials',
              style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.error),
            ),
          );
        }
        final data = snapshot.data;
        if (data == null) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text('No specials', style: TextStyle(fontSize: 14, color: Colors.grey)),
          );
        }
        final experiences = data['experiences'] as List<ExperienceModel>;
        final instances = data['instances'] as List<ExperienceInstanceModel>;
        if (instances.isEmpty) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'No upcoming specials',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
          );
        }
        final expMap = {for (var e in experiences) e.experienceId: e};
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: instances.map((instance) {
            final experience = expMap[instance.experienceId];
            return SpecialCardMini(
              instance: instance,
              experience: experience,
              venue: widget.venue,
              userPosition: widget.userPosition,
              showVenueName: false,
            );
          }).toList(),
        );
      },
    );
  }
}

class _SectionButton extends StatelessWidget {
  final String label;
  final bool isExpanded;
  final VoidCallback onTap;

  const _SectionButton({
    required this.label,
    required this.isExpanded,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.primary.withOpacity(0.12),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                isExpanded ? Icons.expand_less : Icons.expand_more,
                size: 20,
                color: theme.colorScheme.primary,
              ),
            ],
          ),
        ),
      ),
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
