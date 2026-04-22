import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:geolocator/geolocator.dart';
import '../models/user_model.dart';
import '../models/list_model.dart';
import '../models/venue_model.dart';
import '../services/firestore_service.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import '../widgets/list_card.dart';
import '../widgets/venue_card_mini.dart';
import 'edit_profile_screen.dart';
import 'settings_screen.dart';
import 'create_list_screen.dart';
import 'onboarding_screen.dart';
import '../widgets/loki_button.dart';
import 'package:flutter/foundation.dart';

class ProfileScreen extends StatefulWidget {
  final String? userId;

  const ProfileScreen({super.key, this.userId});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final FirestoreService _firestoreService = FirestoreService();
  final AuthService _authService = AuthService();
  final LocationService _locationService = LocationService();
  String? _currentUserId;
  Position? _userPosition;

  @override
  void initState() {
    super.initState();
    _currentUserId = widget.userId ?? FirebaseAuth.instance.currentUser?.uid;
    _loadUserPosition();
  }

  Future<void> _loadUserPosition() async {
    final position = await _locationService.getCurrentLocation();
    if (mounted) {
      setState(() {
        _userPosition = position;
      });
    }
  }

  Future<void> _followUser(String followingId) async {
    final currentUserId = FirebaseAuth.instance.currentUser?.uid;
    if (currentUserId == null) return;

    try {
      await _firestoreService.followUser(currentUserId, followingId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Followed user')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _unfollowUser(String followingId) async {
    final currentUserId = FirebaseAuth.instance.currentUser?.uid;
    if (currentUserId == null) return;

    try {
      await _firestoreService.unfollowUser(currentUserId, followingId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Unfollowed user')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  void _shareProfile(UserModel user) {
    // TODO: Implement share functionality
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Share profile functionality coming soon')),
    );
  }

  void _editProfile(UserModel user) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => EditProfileScreen(user: user),
      ),
    );
  }

  void _openSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const SettingsScreen(),
      ),
    );
  }

  void _createList() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const CreateListScreen(),
      ),
    );
  }

  void _openOnboarding() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const OnboardingScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_currentUserId == null) {
      return const Scaffold(
        body: Center(child: Text('Please sign in to view profile')),
      );
    }

    final currentUser = FirebaseAuth.instance.currentUser;
    final isOwnProfile = _currentUserId == currentUser?.uid;

    return Scaffold(
      appBar: AppBar(
        leading: isOwnProfile
            ? null // No back button on own profile when accessed from bottom nav
            : IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () {
                  if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  } else {
                    // If can't pop, navigate to discovery screen
                    Navigator.of(context).pushReplacementNamed('/home');
                  }
                },
              ),
        title: StreamBuilder<UserModel?>(
          stream: _firestoreService.getUserStream(_currentUserId!),
          builder: (context, snapshot) {
            if (snapshot.hasData && snapshot.data != null) {
              return Text(snapshot.data!.username);
            }
            return const Text('Profile');
          },
        ),
        actions: isOwnProfile
            ? [
                IconButton(
                  icon: const Icon(Icons.settings),
                  onPressed: _openSettings,
                  tooltip: 'Settings',
                ),
                IconButton(
                  icon: const Icon(Icons.logout),
                  onPressed: () async {
                    await _authService.signOut();
                    // Navigation will be handled automatically by AuthWrapper
                  },
                  tooltip: 'Logout',
                ),
              ]
            : null,
      ),
      body: StreamBuilder<UserModel?>(
        stream: _firestoreService.getUserStream(_currentUserId!),
        builder: (context, userSnapshot) {
          if (userSnapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (userSnapshot.hasError) {
            return Center(child: Text('Error: ${userSnapshot.error}'));
          }

          final user = userSnapshot.data;
          if (user == null) {
            return const Center(child: Text('User not found'));
          }

          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Profile Header Section
                _buildProfileHeader(user, isOwnProfile),

                // Favorites Section (only for own profile)
                if (isOwnProfile && user.favoriteVenueIds.isNotEmpty)
                  _buildFavoritesSection(user),

                // Lists Section
                _buildListsSection(user, isOwnProfile),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildProfileHeader(UserModel user, bool isOwnProfile) {
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
                  child: user.profileImageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: user.profileImageUrl!,
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
                            child: const Icon(Icons.person, color: Colors.white),
                          ),
                        )
                      : Container(
                          color: Colors.grey[300],
                          child: const Icon(Icons.person, color: Colors.white),
                        ),
                ),
              ),
              const SizedBox(width: 16),
              
              // User Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.username,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Bio/About
                    if (user.about != null && user.about!.isNotEmpty)
                      Text(
                        user.about!,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[700],
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    const SizedBox(height: 12),
                    
                    // Stats Row
                    StreamBuilder<List<ListModel>>(
                      stream: _firestoreService.getUserLists(user.uid),
                      builder: (context, listsSnapshot) {
                        final listsCount = listsSnapshot.data?.length ?? 0;
                        return StreamBuilder<int>(
                          stream: _firestoreService.getFollowersCountStream(user.uid),
                          builder: (context, followersSnapshot) {
                            final followersCount =
                                followersSnapshot.data ?? user.followersCount;
                            return StreamBuilder<int>(
                              stream: _firestoreService.getFollowingCountStream(user.uid),
                              builder: (context, followingSnapshot) {
                                final followingCount =
                                    followingSnapshot.data ?? user.followingCount;
                                return Row(
                                  children: [
                                    _buildStat(_formatCount(listsCount), 'Lists'),
                                    const SizedBox(width: 16),
                                    _buildStat(_formatCount(followersCount), 'Followers'),
                                    const SizedBox(width: 16),
                                    _buildStat(_formatCount(followingCount), 'Following'),
                                  ],
                                );
                              },
                            );
                          },
                        );
                      },
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 16),
          
          // Action Buttons (LokiButton: shared style across app)
          Row(
            children: [
              if (isOwnProfile) ...[
                Expanded(
                  child: LokiButton(
                    onPressed: () => _editProfile(user),
                    label: 'Edit Profile',
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: LokiButton(
                    onPressed: _openOnboarding,
                    label: 'Preferences',
                  ),
                ),
              ] else ...[
                Expanded(
                  child: FutureBuilder<bool>(
                    future: FirebaseAuth.instance.currentUser?.uid != null
                        ? _firestoreService.isFollowing(
                            FirebaseAuth.instance.currentUser!.uid,
                            user.uid,
                          )
                        : Future.value(false),
                    builder: (context, snapshot) {
                      final isFollowing = snapshot.data ?? false;
                      return LokiButton(
                        onPressed: () {
                          if (isFollowing) {
                            _unfollowUser(user.uid);
                          } else {
                            _followUser(user.uid);
                          }
                        },
                        label: isFollowing ? 'Unfollow' : 'Follow',
                      );
                    },
                  ),
                ),
              ],
              const SizedBox(width: 8),
              Expanded(
                child: LokiButton(
                  onPressed: () => _shareProfile(user),
                  label: 'Share',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildListsSection(UserModel user, bool isOwnProfile) {
    return Padding(
      padding: const EdgeInsets.only(left: 16, right: 16, top: 4, bottom: 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Title and Create Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Lists',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (isOwnProfile)
                TextButton.icon(
                  onPressed: _createList,
                  style: TextButton.styleFrom(
                    foregroundColor: Theme.of(context).textTheme.bodyLarge?.color ?? Theme.of(context).colorScheme.onSurface,
                  ),
                  icon: Icon(
                    Icons.add,
                    size: 18,
                    color: Theme.of(context).textTheme.bodyLarge?.color ?? Theme.of(context).colorScheme.onSurface,
                  ),
                  label: Text(
                    'Create List',
                    style: TextStyle(
                      color: Theme.of(context).textTheme.bodyLarge?.color ?? Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Lists Stream
          StreamBuilder<List<ListModel>>(
            stream: _firestoreService.getUserLists(user.uid),
            builder: (context, listsSnapshot) {
              if (listsSnapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (listsSnapshot.hasError) {
                return Center(child: Text('Error: ${listsSnapshot.error}'));
              }

              final lists = listsSnapshot.data ?? [];

              if (lists.isEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: [
                        Icon(Icons.list, size: 64, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        Text(
                          isOwnProfile
                              ? 'You haven\'t created any lists yet'
                              : 'No lists yet',
                          style: TextStyle(
                            fontSize: 16,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }

              // Fetch venues for each list to build image collage
              return FutureBuilder<Map<String, List<VenueModel>>>(
                future: _fetchVenuesForLists(lists),
                builder: (context, venuesSnapshot) {
                  if (venuesSnapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final venuesMap = venuesSnapshot.data ?? {};

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: lists.length,
                    itemBuilder: (context, index) {
                      final list = lists[index];
                      final venues = venuesMap[list.listId] ?? [];
                      return ListCard(
                        list: list,
                        creator: user,
                        venues: venues,
                      );
                    },
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  Future<Map<String, List<VenueModel>>> _fetchVenuesForLists(
      List<ListModel> lists) async {
    final Map<String, List<VenueModel>> venuesMap = {};

    for (final list in lists) {
      final venues = <VenueModel>[];
      for (final venueId in list.venueIds) {
        final venue = await _firestoreService.getVenue(venueId);
        if (venue != null) {
          venues.add(venue);
        }
      }
      venuesMap[list.listId] = venues;
    }

    return venuesMap;
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

  Widget _buildFavoritesSection(UserModel user) {
    return Padding(
      padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Favorites',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          StreamBuilder<List<VenueModel>>(
            stream: _firestoreService.getVenuesByIdsStream(user.favoriteVenueIds),
            builder: (context, venuesSnapshot) {
              if (venuesSnapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final venues = venuesSnapshot.data ?? [];

              if (venues.isEmpty) {
                return const SizedBox.shrink();
              }

              return LayoutBuilder(
                builder: (context, constraints) {
                  final width = MediaQuery.of(context).size.width;
                  final useGrid = kIsWeb && width > 600;

                  if (useGrid) {
                    // Web / wide: responsive grid so cards sit side-by-side, no overflow
                    final crossAxisCount = width > 900 ? 3 : 2;
                    return GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        mainAxisSpacing: 16,
                        crossAxisSpacing: 16,
                        childAspectRatio: 0.78,
                      ),
                      itemCount: venues.length,
                      itemBuilder: (context, index) {
                        return VenueCardMini(
                          venue: venues[index],
                          userPosition: _userPosition,
                        );
                      },
                    );
                  }

                  // Mobile: horizontal list; venue card mini is 1:1 image + name row
                  final cardWidth = width * 0.45;
                  final cardHeight = cardWidth + 56; // 1:1 image + padding + one line name
                  return SizedBox(
                    height: cardHeight.clamp(220.0, 400.0),
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: venues.length,
                      itemBuilder: (context, index) {
                        final venue = venues[index];
                        return SizedBox(
                          width: cardWidth,
                          child: Padding(
                            padding: const EdgeInsets.only(right: 12),
                            child: VenueCardMini(
                              venue: venue,
                              userPosition: _userPosition,
                            ),
                          ),
                        );
                      },
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}
