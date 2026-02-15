import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import '../widgets/venue_card.dart';
import '../widgets/venue_display_card.dart';
import '../widgets/list_card.dart';
import '../widgets/filter_drawer.dart';
import '../models/venue_model.dart';
import '../models/list_model.dart';
import '../models/user_model.dart';
import '../services/firestore_service.dart';
import '../services/location_service.dart';
import '../utils/responsive_layout.dart';

enum SortOption { distance, recommended, popularity }

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FirestoreService _firestoreService = FirestoreService();
  final LocationService _locationService = LocationService();
  final ScrollController _scrollController = ScrollController();
  Position? _userPosition;
  String _searchQuery = '';
  
  // Filter state
  DateTime? _selectedDate;
  String _locationText = 'Near me';
  SortOption _sortOption = SortOption.popularity;
  
  // Scroll visibility state
  bool _isHeaderVisible = true;
  double _lastScrollOffset = 0;

  @override
  void initState() {
    super.initState();
    _selectedDate = DateTime.now(); // Default to today
    _getCurrentLocation();
    _scrollController.addListener(_handleScroll);
  }
  
  void _handleScroll() {
    final currentOffset = _scrollController.offset;
    final isScrollingDown = currentOffset > _lastScrollOffset;
    final isScrollingUp = currentOffset < _lastScrollOffset;
    
    if (isScrollingDown && currentOffset > 50 && _isHeaderVisible) {
      setState(() {
        _isHeaderVisible = false;
      });
    } else if (isScrollingUp && !_isHeaderVisible) {
      setState(() {
        _isHeaderVisible = true;
      });
    }
    
    _lastScrollOffset = currentOffset;
  }

  @override
  void dispose() {
    _searchController.dispose();
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
      }
    } catch (e) {
      debugPrint('Error getting location: $e');
      if (mounted) {
        setState(() {
          _userPosition = null;
        });
      }
    }
  }

  String _getDateText() {
    if (_selectedDate == null) return 'Today';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final selected = DateTime(_selectedDate!.year, _selectedDate!.month, _selectedDate!.day);
    
    if (selected == today) {
      return 'Today';
    } else if (selected == today.add(const Duration(days: 1))) {
      return 'Tomorrow';
    } else {
      return DateFormat('MMM d').format(_selectedDate!);
    }
  }

  void _showDateSelector() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _DateSelectorBottomSheet(
        selectedDate: _selectedDate ?? DateTime.now(),
        onDateSelected: (date) {
          setState(() {
            _selectedDate = date;
          });
        },
      ),
    );
  }

  void _showLocationSelector() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _LocationSelectorBottomSheet(
        currentLocation: _locationText,
        onLocationSelected: (location) {
          setState(() {
            _locationText = location;
          });
        },
      ),
    );
  }

  void _showSortSelector() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _SortSelectorBottomSheet(
        selectedSort: _sortOption,
        onSortSelected: (sort) {
          setState(() {
            _sortOption = sort;
          });
        },
      ),
    );
  }

  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  Set<String> _selectedFilters = {};

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      endDrawer: FilterDrawer(
        selectedFilters: _selectedFilters,
        onFiltersChanged: (filters) {
          setState(() {
            _selectedFilters = filters;
          });
        },
      ),
      body: Stack(
        children: [
          Column(
        children: [
          // Search Bar and Filter Buttons (Animated)
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            height: _isHeaderVisible ? null : 0,
            child: _isHeaderVisible
                ? Column(
                    children: [
                      // Search Bar
                      Container(
                        color: Theme.of(context).brightness == Brightness.light
                            ? Theme.of(context).scaffoldBackgroundColor
                            : (Theme.of(context).appBarTheme.backgroundColor ?? Theme.of(context).colorScheme.surface),
                        child: SafeArea(
                          bottom: false,
                          child: ResponsivePadding(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: TextField(
                    controller: _searchController,
                    autofocus: false,
                    decoration: InputDecoration(
                      hintText: 'Discover your city',
                      hintStyle: TextStyle(
                        color: Theme.of(context).brightness == Brightness.light
                            ? Colors.black.withOpacity(0.5)
                            : Colors.white.withOpacity(0.7),
                      ),
                      prefixIcon: Icon(
                        Icons.search,
                        color: Theme.of(context).brightness == Brightness.light
                            ? Colors.black.withOpacity(0.6)
                            : Colors.white,
                        size: 20,
                      ),
                      suffixIcon: _searchQuery.isNotEmpty
                          ? IconButton(
                              icon: Icon(
                                Icons.clear,
                                color: Theme.of(context).brightness == Brightness.light
                                    ? Colors.black.withOpacity(0.6)
                                    : Colors.white,
                                size: 20,
                              ),
                              onPressed: () {
                                _searchController.clear();
                                setState(() {
                                  _searchQuery = '';
                                });
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: Theme.of(context).scaffoldBackgroundColor,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(100),
                        borderSide: Theme.of(context).brightness == Brightness.dark
                            ? BorderSide(
                                color: Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey,
                                width: 1,
                              )
                            : BorderSide.none,
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(100),
                        borderSide: Theme.of(context).brightness == Brightness.dark
                            ? BorderSide(
                                color: Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey,
                                width: 1,
                              )
                            : BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(100),
                        borderSide: Theme.of(context).brightness == Brightness.dark
                            ? BorderSide(
                                color: Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey,
                                width: 1,
                              )
                            : BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    style: TextStyle(
                      color: Theme.of(context).brightness == Brightness.light
                          ? Colors.black
                          : Colors.white,
                      fontSize: 14,
                    ),
                    onChanged: (value) {
                      setState(() {
                        _searchQuery = value.toLowerCase();
                      });
                    },
                  ),
                ),
              ),
            ),
          ),
                      // Filter Buttons
                      Container(
                        color: Theme.of(context).brightness == Brightness.light
                            ? Theme.of(context).scaffoldBackgroundColor
                            : (Theme.of(context).appBarTheme.backgroundColor ?? Theme.of(context).colorScheme.surface),
                        child: ResponsivePadding(
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: Row(
                              children: [
                                // Date Button
                                Expanded(
                                  child: _FilterButton(
                                    icon: Icons.calendar_today,
                                    label: _getDateText(),
                                    onTap: _showDateSelector,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                // Location Button
                                Expanded(
                                  child: _FilterButton(
                                    icon: Icons.location_on,
                                    label: _locationText,
                                    onTap: _showLocationSelector,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                // Sort Button
                                Expanded(
                                  child: _FilterButton(
                                    icon: Icons.sort,
                                    label: _getSortText(),
                                    onTap: _showSortSelector,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  )
                : const SizedBox.shrink(),
          ),

          // Content
          Expanded(
            child: _buildSearchResults(),
          ),
        ],
      ),
          
          // Floating Filter Tab Button (right side, vertically centered)
          Positioned(
            right: 0,
            top: 0,
            bottom: 0,
            child: Center(
              child: GestureDetector(
                onTap: () {
                  _scaffoldKey.currentState?.openEndDrawer();
                },
                child: Container(
                  width: 40,
                  height: 80,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(20),
                      bottomLeft: Radius.circular(20),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 4,
                        offset: const Offset(-2, 0),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.tune,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getSortText() {
    switch (_sortOption) {
      case SortOption.distance:
        return 'Distance';
      case SortOption.recommended:
        return 'Recommended';
      case SortOption.popularity:
        return 'Popularity';
    }
  }

  Widget _buildSearchResults() {
    return StreamBuilder<List<ListModel>>(
      stream: _firestoreService.getAllListsStream(),
      builder: (context, listsSnapshot) {
        return StreamBuilder<List<VenueModel>>(
          stream: _firestoreService.getVenuesStream(),
          builder: (context, venuesSnapshot) {
            if ((listsSnapshot.connectionState == ConnectionState.waiting ||
                venuesSnapshot.connectionState == ConnectionState.waiting) &&
                !listsSnapshot.hasData && !venuesSnapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }

            if (listsSnapshot.hasError && !listsSnapshot.hasData) {
              debugPrint('Error loading lists: ${listsSnapshot.error}');
            }
            if (venuesSnapshot.hasError && !venuesSnapshot.hasData) {
              debugPrint('Error loading venues: ${venuesSnapshot.error}');
            }

            var lists = listsSnapshot.data ?? [];
            var venues = venuesSnapshot.data ?? [];

            // Filter by search query
            if (_searchQuery.isNotEmpty) {
              lists = lists.where((list) {
                return list.name.toLowerCase().contains(_searchQuery) ||
                    (list.description?.toLowerCase().contains(_searchQuery) ?? false);
              }).toList();

              venues = venues.where((venue) {
                return venue.name.toLowerCase().contains(_searchQuery) ||
                    venue.description.toLowerCase().contains(_searchQuery) ||
                    (venue.atmosphere?.toLowerCase().contains(_searchQuery) ?? false);
              }).toList();
            }

            // Filter venues by selected tags/filters
            if (_selectedFilters.isNotEmpty) {
              venues = venues.where((venue) {
                // Convert venue tags to lowercase for case-insensitive matching
                final venueTagsLower = venue.tags.map((tag) => tag.toLowerCase().trim()).toSet();
                final selectedTagsLower = _selectedFilters.map((tag) => tag.toLowerCase().trim()).toSet();
                
                // Venue must have all selected filter tags
                // Check if every selected filter tag matches at least one venue tag
                return selectedTagsLower.every((selectedTag) {
                  // Try exact match first
                  if (venueTagsLower.contains(selectedTag)) {
                    return true;
                  }
                  // Try partial match (e.g., "Pet-Friendly" matches "Pet-Friendly Venue")
                  return venueTagsLower.any((venueTag) => 
                    venueTag.contains(selectedTag) || selectedTag.contains(venueTag)
                  );
                });
              }).toList();
            }

            // Combine lists and venues
            final allItems = <_SearchItem>[];
            
            for (final list in lists) {
              allItems.add(_SearchItem(type: _ItemType.list, list: list));
            }
            
            // Add each venue twice: normal VenueCard then VenueDisplayCard so user can compare
            for (final venue in venues) {
              allItems.add(_SearchItem(type: _ItemType.venue, venue: venue, useDisplayCard: false));
              allItems.add(_SearchItem(type: _ItemType.venue, venue: venue, useDisplayCard: true));
            }

            if (allItems.isEmpty) {
              if (_searchQuery.isEmpty) {
                if (venues.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off, size: 64, color: Colors.grey),
                          SizedBox(height: 16),
                          Text(
                            'No venues found',
                            style: TextStyle(fontSize: 16, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  );
                }
              }
              return const Center(child: Text('No results found'));
            }

            final width = MediaQuery.of(context).size.width;
            final useGrid = kIsWeb && width > 800;
            final crossAxisCount = width > 1100 ? 3 : 2;

            return CustomScrollView(
              controller: _scrollController,
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  sliver: useGrid
                      ? SliverGrid(
                          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: crossAxisCount,
                            mainAxisSpacing: 16,
                            crossAxisSpacing: 16,
                            childAspectRatio: 0.75,
                          ),
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              return _buildSearchResultCard(allItems[index]);
                            },
                            childCount: allItems.length,
                          ),
                        )
                      : SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final item = allItems[index];
                              final hPad = item.type == _ItemType.venue ? 6.0 : 16.0;
                              return Padding(
                                padding: EdgeInsets.only(left: hPad, right: hPad, bottom: 16),
                                child: _buildSearchResultCard(item),
                              );
                            },
                            childCount: allItems.length,
                          ),
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildSearchResultCard(_SearchItem item) {
    if (item.type == _ItemType.list) {
      return StreamBuilder<UserModel?>(
        stream: _firestoreService.getUserStream(item.list!.userId),
        builder: (context, userSnapshot) {
          final creator = userSnapshot.data;
          return StreamBuilder<List<VenueModel>>(
            stream: _firestoreService.getVenuesByIdsStream(
              item.list!.venueIds,
            ),
            builder: (context, venuesSnapshot) {
              final listVenues = venuesSnapshot.data ?? [];
              return ListCard(
                list: item.list!,
                creator: creator,
                venues: listVenues,
              );
            },
          );
        },
      );
    }
    if (item.useDisplayCard) {
      return VenueDisplayCard(
        venue: item.venue!,
        userPosition: _userPosition,
        searchQuery: _searchQuery,
      );
    }
    return VenueCard(
      venue: item.venue!,
      userPosition: _userPosition,
    );
  }
}

// Filter Button Widget
class _FilterButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _FilterButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isLightMode = Theme.of(context).brightness == Brightness.light;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final secondaryTextColor = Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(100),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          borderRadius: BorderRadius.circular(100),
          border: isDark
              ? Border.all(color: secondaryTextColor, width: 1)
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isLightMode
                  ? Colors.black.withOpacity(0.7)
                  : Colors.white,
              size: 16,
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  color: isLightMode
                      ? Colors.black.withOpacity(0.7)
                      : Colors.white,
                  fontSize: 12,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Date Selector Bottom Sheet
class _DateSelectorBottomSheet extends StatefulWidget {
  final DateTime selectedDate;
  final Function(DateTime) onDateSelected;

  const _DateSelectorBottomSheet({
    required this.selectedDate,
    required this.onDateSelected,
  });

  @override
  State<_DateSelectorBottomSheet> createState() => _DateSelectorBottomSheetState();
}

class _DateSelectorBottomSheetState extends State<_DateSelectorBottomSheet> {
  late DateTime _selectedDate;
  late DateTime _displayedMonth;

  @override
  void initState() {
    super.initState();
    _selectedDate = widget.selectedDate;
    _displayedMonth = DateTime(_selectedDate.year, _selectedDate.month);
  }

  void _selectQuickDate(DateTime date) {
    setState(() {
      _selectedDate = date;
    });
    widget.onDateSelected(date);
    Navigator.pop(context);
  }

  void _selectDate(DateTime date) {
    setState(() {
      _selectedDate = date;
    });
  }

  void _applyDate() {
    widget.onDateSelected(_selectedDate);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final tomorrow = today.add(const Duration(days: 1));
    final thisWeekend = _getThisWeekend();

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                  color: Theme.of(context).colorScheme.onSurface,
                ),
                Expanded(
                  child: Text(
                    'Filters',
                    style: Theme.of(context).textTheme.titleLarge,
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(width: 48), // Balance the close button
              ],
            ),
          ),
          const Divider(height: 1),

          // Quick Date Selection
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Date',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Icon(
                      Icons.keyboard_arrow_up,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _QuickDateButton(
                        label: 'Today',
                        onTap: () => _selectQuickDate(today),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _QuickDateButton(
                        label: 'Tomorrow',
                        onTap: () => _selectQuickDate(tomorrow),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _QuickDateButton(
                        label: 'This weekend',
                        onTap: () => _selectQuickDate(thisWeekend),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Calendar
                _buildCalendar(),
              ],
            ),
          ),

          // Apply Button
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _applyDate,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Apply'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  DateTime _getThisWeekend() {
    final now = DateTime.now();
    final weekday = now.weekday;
    // Saturday is 6, Sunday is 7
    if (weekday == 6) {
      return DateTime(now.year, now.month, now.day); // Today is Saturday
    } else if (weekday == 7) {
      return DateTime(now.year, now.month, now.day); // Today is Sunday
    } else {
      // Get next Saturday
      final daysUntilSaturday = 6 - weekday;
      return DateTime(now.year, now.month, now.day + daysUntilSaturday);
    }
  }

  Widget _buildCalendar() {
    final firstDayOfMonth = DateTime(_displayedMonth.year, _displayedMonth.month, 1);
    final lastDayOfMonth = DateTime(_displayedMonth.year, _displayedMonth.month + 1, 0);
    final firstWeekday = firstDayOfMonth.weekday; // 1 = Monday, 7 = Sunday
    final daysInMonth = lastDayOfMonth.day;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return Column(
      children: [
        // Month Navigation
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              DateFormat('MMM yyyy').format(_displayedMonth).toUpperCase(),
              style: Theme.of(context).textTheme.titleMedium,
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right),
              onPressed: () {
                setState(() {
                  _displayedMonth = DateTime(_displayedMonth.year, _displayedMonth.month + 1);
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Weekday Headers
        Row(
          children: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
              .map((day) => Expanded(
                    child: Center(
                      child: Text(
                        day,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ))
              .toList(),
        ),
        const SizedBox(height: 8),

        // Calendar Grid
        ...List.generate(6, (weekIndex) {
          return Row(
            children: List.generate(7, (dayIndex) {
              final dayNumber = weekIndex * 7 + dayIndex - firstWeekday + 2;
              if (dayNumber < 1 || dayNumber > daysInMonth) {
                return const Expanded(child: SizedBox());
              }

              final date = DateTime(_displayedMonth.year, _displayedMonth.month, dayNumber);
              final dateOnly = DateTime(date.year, date.month, date.day);
              final isSelected = date.year == _selectedDate.year &&
                  date.month == _selectedDate.month &&
                  date.day == _selectedDate.day;
              final isPast = dateOnly.isBefore(today);

              return Expanded(
                child: GestureDetector(
                  onTap: isPast ? null : () => _selectDate(date),
                  child: Container(
                    margin: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      border: isSelected
                          ? Border.all(
                              color: Theme.of(context).colorScheme.primary,
                              width: 2,
                            )
                          : null,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        dayNumber.toString(),
                        style: TextStyle(
                          color: isPast
                              ? Theme.of(context).colorScheme.onSurface.withOpacity(0.3)
                              : isSelected
                                  ? Theme.of(context).colorScheme.primary
                                  : Theme.of(context).colorScheme.onSurface,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          );
        }),
      ],
    );
  }
}

class _QuickDateButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;

  const _QuickDateButton({
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(100),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface.withOpacity(0.5),
          borderRadius: BorderRadius.circular(100),
        ),
        child: Center(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ),
    );
  }
}

// Location Selector Bottom Sheet
class _LocationSelectorBottomSheet extends StatelessWidget {
  final String currentLocation;
  final Function(String) onLocationSelected;

  const _LocationSelectorBottomSheet({
    required this.currentLocation,
    required this.onLocationSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                  color: Theme.of(context).colorScheme.onSurface,
                ),
                Expanded(
                  child: Text(
                    'Location',
                    style: Theme.of(context).textTheme.titleLarge,
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(width: 48),
              ],
            ),
          ),
          const Divider(height: 1),

          // Location Options (placeholder for now)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                _LocationOption(
                  label: 'Near me',
                  isSelected: currentLocation == 'Near me',
                  onTap: () {
                    onLocationSelected('Near me');
                    Navigator.pop(context);
                  },
                ),
                // More options will be added later
              ],
            ),
          ),

          // Apply Button
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Apply'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LocationOption extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _LocationOption({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(label),
      trailing: isSelected
          ? Icon(
              Icons.check_circle,
              color: Theme.of(context).colorScheme.primary,
            )
          : null,
      onTap: onTap,
    );
  }
}

// Sort Selector Bottom Sheet
class _SortSelectorBottomSheet extends StatelessWidget {
  final SortOption selectedSort;
  final Function(SortOption) onSortSelected;

  const _SortSelectorBottomSheet({
    required this.selectedSort,
    required this.onSortSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                  color: Theme.of(context).colorScheme.onSurface,
                ),
                Expanded(
                  child: Text(
                    'Sort',
                    style: Theme.of(context).textTheme.titleLarge,
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(width: 48),
              ],
            ),
          ),
          const Divider(height: 1),

          // Sort Options
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              children: [
                _SortOption(
                  label: 'Popularity (Most followed)',
                  isSelected: selectedSort == SortOption.popularity,
                  onTap: () {
                    onSortSelected(SortOption.popularity);
                    Navigator.pop(context);
                  },
                ),
                _SortOption(
                  label: 'Recommended (For you)',
                  isSelected: selectedSort == SortOption.recommended,
                  onTap: () {
                    onSortSelected(SortOption.recommended);
                    Navigator.pop(context);
                  },
                ),
                _SortOption(
                  label: 'Distance',
                  isSelected: selectedSort == SortOption.distance,
                  onTap: () {
                    onSortSelected(SortOption.distance);
                    Navigator.pop(context);
                  },
                ),
              ],
            ),
          ),

          // Apply Button
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('Apply'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SortOption extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _SortOption({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(label),
      trailing: isSelected
          ? Icon(
              Icons.check_circle,
              color: Theme.of(context).colorScheme.primary,
            )
          : null,
      onTap: onTap,
    );
  }
}

// Helper class to combine lists and venues in a single list
enum _ItemType { list, venue }

class _SearchItem {
  final _ItemType type;
  final ListModel? list;
  final VenueModel? venue;
  /// When true, show VenueDisplayCard instead of VenueCard (for venue items only).
  final bool useDisplayCard;

  _SearchItem({
    required this.type,
    this.list,
    this.venue,
    this.useDisplayCard = false,
  });
}
