import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../widgets/venue_card.dart';
import '../models/venue_model.dart';
import '../models/list_model.dart';
import '../services/firestore_service.dart';
import '../services/location_service.dart';

class ExploreScreen extends StatefulWidget {
  final VenueModel initialVenue;
  final String? listId; // Optional: if venue was clicked from a list

  const ExploreScreen({
    super.key,
    required this.initialVenue,
    this.listId,
  });

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FirestoreService _firestoreService = FirestoreService();
  final LocationService _locationService = LocationService();
  final ScrollController _scrollController = ScrollController();
  Position? _userPosition;
  String _searchQuery = '';
  bool _isSearchVisible = false;

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  double _lastScrollOffset = 0;
  
  void _onScroll() {
    // Hide search bar if scrolling and search is empty
    if (_scrollController.hasClients) {
      final currentOffset = _scrollController.offset;
      final isScrolling = (currentOffset - _lastScrollOffset).abs() > 1.0;
      _lastScrollOffset = currentOffset;
      
      if (isScrolling && 
          _searchController.text.isEmpty &&
          _isSearchVisible) {
        setState(() {
          _isSearchVisible = false;
        });
      }
    }
  }

  void _toggleSearch() {
    setState(() {
      _isSearchVisible = !_isSearchVisible;
      if (!_isSearchVisible && _searchController.text.isEmpty) {
        _searchQuery = '';
      }
    });
  }

  Future<void> _getCurrentLocation() async {
    final position = await _locationService.getCurrentLocation();
    if (mounted) {
      setState(() {
        _userPosition = position;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: widget.listId != null
            ? StreamBuilder<ListModel?>(
                stream: _firestoreService.getListStream(widget.listId!),
                builder: (context, snapshot) {
                  final listName = snapshot.data?.name ?? 'Explore';
                  return Row(
                    children: [
                      Expanded(
                        child: Text(listName),
                      ),
                      IconButton(
                        icon: const Icon(Icons.search),
                        onPressed: _toggleSearch,
                        tooltip: 'Search',
                      ),
                    ],
                  );
                },
              )
            : Row(
                children: [
                  const Expanded(
                    child: Text('Explore'),
                  ),
                  IconButton(
                    icon: const Icon(Icons.search),
                    onPressed: _toggleSearch,
                    tooltip: 'Search',
                  ),
                ],
              ),
      ),
      body: Column(
        children: [
          // Search Bar (Animated)
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeInOut,
            height: _isSearchVisible ? 80 : 0,
            child: _isSearchVisible
                ? Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: TextField(
                      controller: _searchController,
                      autofocus: true,
                      decoration: InputDecoration(
                        hintText: 'Search venues...',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {
                                    _searchQuery = '';
                                  });
                                },
                              )
                            : null,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onChanged: (value) {
                        setState(() {
                          _searchQuery = value.toLowerCase();
                        });
                      },
                    ),
                  )
                : const SizedBox.shrink(),
          ),

          // Content
          Expanded(
            child: _buildContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    // Check if initial venue matches search query
    final showInitialVenue = _searchQuery.isEmpty ||
        widget.initialVenue.name.toLowerCase().contains(_searchQuery) ||
        widget.initialVenue.description.toLowerCase().contains(_searchQuery) ||
        (widget.initialVenue.atmosphere?.toLowerCase().contains(_searchQuery) ?? false);

    // If we have a listId, load list data and other venues
    if (widget.listId != null) {
      return StreamBuilder<ListModel?>(
        stream: _firestoreService.getListStream(widget.listId!),
        builder: (context, listSnapshot) {
          if (listSnapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final list = listSnapshot.data;
          
          // Get other venue IDs from the list (excluding the initial venue)
          final otherVenueIds = list?.venueIds
                  .where((id) => id != widget.initialVenue.venueId)
                  .toList() ??
              [];

          return StreamBuilder<List<VenueModel>>(
            stream: _firestoreService.getVenuesByIdsStream(otherVenueIds),
            builder: (context, venuesSnapshot) {
              if (venuesSnapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              var listVenues = venuesSnapshot.data ?? [];

              // Filter list venues by search query if needed
              if (_searchQuery.isNotEmpty) {
                listVenues = listVenues.where((venue) {
                  return venue.name.toLowerCase().contains(_searchQuery) ||
                      venue.description.toLowerCase().contains(_searchQuery) ||
                      (venue.atmosphere?.toLowerCase().contains(_searchQuery) ?? false);
                }).toList();
              }

              return _buildVenuesList(
                showInitialVenue: showInitialVenue,
                listVenues: listVenues,
                listName: list?.name,
              );
            },
          );
        },
      );
    }

    // No list context - just show the initial venue
    return _buildVenuesList(
      showInitialVenue: showInitialVenue,
      listVenues: [],
      listName: null,
    );
  }

  Widget _buildVenuesList({
    required bool showInitialVenue,
    required List<VenueModel> listVenues,
    String? listName,
  }) {
    final hasContent = showInitialVenue || listVenues.isNotEmpty;

    if (!hasContent) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            children: [
              Icon(
                Icons.search_off,
                size: 64,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
              ),
              const SizedBox(height: 16),
              Text(
                'No venues found',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withOpacity(0.6),
                    ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      children: [
        // Initial Venue Card (the one that was clicked)
        if (showInitialVenue) ...[
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: VenueCard(
              venue: widget.initialVenue,
              userPosition: _userPosition,
            ),
          ),
          if (listVenues.isNotEmpty) const SizedBox(height: 16),
        ],

        // Other Venues from List (if applicable)
        if (listVenues.isNotEmpty) ...[
          if (showInitialVenue) const Divider(height: 32),
          ...listVenues.map((venue) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: VenueCard(
                venue: venue,
                userPosition: _userPosition,
              ),
            );
          }),
        ],
      ],
    );
  }
}
