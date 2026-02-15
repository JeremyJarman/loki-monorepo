import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/venue_model.dart';
import '../models/list_model.dart';
import '../services/firestore_service.dart';
import 'create_list_screen.dart';

class SaveToScreen extends StatefulWidget {
  final VenueModel venue;

  const SaveToScreen({
    super.key,
    required this.venue,
  });

  @override
  State<SaveToScreen> createState() => _SaveToScreenState();
}

class _SaveToScreenState extends State<SaveToScreen> {
  final FirestoreService _firestoreService = FirestoreService();
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _saveToProfile() async {
    final currentUser = FirebaseAuth.instance.currentUser;
    if (currentUser == null) return;

    try {
      final user = await _firestoreService.getUser(currentUser.uid);
      if (user == null) return;

      final favoriteIds = List<String>.from(user.favoriteVenueIds);
      if (!favoriteIds.contains(widget.venue.venueId)) {
        favoriteIds.add(widget.venue.venueId);
        await _firestoreService.updateUser(currentUser.uid, {
          'favoriteVenueIds': favoriteIds,
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Saved to favorites')),
          );
          Navigator.of(context).pop();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Already in favorites')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving: $e')),
        );
      }
    }
  }

  Future<void> _saveToList(String listId) async {
    try {
      final list = await _firestoreService.getList(listId);
      if (list == null) return;

      final venueIds = List<String>.from(list.venueIds);
      if (!venueIds.contains(widget.venue.venueId)) {
        venueIds.add(widget.venue.venueId);
        await _firestoreService.updateList(listId, {
          'venueIds': venueIds,
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Saved to list')),
          );
          Navigator.of(context).pop();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Already in this list')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving: $e')),
        );
      }
    }
  }

  void _navigateToCreateList() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const CreateListScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = FirebaseAuth.instance.currentUser;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.max,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  Expanded(
                    child: Center(
                      child: Text(
                        'Save to',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 48), // Balance the close button
                ],
              ),
            ),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Search',
                  prefixIcon: const Icon(Icons.search),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  filled: true,
                  fillColor: Theme.of(context).colorScheme.surface,
                ),
                onChanged: (value) {
                  setState(() {
                    _searchQuery = value.toLowerCase();
                  });
                },
              ),
            ),

            const SizedBox(height: 16),

            // Content
            Expanded(
              child: StreamBuilder<List<ListModel>>(
                stream: currentUser != null
                    ? _firestoreService.getUserLists(currentUser.uid)
                    : Stream.value([]),
                builder: (context, snapshot) {
                  final lists = snapshot.data ?? [];
                  final filteredLists = _searchQuery.isEmpty
                      ? lists
                      : lists
                          .where((list) =>
                              list.name.toLowerCase().contains(_searchQuery))
                          .toList();

                  // Group lists by first letter for alphabetical index
                  final groupedLists = <String, List<ListModel>>{};
                  for (final list in filteredLists) {
                    final firstLetter = list.name.isNotEmpty
                        ? list.name[0].toUpperCase()
                        : '#';
                    if (!groupedLists.containsKey(firstLetter)) {
                      groupedLists[firstLetter] = [];
                    }
                    groupedLists[firstLetter]!.add(list);
                  }

                  final sortedLetters = groupedLists.keys.toList()..sort();

                  return Row(
                    children: [
                      // Main Content
                      Expanded(
                        child: ListView(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          children: [
                            // Quick Save Section
                            const Text(
                              'Quick save',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            _buildProfileSaveOption(),
                            const SizedBox(height: 24),

                            // Your Boards Section
                            if (filteredLists.isNotEmpty) ...[
                              const Text(
                                'Your Lists',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 12),
                              ...sortedLetters.map((letter) {
                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.only(
                                        left: 4,
                                        top: 8,
                                        bottom: 4,
                                      ),
                                      child: Text(
                                        letter,
                                        style: TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: Theme.of(context)
                                              .colorScheme
                                              .onSurface
                                              .withOpacity(0.6),
                                        ),
                                      ),
                                    ),
                                    ...groupedLists[letter]!.map(
                                      (list) => _buildListTile(list),
                                    ),
                                  ],
                                );
                              }),
                            ] else if (_searchQuery.isNotEmpty) ...[
                              Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(32),
                                  child: Text(
                                    'No lists found',
                                    style: TextStyle(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withOpacity(0.6),
                                    ),
                                  ),
                                ),
                              ),
                            ] else ...[
                              Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(32),
                                  child: Text(
                                    'No lists yet',
                                    style: TextStyle(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withOpacity(0.6),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                            const SizedBox(height: 80), // Space for create button
                          ],
                        ),
                      ),

                      // Alphabetical Scroll Index
                      if (sortedLetters.length > 5)
                        Container(
                          width: 24,
                          margin: const EdgeInsets.only(right: 8),
                          child: ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: sortedLetters.length,
                            itemBuilder: (context, index) {
                              return GestureDetector(
                                onTap: () {
                                  // Scroll to letter section
                                  // This is a simplified version - full implementation would require ScrollController
                                },
                                child: Center(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 4),
                                    child: Text(
                                      sortedLetters[index],
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurface
                                            .withOpacity(0.6),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                    ],
                  );
                },
              ),
            ),

            // Create Board Button
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                border: Border(
                  top: BorderSide(
                    color: Theme.of(context).dividerColor,
                    width: 1,
                  ),
                ),
              ),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _navigateToCreateList,
                  icon: const Icon(Icons.add),
                  label: const Text('Create list'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(100), // Fully rounded (pill-shaped)
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileSaveOption() {
    return InkWell(
      onTap: _saveToProfile,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.person,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Favorites',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildListTile(ListModel list) {
    return StreamBuilder<List<VenueModel>>(
      stream: _firestoreService.getVenuesByIdsStream(list.venueIds.take(1).toList()),
      builder: (context, snapshot) {
        final thumbnailUrl = snapshot.hasData && snapshot.data!.isNotEmpty
            ? (snapshot.data!.first.imageUrls.isNotEmpty
                ? snapshot.data!.first.imageUrls.first
                : null)
            : null;

        return InkWell(
          onTap: () => _saveToList(list.listId),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(4),
                    color: Theme.of(context).colorScheme.surface,
                  ),
                  child: thumbnailUrl != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: CachedNetworkImage(
                            imageUrl: thumbnailUrl,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: Theme.of(context).colorScheme.surface,
                            ),
                            errorWidget: (context, url, error) => Container(
                              color: Theme.of(context).colorScheme.surface,
                              child: Icon(
                                Icons.image,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurface
                                    .withOpacity(0.3),
                              ),
                            ),
                          ),
                        )
                      : Icon(
                          Icons.list,
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withOpacity(0.3),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    list.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
