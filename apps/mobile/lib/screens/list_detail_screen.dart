import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:geolocator/geolocator.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/list_model.dart';
import '../models/venue_model.dart';
import '../models/user_model.dart';
import '../services/firestore_service.dart';
import '../services/location_service.dart';
import '../widgets/venue_card_mini.dart';
import '../widgets/loki_button.dart';

class ListDetailScreen extends StatefulWidget {
  final String listId;

  const ListDetailScreen({
    super.key,
    required this.listId,
  });

  @override
  State<ListDetailScreen> createState() => _ListDetailScreenState();
}

class _ListDetailScreenState extends State<ListDetailScreen> {
  final FirestoreService _firestoreService = FirestoreService();
  final LocationService _locationService = LocationService();
  Position? _userPosition;
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  bool _isEditing = false;

  @override
  void initState() {
    super.initState();
    _loadUserPosition();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadUserPosition() async {
    final position = await _locationService.getCurrentLocation();
    if (mounted) {
      setState(() {
        _userPosition = position;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;

    return Scaffold(
      body: StreamBuilder<ListModel?>(
        stream: _firestoreService.getListStream(widget.listId),
        builder: (context, listSnapshot) {
          if (listSnapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (listSnapshot.hasError || !listSnapshot.hasData) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    'List not found',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Go Back'),
                  ),
                ],
              ),
            );
          }

          final list = listSnapshot.data!;
          final isOwner = currentUser?.uid == list.userId;

          return CustomScrollView(
            slivers: [
              // App Bar
              SliverAppBar(
                pinned: true,
                leading: IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => Navigator.of(context).pop(),
                ),
                title: Text(
                  list.name,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                actions: isOwner
                    ? [
                        PopupMenuButton<String>(
                          icon: const Icon(Icons.more_vert),
                          onSelected: (value) {
                            if (value == 'delete') {
                              _showDeleteConfirmation(context, list);
                            } else if (value == 'privacy') {
                              // TODO: Implement privacy functionality
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Privacy functionality coming soon'),
                                ),
                              );
                            }
                          },
                          itemBuilder: (context) => [
                            const PopupMenuItem(
                              value: 'privacy',
                              child: Row(
                                children: [
                                  Icon(Icons.lock_outline, size: 20),
                                  SizedBox(width: 8),
                                  Text('Privacy'),
                                ],
                              ),
                            ),
                            const PopupMenuItem(
                              value: 'delete',
                              child: Row(
                                children: [
                                  Icon(Icons.delete_outline, size: 20, color: Colors.red),
                                  SizedBox(width: 8),
                                  Text('Delete', style: TextStyle(color: Colors.red)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ]
                    : null,
              ),

              // List Info Section
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 34, vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Stats: Venue count and Saved count
                      Row(
                        children: [
                          Text(
                            '${list.venueIds.length}',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).textTheme.titleMedium?.color,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'venues',
                            style: TextStyle(
                              fontSize: 14,
                              color: Theme.of(context).textTheme.bodySmall?.color,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Text(
                            '${list.shareCount}',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).textTheme.titleMedium?.color,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'saved',
                            style: TextStyle(
                              fontSize: 14,
                              color: Theme.of(context).textTheme.bodySmall?.color,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Description (editable if owner and in edit mode)
                      if (_isEditing && isOwner) ...[
                        TextField(
                          controller: _nameController,
                          decoration: const InputDecoration(
                            labelText: 'List Name',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _descriptionController,
                          decoration: const InputDecoration(
                            labelText: 'Description',
                            border: OutlineInputBorder(),
                          ),
                          maxLines: 3,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => _saveListChanges(list),
                          child: const Text('Save Changes'),
                        ),
                        const SizedBox(height: 16),
                      ] else ...[
                        if (list.description != null && list.description!.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Text(
                              list.description!,
                              style: TextStyle(
                                fontSize: 16,
                                color: Theme.of(context).textTheme.bodyMedium?.color,
                                height: 1.5,
                              ),
                            ),
                          ),
                      ],

                      // Curated by section
                      const Text(
                        'Curated by',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      StreamBuilder<UserModel?>(
                        stream: _firestoreService.getUserStream(list.userId),
                        builder: (context, userSnapshot) {
                          final creator = userSnapshot.data;
                          if (creator != null) {
                            return Row(
                              children: [
                                // Mini Profile Picture
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                  ),
                                  child: creator.profileImageUrl != null
                                      ? ClipOval(
                                          child: CachedNetworkImage(
                                            imageUrl: creator.profileImageUrl!,
                                            fit: BoxFit.cover,
                                            placeholder: (context, url) => Container(
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .surface,
                                              child: Icon(
                                                Icons.person,
                                                size: 16,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurface,
                                              ),
                                            ),
                                            errorWidget: (context, url, error) =>
                                                Container(
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .surface,
                                              child: Icon(
                                                Icons.person,
                                                size: 16,
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurface,
                                              ),
                                            ),
                                          ),
                                        )
                                      : CircleAvatar(
                                          radius: 16,
                                          backgroundColor:
                                              Theme.of(context).colorScheme.surface,
                                          child: Icon(
                                            Icons.person,
                                            size: 16,
                                            color: Theme.of(context)
                                                .colorScheme
                                                .onSurface,
                                          ),
                                        ),
                                ),
                                const SizedBox(width: 8),
                                // Creator Name
                                Text(
                                  creator.username,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: Theme.of(context)
                                        .textTheme
                                        .bodyMedium
                                        ?.color,
                                  ),
                                ),
                              ],
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ],
                  ),
                ),
              ),

              // Action Buttons (LokiButton: matches profile screen style)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final useWrap = constraints.maxWidth < 600;
                      const spacing = 8.0;
                      if (useWrap) {
                        return Wrap(
                          alignment: WrapAlignment.center,
                          spacing: spacing,
                          runSpacing: spacing,
                          children: [
                            LokiButton(
                              onPressed: isOwner
                                  ? () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Collaborate functionality coming soon'),
                                        ),
                                      );
                                    }
                                  : () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Follow list functionality coming soon'),
                                        ),
                                      );
                                    },
                              label: isOwner ? 'Collaborate' : 'Follow',
                            ),
                            LokiButton(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Share functionality coming soon'),
                                  ),
                                );
                              },
                              label: 'Share',
                            ),
                            if (isOwner)
                              LokiButton(
                                onPressed: () => _startEditing(list),
                                label: _isEditing ? 'Cancel' : 'Edit',
                              ),
                          ],
                        );
                      }
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Expanded(
                            child: LokiButton(
                              onPressed: isOwner
                                  ? () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Collaborate functionality coming soon'),
                                        ),
                                      );
                                    }
                                  : () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Follow list functionality coming soon'),
                                        ),
                                      );
                                    },
                              label: isOwner ? 'Collaborate' : 'Follow',
                            ),
                          ),
                          const SizedBox(width: spacing),
                          Expanded(
                            child: LokiButton(
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Share functionality coming soon'),
                                  ),
                                );
                              },
                              label: 'Share',
                            ),
                          ),
                          if (isOwner) ...[
                            const SizedBox(width: spacing),
                            Expanded(
                              child: LokiButton(
                                onPressed: () => _startEditing(list),
                                label: _isEditing ? 'Cancel' : 'Edit',
                              ),
                            ),
                          ],
                        ],
                      );
                    },
                  ),
                ),
              ),

              // Divider
              SliverToBoxAdapter(
                child: Divider(
                  height: 1,
                  thickness: 1,
                  color: Theme.of(context).dividerColor,
                ),
              ),

              // Venues Grid
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.only(top: 16),
                  child: StreamBuilder<List<VenueModel>>(
                  stream: _firestoreService.getVenuesByIdsStream(list.venueIds),
                  builder: (context, venuesSnapshot) {
                    if (venuesSnapshot.connectionState == ConnectionState.waiting) {
                      return const Padding(
                        padding: EdgeInsets.all(32),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }

                    final venues = venuesSnapshot.data ?? [];

                    if (venues.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.all(32),
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.list_alt,
                                size: 64,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurface
                                    .withOpacity(0.3),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No venues in this list yet',
                                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withOpacity(0.6),
                                    ),
                              ),
                              if (isOwner) ...[
                                const SizedBox(height: 8),
                                Text(
                                  'Tap "Collaborate" to add venues',
                                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurface
                                            .withOpacity(0.5),
                                      ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          final cardWidth = (constraints.maxWidth - 12) / 2; // 2 columns with spacing
                          return Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: venues.map((venue) {
                              return SizedBox(
                                width: cardWidth,
                                child: VenueCardMini(
                                  venue: venue,
                                  userPosition: _userPosition,
                                  listId: list.listId,
                                  onRemove: isOwner
                                      ? () {
                                          _removeVenueFromList(list.listId, venue.venueId);
                                        }
                                      : null,
                                ),
                              );
                            }).toList(),
                          );
                        },
                      ),
                    );
                  },
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _startEditing(ListModel list) {
    if (_isEditing) {
      // Cancel editing
      setState(() {
        _isEditing = false;
        _nameController.clear();
        _descriptionController.clear();
      });
    } else {
      // Start editing
      setState(() {
        _isEditing = true;
        _nameController.text = list.name;
        _descriptionController.text = list.description ?? '';
      });
    }
  }

  Future<void> _saveListChanges(ListModel list) async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('List name cannot be empty')),
      );
      return;
    }

    try {
      await _firestoreService.updateList(widget.listId, {
        'name': name,
        'description': _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
      });

      setState(() {
        _isEditing = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('List updated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating list: $e')),
        );
      }
    }
  }

  void _showDeleteConfirmation(BuildContext context, ListModel list) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete List'),
        content: Text('Are you sure you want to delete "${list.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await _deleteList(list);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteList(ListModel list) async {
    try {
      await _firestoreService.deleteList(widget.listId);
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('List deleted successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error deleting list: $e')),
        );
      }
    }
  }

  Future<void> _removeVenueFromList(String listId, String venueId) async {
    try {
      await _firestoreService.removeVenueFromList(listId, venueId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Venue removed from list')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error removing venue: $e')),
        );
      }
    }
  }
}
