import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:geolocator/geolocator.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:async';
import '../models/venue_model.dart';
import '../models/experience_instance_model.dart';
import '../utils/date_formatter.dart';
import '../services/location_service.dart';
import '../services/firestore_service.dart';
import '../services/cache_service.dart';
import '../models/venue_preference.dart';
import '../widgets/menu_item_card.dart';
import '../widgets/event_card_mini.dart';
import '../widgets/special_card.dart';
import '../models/experience_model.dart';

class VenueProfileScreen extends StatefulWidget {
  final VenueModel venue;
  final Position? userPosition;
  /// If set, open on this tab: 0=About, 1=Menu, 2=Events, 3=Specials.
  final int? initialTabIndex;

  const VenueProfileScreen({
    super.key,
    required this.venue,
    this.userPosition,
    this.initialTabIndex,
  });

  @override
  State<VenueProfileScreen> createState() => _VenueProfileScreenState();
}

class _VenueProfileScreenState extends State<VenueProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _currentImageIndex = 0;
  final FirestoreService _firestoreService = FirestoreService();
  bool _isOpeningHoursExpanded = false;
  
  // Cache computed values to avoid recalculating on every build
  String? _cachedDistance;
  String? _cachedClosingTime;
  
  // Track active events and specials for indicators
  int _activeEventsCount = 0;
  int _activeSpecialsCount = 0;
  
  // Track follow state
  bool? _isFollowing;
  
  
  @override
  void initState() {
    super.initState();
    final initialIndex = widget.initialTabIndex != null
        ? (widget.initialTabIndex!.clamp(0, 3))
        : 0;
    _tabController = TabController(length: 4, vsync: this, initialIndex: initialIndex);
    _computeCachedValues();
    _checkActiveEventsAndSpecials();
    _checkFollowStatus();
    
    // Cache the venue when profile screen loads
    // This ensures we don't need to query it again
    final cacheService = CacheService();
    cacheService.cacheVenue(widget.venue);
  }
  
  Future<void> _checkFollowStatus() async {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser != null) {
      final isFollowing = await _firestoreService.isFollowingVenue(
        currentUser.uid,
        widget.venue.venueId,
      );
      if (mounted) {
        setState(() {
          _isFollowing = isFollowing;
        });
      }
    }
  }
  
  Future<void> _toggleFollow() async {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to follow venues')),
      );
      return;
    }
    
    try {
      if (_isFollowing == true) {
        await _firestoreService.unfollowVenue(currentUser.uid, widget.venue.venueId);
        if (mounted) {
          setState(() {
            _isFollowing = false;
          });
        }
      } else {
        await _firestoreService.followVenue(currentUser.uid, widget.venue.venueId);
        if (mounted) {
          setState(() {
            _isFollowing = true;
          });
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error toggling follow: $e');
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
    }
  }
  
  void _checkActiveEventsAndSpecials() {
    // Check for active events
    _firestoreService.getExperienceInstancesByVenueIdAndType(widget.venue.venueId, 'event')
        .listen((instances) {
      if (mounted) {
        setState(() {
          _activeEventsCount = instances.length;
        });
      }
    });
    
    // Check for active specials
    _firestoreService.getExperienceInstancesByVenueIdAndType(widget.venue.venueId, 'special')
        .listen((instances) {
      if (mounted) {
        setState(() {
          _activeSpecialsCount = instances.length;
        });
      }
    });
  }
  
  @override
  void didUpdateWidget(VenueProfileScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Recompute if inputs changed
    if (oldWidget.venue != widget.venue || oldWidget.userPosition != widget.userPosition) {
      _computeCachedValues();
    }
  }
  
  void _computeCachedValues() {
    _cachedDistance = _computeDistance();
    _cachedClosingTime = _computeClosingTime();
  }


  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Profile Picture and Info Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Profile Picture
              Container(
                width: 120,
                height: 120,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                ),
                child: ClipOval(
                  child: widget.venue.imageUrls.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: widget.venue.imageUrls[0],
                          fit: BoxFit.cover,
                          width: 120,
                          height: 120,
                          placeholder: (context, url) => Container(
                            color: Colors.grey[300],
                            child: const Center(
                              child: CircularProgressIndicator(),
                            ),
                          ),
                          errorWidget: (context, url, error) => Container(
                            color: Colors.grey[300],
                            child: const Icon(Icons.business, color: Colors.white),
                          ),
                        )
                      : Container(
                          color: Colors.grey[300],
                          child: const Icon(Icons.business, color: Colors.white),
                        ),
                ),
              ),
              const SizedBox(width: 16),
              
              // Venue Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.venue.name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.venue.address,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[700],
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // Stats Row
                    Row(
                      children: [
                        StreamBuilder<int>(
                          stream: _firestoreService.getVenueFollowersCount(widget.venue.venueId),
                          builder: (context, snapshot) {
                            final count = snapshot.hasData ? snapshot.data! : widget.venue.followersCount;
                            return _buildStat(_formatCount(count), 'Followers');
                          },
                        ),
                        const SizedBox(width: 16),
                        StreamBuilder<List<ExperienceInstanceModel>>(
                          stream: _firestoreService.getExperienceInstancesByVenueIdAndType(
                            widget.venue.venueId,
                            'event',
                          ),
                          builder: (context, snapshot) {
                            final count = snapshot.hasData ? snapshot.data!.length : 0;
                            return _buildStat(count.toString(), 'Events');
                          },
                        ),
                        const SizedBox(width: 16),
                        StreamBuilder<List<ExperienceInstanceModel>>(
                          stream: _firestoreService.getExperienceInstancesByVenueIdAndType(
                            widget.venue.venueId,
                            'special',
                          ),
                          builder: (context, snapshot) {
                            final count = snapshot.hasData ? snapshot.data!.length : 0;
                            return _buildStat(count.toString(), 'Specials');
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Action Buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _toggleFollow,
                  icon: Icon(_isFollowing == true ? Icons.person_remove : Icons.add),
                  label: Text(_isFollowing == true ? 'Unfollow' : 'Follow'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    // TODO: Implement share functionality
                  },
                  icon: const Icon(Icons.share),
                  label: const Text('Share'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _openMaps,
                  icon: const Icon(Icons.navigation),
                  label: const Text('Navigate'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Love / Like / Not my vibe (Likes.MD) — rating on venue profile
          Builder(
            builder: (context) {
              final currentUser = FirebaseAuth.instance.currentUser;
              if (currentUser == null) return const SizedBox.shrink();
              return StreamBuilder<VenuePreference>(
                stream: _firestoreService.getVenuePreferenceStream(
                  currentUser.uid,
                  widget.venue.venueId,
                ),
                builder: (context, prefSnapshot) {
                  final preference = prefSnapshot.data ?? VenuePreference.none;
                  final primaryColor = Theme.of(context).colorScheme.primary;
                  final mutedColor = Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey;
                  return Row(
                    children: [
                      Text(
                        'Your vibe:',
                        style: TextStyle(
                          fontSize: 13,
                          color: mutedColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        tooltip: 'Love',
                        icon: Icon(
                          Icons.favorite,
                          size: 24,
                          color: preference == VenuePreference.love
                              ? Colors.red
                              : mutedColor,
                        ),
                        onPressed: () async {
                          final next = preference == VenuePreference.love
                              ? VenuePreference.none
                              : VenuePreference.love;
                          await _firestoreService.setVenuePreference(
                            currentUser.uid,
                            widget.venue.venueId,
                            next,
                          );
                        },
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                      ),
                      IconButton(
                        tooltip: 'Like',
                        icon: Icon(
                          Icons.thumb_up,
                          size: 22,
                          color: preference == VenuePreference.like
                              ? primaryColor
                              : mutedColor,
                        ),
                        onPressed: () async {
                          final next = preference == VenuePreference.like
                              ? VenuePreference.none
                              : VenuePreference.like;
                          await _firestoreService.setVenuePreference(
                            currentUser.uid,
                            widget.venue.venueId,
                            next,
                          );
                        },
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                      ),
                      IconButton(
                        tooltip: 'Not my vibe',
                        icon: Icon(
                          Icons.not_interested,
                          size: 22,
                          color: preference == VenuePreference.notMyVibe
                              ? (Theme.of(context).brightness == Brightness.dark
                                  ? Colors.orange.shade200
                                  : Colors.orange.shade700)
                              : mutedColor,
                        ),
                        onPressed: () async {
                          final next = preference == VenuePreference.notMyVibe
                              ? VenuePreference.none
                              : VenuePreference.notMyVibe;
                          await _firestoreService.setVenuePreference(
                            currentUser.uid,
                            widget.venue.venueId,
                            next,
                          );
                        },
                        padding: const EdgeInsets.all(4),
                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                      ),
                    ],
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  String _formatCount(int count) {
    if (count >= 1000) {
      return '${(count / 1000).toStringAsFixed(1)}k';
    }
    return count.toString();
  }

  Widget _buildStat(String value, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
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

  String _computeClosingTime() {
    if (widget.venue.openingHours == null) return 'closes N/A';
    
    final now = DateTime.now();
    final dayOfWeek = _getDayName(now.weekday);
    final dayHours = widget.venue.openingHours![dayOfWeek];
    
    if (dayHours == null) return 'closes N/A';
    
    String? closeTime;
    
    // Handle new array structure: dayHours is a List of time slots
    if (dayHours is List && dayHours.isNotEmpty) {
      final lastSlot = dayHours.last;
      if (lastSlot is Map) {
        closeTime = lastSlot['close'] as String?;
      }
    }
    
    // Handle legacy structure: dayHours is a Map with open/close directly
    if (closeTime == null && dayHours is Map) {
      closeTime = dayHours['close'] as String?;
    }
    
    if (closeTime == null) return 'closes N/A';
    
    // Format closing time: convert "01:00" to "closes at 1 am" or "13:30" to "closes at 1:30 pm"
    try {
      final parts = closeTime.split(':');
      if (parts.length == 2) {
        final hour = int.parse(parts[0]);
        final minute = int.parse(parts[1]);
        final period = hour >= 12 ? 'pm' : 'am';
        final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
        
        if (minute == 0) {
          return 'closes at $displayHour $period';
        } else {
          return 'closes at $displayHour:${minute.toString().padLeft(2, '0')} $period';
        }
      }
    } catch (e) {
      // If parsing fails, return as-is with "closes at" prefix
      return 'closes at $closeTime';
    }
    
    return 'closes at $closeTime';
  }

  String _getDayName(int weekday) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days[weekday - 1];
  }

  String _computeDistance() {
    if (widget.userPosition == null) return 'Distance unavailable';
    final locationService = LocationService();
    final distance = locationService.calculateDistance(
      widget.userPosition!.latitude,
      widget.userPosition!.longitude,
      widget.venue.location.latitude,
      widget.venue.location.longitude,
    );
    final formattedDistance = locationService.formatDistance(distance);
    return '$formattedDistance away';
  }


  Widget _buildVenueTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Opening Hours Section
          InkWell(
            onTap: () {
              setState(() {
                _isOpeningHoursExpanded = !_isOpeningHoursExpanded;
              });
            },
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Distance on the left
                    Row(
                      children: [
                        Icon(Icons.location_on, size: 18, color: Theme.of(context).textTheme.bodyLarge?.color),
                        const SizedBox(width: 4),
                        Text(
                          _cachedDistance ?? 'Distance unavailable',
                          style: TextStyle(
                            fontSize: 14,
                            color: Theme.of(context).textTheme.bodyLarge?.color,
                          ),
                        ),
                      ],
                    ),
                    // Closing time and expand icon on the right
                    Row(
                      children: [
                        Row(
                          children: [
                            Icon(Icons.access_time, size: 18, color: Theme.of(context).textTheme.bodyLarge?.color),
                            const SizedBox(width: 4),
                            Text(
                              _cachedClosingTime ?? 'closes N/A',
                              style: TextStyle(
                                fontSize: 14,
                                color: Theme.of(context).textTheme.bodyLarge?.color,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 8),
                        Icon(
                          _isOpeningHoursExpanded
                              ? Icons.expand_less
                              : Icons.expand_more,
                          color: Theme.of(context).textTheme.bodyLarge?.color,
                        ),
                      ],
                    ),
                  ],
                ),
                AnimatedCrossFade(
                  duration: const Duration(milliseconds: 300),
                  crossFadeState: _isOpeningHoursExpanded
                      ? CrossFadeState.showSecond
                      : CrossFadeState.showFirst,
                  firstChild: const SizedBox.shrink(),
                  secondChild: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 16),
                      if (widget.venue.openingHours != null)
                        ..._buildOpeningHoursList()
                      else
                        const Text('Opening hours not available'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Venue Images
          if (widget.venue.imageUrls.isNotEmpty) ...[
            const Text(
              'Venue Images',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            CarouselSlider.builder(
              itemCount: widget.venue.imageUrls.length,
              itemBuilder: (context, index, realIndex) {
                return ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CachedNetworkImage(
                    imageUrl: widget.venue.imageUrls[index],
                    fit: BoxFit.cover,
                    width: double.infinity,
                    height: 300,
                    placeholder: (context, url) => Container(
                      height: 300,
                      color: Colors.grey[300],
                      child: const Center(child: CircularProgressIndicator()),
                    ),
                    errorWidget: (context, url, error) => Container(
                      color: Theme.of(context).colorScheme.surface,
                      width: double.infinity,
                      height: 300,
                      child: Center(
                        child: CircularProgressIndicator(
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ),
                  ),
                );
              },
              options: CarouselOptions(
                height: 300,
                viewportFraction: 1.0,
                autoPlay: widget.venue.imageUrls.length > 1,
                onPageChanged: (index, reason) {
                  setState(() {
                    _currentImageIndex = index;
                  });
                },
              ),
            ),
            if (widget.venue.imageUrls.length > 1)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    widget.venue.imageUrls.length,
                    (index) => Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _currentImageIndex == index
                            ? Colors.blue
                            : Colors.grey[300],
                      ),
                    ),
                  ),
                ),
              ),
          ],
          
          const SizedBox(height: 24),
          
          // Introduction Section
          if (widget.venue.introduction != null && widget.venue.introduction!.isNotEmpty) ...[
            const Text(
              'Introduction',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              widget.venue.introduction!,
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).textTheme.bodySmall?.color,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
          ],
          
          // Design and Atmosphere Section
          if (widget.venue.designAndAtmosphere != null && widget.venue.designAndAtmosphere!.isNotEmpty) ...[
            const Text(
              'Design and Atmosphere',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              widget.venue.designAndAtmosphere!,
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).textTheme.bodySmall?.color,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
          ],
          
          
          // Menu Images Grid
          // Use venue imageUrls if foodImageUrls is empty
          if ((widget.venue.foodImageUrls.isNotEmpty ? widget.venue.foodImageUrls : widget.venue.imageUrls).isNotEmpty) ...[
            Builder(
              builder: (context) {
                final aboutMenuImages = widget.venue.foodImageUrls.isNotEmpty 
                    ? widget.venue.foodImageUrls 
                    : widget.venue.imageUrls;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Menu',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
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
                      itemCount: aboutMenuImages.length,
                      itemBuilder: (context, index) {
                        final imageUrl = aboutMenuImages[index];
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
                                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                                    child: const Center(
                                      child: Icon(Icons.image_not_supported_outlined, size: 48),
                                    ),
                                  ),
                                )
                              : Container(
                                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                                  child: const Center(
                                    child: Icon(Icons.image_not_supported_outlined, size: 48),
                                  ),
                                ),
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                  ],
                );
              },
            ),
          ],
          
          // Offerings and Menu Text
          if (widget.venue.offeringsAndMenu != null && widget.venue.offeringsAndMenu!.isNotEmpty) ...[
            const Text(
              'Offerings and Menu',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              widget.venue.offeringsAndMenu!,
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).textTheme.bodySmall?.color,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
          ],
          
          // Address Section
          const Text(
            'Address',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.location_on, size: 18, color: Theme.of(context).textTheme.bodySmall?.color),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.venue.address,
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).textTheme.bodySmall?.color,
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // Phone Number Section
          if (widget.venue.phone != null) ...[
            Row(
              children: [
                Icon(Icons.phone, size: 18, color: Theme.of(context).textTheme.bodySmall?.color),
                const SizedBox(width: 8),
                Text(
                  widget.venue.phone!,
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).textTheme.bodySmall?.color,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
          
          // Tags Section
          if (widget.venue.tags.isNotEmpty) ...[
            const Text(
              'Tags',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: widget.venue.tags.map((tag) {
                return Chip(
                  label: Text(
                    tag,
                    style: const TextStyle(fontSize: 12),
                  ),
                  backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  side: BorderSide(
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                  labelStyle: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w500,
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  List<Widget> _buildOpeningHoursList() {
    if (widget.venue.openingHours == null) return [];
    
    final days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    final dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    final List<Widget> widgets = [];
    
    for (int i = 0; i < days.length; i++) {
      final dayKey = days[i];
      final dayName = dayNames[i];
      final dayHours = widget.venue.openingHours![dayKey];
      
      String hoursText = 'CLOSED';
      if (dayHours != null) {
        // Handle new array structure: dayHours is a List of time slots
        if (dayHours is List) {
          final timeSlots = <String>[];
          for (var slot in dayHours) {
            if (slot is Map) {
              final open = slot['open'] as String?;
              final close = slot['close'] as String?;
              if (open != null && close != null) {
                timeSlots.add('$open - $close');
              }
            }
          }
          if (timeSlots.isNotEmpty) {
            hoursText = timeSlots.join(', ');
          }
        } 
        // Handle legacy structure: dayHours is a Map with open/close directly
        else if (dayHours is Map) {
          final open = dayHours['open'] as String?;
          final close = dayHours['close'] as String?;
          if (open != null && close != null) {
            hoursText = '$open - $close';
          }
        } else if (dayHours is String) {
          hoursText = dayHours;
        }
      }
      
      widgets.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                dayName,
                style: const TextStyle(fontSize: 14),
              ),
              Text(
                hoursText,
                style: TextStyle(
                  fontSize: 14,
                  color: hoursText == 'CLOSED' ? Colors.grey[400] : Colors.grey[700],
                  fontWeight: hoursText == 'CLOSED' ? FontWeight.w500 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      );
    }
    
    return widgets;
  }

  Widget _buildMenuTab() {
    final menuSections = widget.venue.menuSections;
    final hasMenuItems = menuSections != null && menuSections.isNotEmpty;
    
    // Use venue imageUrls if foodImageUrls is empty
    final imagesToUse = widget.venue.foodImageUrls.isNotEmpty 
        ? widget.venue.foodImageUrls 
        : widget.venue.imageUrls;
    
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (hasMenuItems) ...[
            // Display menu items by section
            ..._buildMenuSections(menuSections),
          ] else if (imagesToUse.isNotEmpty) ...[
            // Fallback to venue images if no menu items
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
          ] else ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text(
                  'No menu available',
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                ),
              ),
            ),
          ],
        ],
      ),
    );
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
      
      // Add section title if present
      if (sectionTitle != null && sectionTitle.isNotEmpty) {
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 16, bottom: 12),
            child: Text(
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
            if (itemPrice == null && kDebugMode) {
              print('Warning: Could not parse price "$priceValue" as number for menu item "$itemName"');
            }
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
    
    // Use the same approach as venue_card: filter experiences by type first, then query instances
    // This is more efficient than querying all instances and filtering in memory
    return StreamBuilder<Map<String, dynamic>>(
      stream: _combineExperiencesAndInstancesStream(activeExperienceIds, 'event'),
      builder: (context, snapshot) {
        if (kDebugMode) {
          debugPrint('VenueProfileScreen EventsTab StreamBuilder: connectionState=${snapshot.connectionState}, hasData=${snapshot.hasData}, dataLength=${snapshot.data?.length ?? "null"}');
          if (snapshot.hasData) {
            debugPrint('VenueProfileScreen EventsTab: snapshot.data = ${snapshot.data}');
          }
        }
        
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, color: Colors.red, size: 48),
                  const SizedBox(height: 16),
                  const Text(
                    'Error loading events',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${snapshot.error}',
                    style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Querying: experienceInstances collection\n'
                    'venueId=${widget.venue.venueId}, type="event"',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }

        if (!snapshot.hasData) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.event_busy, color: Colors.grey, size: 48),
                  const SizedBox(height: 16),
                  const Text(
                    'No events scheduled',
                    style: TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Querying: experienceInstances collection\n'
                    'venueId=${widget.venue.venueId}, type="event"',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    textAlign: TextAlign.center,
                  ),
                ],
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

        // Cache experiences to reduce future queries
        final cacheService = CacheService();
        cacheService.cacheExperiences(eventExperiences);

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
        // Use cached experiences from the stream instead of making individual queries
        final experienceMap = {
          for (var exp in eventExperiences) exp.experienceId: exp
        };

        final now = DateTime.now();
        final today = DateTime(now.year, now.month, now.day);

        // Separate instances into "On Tonight" (live or starting today) and "Coming Up"
        final onTonight = <ExperienceInstanceModel>[];
        final comingUp = <ExperienceInstanceModel>[];

        for (var instance in instances) {
          final startDate = instance.startAt.toDate();
          final startDay = DateTime(startDate.year, startDate.month, startDate.day);
          
          if (instance.isLiveNow || (startDay == today && startDate.isAfter(now))) {
            onTonight.add(instance);
          } else if (instance.isUpcoming) {
            comingUp.add(instance);
          }
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // On Tonight Section
              if (onTonight.isNotEmpty) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'On Tonight',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (onTonight.isNotEmpty)
                      Row(
                        children: [
                          Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                          const SizedBox(width: 4),
                          Text(
                            'Starts at ${DateFormatter.formatTime(onTonight.first.startAt.toDate())}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                if (onTonight.any((i) => i.isLiveNow))
                  Container(
                    margin: const EdgeInsets.only(top: 8, bottom: 16),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.green[100],
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'ON NOW',
                      style: TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                // Use cached experiences from experienceMap instead of individual queries
                ...onTonight.map((instance) {
                  final experience = experienceMap[instance.experienceId];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: instance.type == 'special'
                        ? SpecialCard(
                            instance: instance,
                            experience: experience,
                            venue: widget.venue,
                            userPosition: widget.userPosition,
                          )
                        : EventCardMini(
                            instance: instance,
                            experience: experience,
                            venue: widget.venue,
                            showVenueName: false,
                          ),
                  );
                }),
                const SizedBox(height: 24),
              ],

              // Coming Up Section
              if (comingUp.isNotEmpty) ...[
                const Text(
                  'Coming Up',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                // Use cached experiences from experienceMap instead of individual queries
                ...comingUp.map((instance) {
                  final experience = experienceMap[instance.experienceId];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: instance.type == 'special'
                        ? SpecialCard(
                            instance: instance,
                            experience: experience,
                            venue: widget.venue,
                            userPosition: widget.userPosition,
                          )
                        : EventCardMini(
                            instance: instance,
                            experience: experience,
                            venue: widget.venue,
                            showVenueName: false,
                          ),
                  );
                }),
              ],

              if (onTonight.isEmpty && comingUp.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Text(
                      'No upcoming events',
                      style: TextStyle(fontSize: 16, color: Colors.grey),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  // Combine experiences and instances streams - EXACT copy of venue_card approach
  // But use broadcast to handle tab switching
  Stream<Map<String, dynamic>> _combineExperiencesAndInstancesStream(
    List<String> activeExperienceIds,
    String type,
  ) {
    final controller = StreamController<Map<String, dynamic>>.broadcast();
    StreamSubscription<List<ExperienceModel>>? experiencesSub;
    StreamSubscription<List<ExperienceInstanceModel>>? instancesSub;
    List<ExperienceModel>? currentExperiences;
    List<ExperienceInstanceModel>? currentInstances;

    void emitIfReady() {
      if (kDebugMode) {
        debugPrint('VenueProfileScreen emitIfReady: currentExperiences=${currentExperiences?.length ?? "null"}, currentInstances=${currentInstances?.length ?? "null"}, controller.isClosed=${controller.isClosed}');
      }
      
      if (controller.isClosed) {
        if (kDebugMode) {
          debugPrint('VenueProfileScreen emitIfReady: Controller is closed, cannot emit');
        }
        return;
      }
      
      if (currentExperiences != null && currentInstances != null) {
        if (kDebugMode) {
          debugPrint('VenueProfileScreen emitIfReady: Emitting both - experiences=${currentExperiences!.length}, instances=${currentInstances!.length}');
        }
        controller.add({
          'experiences': currentExperiences!,
          'instances': currentInstances!,
        });
        if (kDebugMode) {
          debugPrint('VenueProfileScreen emitIfReady: Data added to controller, hasListener=${controller.hasListener}');
        }
      } else if (currentInstances != null && currentExperiences == null) {
        // Emit instances immediately if we have them, even without experiences
        // This prevents infinite loading
        if (kDebugMode) {
          debugPrint('VenueProfileScreen emitIfReady: Emitting instances only - instances=${currentInstances!.length}, experiences not loaded yet');
        }
        controller.add({
          'experiences': <ExperienceModel>[],
          'instances': currentInstances!,
        });
        if (kDebugMode) {
          debugPrint('VenueProfileScreen emitIfReady: Data added to controller, hasListener=${controller.hasListener}');
        }
      } else if (kDebugMode) {
        debugPrint('VenueProfileScreen emitIfReady: Not ready - waiting for data');
      }
    }

    // Get experiences stream as broadcast to allow multiple listeners
    final experiencesStream = _firestoreService
        .getExperiencesByIdsStream(activeExperienceIds)
        .asBroadcastStream()
        .map((experiences) => experiences.where((e) => e.type == type).toList());

    experiencesSub = experiencesStream.listen(
      (experiences) {
        if (kDebugMode) {
          print('--- Experiences fetched ---');
          print('Type filter: $type');
          print('Experiences found: ${experiences.length}');
          for (var exp in experiences) {
            print('  - ID: ${exp.experienceId}, Type: ${exp.type}, Title: ${exp.title}');
          }
        }
        
        currentExperiences = experiences;
        final experienceIds = experiences.map((e) => e.experienceId).toList();

        // Cancel previous instances subscription if it exists
        instancesSub?.cancel();

        if (experienceIds.isEmpty) {
          if (kDebugMode) {
            print('No experience IDs after filtering, setting empty instances');
          }
          currentInstances = [];
          emitIfReady();
        } else {
          if (kDebugMode) {
            print('--- Fetching instances ---');
            print('Experience IDs to query: $experienceIds');
          }
          
          // Get instances stream as broadcast
          final instancesStream = _firestoreService
              .getExperienceInstancesByExperienceIdsAndType(experienceIds, type)
              .asBroadcastStream();

          instancesSub = instancesStream.listen(
            (instances) {
              if (kDebugMode) {
                print('VenueProfileScreen _combineExperiencesAndInstancesStream: --- Instances fetched ---');
                print('Instances found: ${instances.length}');
                for (var inst in instances) {
                  print('  - Instance ID: ${inst.instanceId}, Experience ID: ${inst.experienceId}, Title: ${inst.title}, Start: ${inst.startAt.toDate()}, End: ${inst.endAt.toDate()}');
                }
              }
              
              currentInstances = instances;
              if (kDebugMode) {
                debugPrint('VenueProfileScreen _combineExperiencesAndInstancesStream: Setting currentInstances=${instances.length}, calling emitIfReady()');
              }
              emitIfReady();
            },
            onError: (error) {
              if (kDebugMode) {
                print('ERROR fetching instances: $error');
              }
              controller.addError(error);
            },
          );
        }
      },
      onError: (error) {
        if (kDebugMode) {
          print('ERROR fetching experiences: $error');
        }
        controller.addError(error);
      },
    );

    // Clean up on cancel
    controller.onCancel = () {
      experiencesSub?.cancel();
      instancesSub?.cancel();
    };

    // When StreamBuilder subscribes, emit current data if available
    controller.onListen = () {
      if (!controller.isClosed) {
        // If we already have data, emit it immediately
        if (currentExperiences != null && currentInstances != null) {
          if (kDebugMode) {
            debugPrint('VenueProfileScreen onListen: Emitting existing data - experiences=${currentExperiences!.length}, instances=${currentInstances!.length}');
          }
          controller.add({
            'experiences': currentExperiences!,
            'instances': currentInstances!,
          });
        } else if (currentInstances != null) {
          if (kDebugMode) {
            debugPrint('VenueProfileScreen onListen: Emitting existing instances - instances=${currentInstances!.length}');
          }
          controller.add({
            'experiences': <ExperienceModel>[],
            'instances': currentInstances!,
          });
        }
      }
    };

    return controller.stream;
  }

  Widget _buildSpecialsTab() {
    final activeExperienceIds = widget.venue.getActiveExperienceIds();
    
    // Use the same approach as venue_card: filter experiences by type first, then query instances
    // This is more efficient than querying all instances and filtering in memory
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
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error, color: Colors.red, size: 48),
                  const SizedBox(height: 16),
                  const Text(
                    'Error loading specials',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${snapshot.error}',
                    style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Querying: experienceInstances collection\n'
                    'venueId=${widget.venue.venueId}, type="special"',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    textAlign: TextAlign.center,
                  ),
                ],
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
        final specials = data['instances'] as List<ExperienceInstanceModel>;

        // Cache experiences to reduce future queries
        final cacheService = CacheService();
        cacheService.cacheExperiences(specialExperiences);

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

        if (specials.isEmpty) {
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

        // Create experience map from the stream data
        // Use cached experiences instead of making individual queries
        final experienceMap = {
          for (var exp in specialExperiences) exp.experienceId: exp
        };

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Specials',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              // Use cached experiences from experienceMap
              ...specials.map((special) {
                final experience = experienceMap[special.experienceId];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: SpecialCard(
                    instance: special,
                    experience: experience,
                    venue: widget.venue,
                    userPosition: widget.userPosition,
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text('${widget.venue.name} - Venue'),
      ),
      body: Column(
        children: [
          // Header Section
          _buildHeader(),
          
          // Tabs
          AnimatedBuilder(
            animation: _tabController,
            builder: (context, child) {
              return TabBar(
                controller: _tabController,
                labelColor: Colors.black,
                unselectedLabelColor: const Color(0xFF666666),
                labelStyle: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
                unselectedLabelStyle: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF666666),
                ),
                indicatorColor: const Color(0xFF7C3AED),
                indicatorWeight: 3,
                tabs: [
                  const Tab(text: 'About'),
                  const Tab(text: 'Menu'),
                  _buildTabWithIndicator('Events', _activeEventsCount, 2),
                  _buildTabWithIndicator('Specials', _activeSpecialsCount, 3),
                ],
              );
            },
          ),
          
          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildVenueTab(),
                _buildMenuTab(),
                _buildEventsTab(),
                _buildSpecialsTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
