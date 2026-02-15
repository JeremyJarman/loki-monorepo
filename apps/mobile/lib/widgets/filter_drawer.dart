import 'package:flutter/material.dart';

class FilterDrawer extends StatefulWidget {
  final Set<String> selectedFilters;
  final Function(Set<String>) onFiltersChanged;

  const FilterDrawer({
    super.key,
    required this.selectedFilters,
    required this.onFiltersChanged,
  });

  @override
  State<FilterDrawer> createState() => _FilterDrawerState();
}

class _FilterDrawerState extends State<FilterDrawer> {
  late Set<String> _selectedFilters;
  bool _isVibeExpanded = false;
  bool _isOfferingsExpanded = false;
  bool _isAmenitiesExpanded = false;
  TextEditingController? _keywordController;

  // Filter categories - flattened lists
  static const List<String> _vibeFilters = [
    // Energetic & Lively
    'Bustling',
    'Vibrant',
    'Party Atmosphere',
    'Upbeat',
    // Relaxed & Chill
    'Cozy',
    'Calm',
    'Intimate',
    'Laid-back',
    'Comfortable',
    // Sophisticated & Upscale
    'Elegant',
    'Chic',
    'Exclusive',
    'Luxurious',
    // Unique & Quirky
    'Bohemian',
    'Artistic',
    'Eclectic',
    'Industrial',
    'Themed',
    // Social & Community
    'Community Hub',
    'Meeting Spot',
    'Friendly',
    'Inclusive',
    // Specific Moods
    'Romantic',
    'Family-Friendly',
    'Work-Friendly',
    'Date Night',
    'Pet-Friendly',
  ];

  static const List<String> _offeringsFilters = [
    // Cuisine Type
    'Austrian',
    'Italian',
    'Asian (General)',
    'Japanese',
    'Chinese',
    'Indian',
    'Mexican',
    'Mediterranean',
    'Vegan',
    'Vegetarian',
    'Gluten-Free Options',
    'Fusion',
    'Street Food',
    // Drink Specialties
    'Craft Beer',
    'Cocktails',
    'Wine Bar',
    'Coffee Specialty',
    'Tea House',
    'Non-Alcoholic Options',
    // Meal Types
    'Breakfast',
    'Brunch',
    'Lunch',
    'Dinner',
    'Late Night Food',
    'Snacks',
    // Other Offerings
    'Live Music',
    'DJ Sets',
    'Karaoke',
    'Sports Bar',
    'Shisha/Hookah',
    'Gaming',
  ];

  static const List<String> _amenitiesFilters = [
    // Seating & Space
    'Outdoor Seating',
    'Terrace',
    'Garden',
    'Rooftop',
    'Private Rooms',
    'Large Group Friendly',
    'Wheelchair Accessible',
    // Services & Facilities
    'Free Wi-Fi',
    'Power Outlets',
    'Parking Available',
    'Valet Parking',
    'Coat Check',
    'Restrooms',
    'Smoking Area',
    'Billiards table(s)',
    // Payment Options
    'Card Accepted',
    'Cash Only',
    'Contactless Payment',
    // Accessibility
    'Elevator Access',
    'Ramp Access',
    'Accessible Restrooms',
  ];

  @override
  void initState() {
    super.initState();
    _selectedFilters = Set<String>.from(widget.selectedFilters);
  }


  List<String> _getAllAvailableTags() {
    return [
      ..._vibeFilters,
      ..._offeringsFilters,
      ..._amenitiesFilters,
    ];
  }

  List<String> _getAvailableTagsForAutocomplete(String query) {
    // Only show options after user starts typing
    if (query.isEmpty) {
      return [];
    }
    
    final allTags = _getAllAvailableTags();
    final availableTags = allTags.where((tag) => !_selectedFilters.contains(tag)).toList();
    
    final lowerQuery = query.toLowerCase();
    return availableTags.where((tag) => tag.toLowerCase().contains(lowerQuery)).toList();
  }



  void _toggleFilter(String filter) {
    setState(() {
      if (_selectedFilters.contains(filter)) {
        _selectedFilters.remove(filter);
      } else {
        _selectedFilters.add(filter);
      }
    });
    widget.onFiltersChanged(_selectedFilters);
  }

  List<String> _getOrderedFilters(List<String> filters) {
    final selected = filters.where((f) => _selectedFilters.contains(f)).toList();
    final unselected = filters.where((f) => !_selectedFilters.contains(f)).toList();
    return [...selected, ...unselected];
  }

  Widget _buildSummarySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Date and Location info
        // Add keywords search bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Autocomplete<String>(
            optionsBuilder: (textEditingValue) {
              return _getAvailableTagsForAutocomplete(textEditingValue.text);
            },
            onSelected: (tag) {
              _toggleFilter(tag);
              // Clear the text field after selection
              _keywordController?.clear();
            },
            fieldViewBuilder: (
              context,
              textEditingController,
              focusNode,
              onFieldSubmitted,
            ) {
              // Store reference to the controller so we can clear it in onSelected
              _keywordController = textEditingController;
              return TextField(
                controller: textEditingController,
                focusNode: focusNode,
                decoration: InputDecoration(
                  hintText: 'Add keywords...',
                  prefixIcon: const Icon(Icons.search, size: 20),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(100), // Fully rounded
                    borderSide: BorderSide.none,
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(100),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(100),
                    borderSide: BorderSide.none,
                  ),
                  filled: true,
                  fillColor: Theme.of(context).colorScheme.surface,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  suffixIcon: textEditingController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            textEditingController.clear();
                            setState(() {});
                          },
                        )
                      : null,
                ),
                style: const TextStyle(fontSize: 14),
                onChanged: (value) {
                  setState(() {});
                },
              );
            },
            optionsViewBuilder: (context, onSelected, options) {
              if (options.isEmpty) {
                return const SizedBox.shrink();
              }
              return Align(
                alignment: Alignment.topLeft,
                child: Material(
                  elevation: 4,
                  borderRadius: BorderRadius.circular(12),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 200),
                    child: ListView.builder(
                      shrinkWrap: true,
                      padding: const EdgeInsets.all(8),
                      itemCount: options.length,
                      itemBuilder: (context, index) {
                        final tag = options.elementAt(index);
                        return ListTile(
                          dense: true,
                          title: Text(tag),
                          onTap: () {
                            onSelected(tag);
                          },
                        );
                      },
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        // Selected filters
        if (_selectedFilters.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _selectedFilters.toList().map((filter) {
                return FilterChip(
                  label: Text(
                    filter,
                    style: const TextStyle(fontSize: 12),
                  ),
                  selected: true,
                  onSelected: (_) => _toggleFilter(filter),
                  selectedColor: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                  showCheckmark: false,
                  deleteIcon: Icon(
                    Icons.close,
                    size: 18,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  onDeleted: () => _toggleFilter(filter),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                  labelStyle: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }


  Widget _buildFilterSection({
    required String title,
    required List<String> filters,
    required bool isExpanded,
    required Function(bool) onExpansionChanged,
  }) {
    final orderedFilters = _getOrderedFilters(filters);
    final selectedCount = orderedFilters.where((f) => _selectedFilters.contains(f)).length;
    
    return ExpansionTile(
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (!isExpanded && selectedCount > 0) ...[
            const SizedBox(height: 4),
            Text(
              '$selectedCount selected',
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
      initiallyExpanded: isExpanded,
      onExpansionChanged: onExpansionChanged,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: orderedFilters.map((filter) {
              final isSelected = _selectedFilters.contains(filter);
              
              return FilterChip(
                label: Text(
                  filter,
                  style: const TextStyle(fontSize: 12),
                ),
                selected: isSelected,
                onSelected: (_) => _toggleFilter(filter),
                selectedColor: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                showCheckmark: false,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                labelStyle: TextStyle(
                  color: isSelected
                      ? Theme.of(context).colorScheme.primary
                      : Theme.of(context).textTheme.bodyLarge?.color,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      width: MediaQuery.of(context).size.width * 0.85, // Cover 85% of screen
      child: SafeArea(
        child: Column(
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
                          'Refine',
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
              // Filter Sections
              Expanded(
                child: ListView(
                  children: [
                    _buildSummarySection(),
                    _buildFilterSection(
                      title: 'Vibe / Atmosphere',
                      filters: _vibeFilters,
                      isExpanded: _isVibeExpanded,
                      onExpansionChanged: (expanded) {
                        setState(() {
                          _isVibeExpanded = expanded;
                        });
                      },
                    ),
                    _buildFilterSection(
                      title: 'Offerings / Cuisine / Drinks',
                      filters: _offeringsFilters,
                      isExpanded: _isOfferingsExpanded,
                      onExpansionChanged: (expanded) {
                        setState(() {
                          _isOfferingsExpanded = expanded;
                        });
                      },
                    ),
                    _buildFilterSection(
                      title: 'Amenities / Features',
                      filters: _amenitiesFilters,
                      isExpanded: _isAmenitiesExpanded,
                      onExpansionChanged: (expanded) {
                        setState(() {
                          _isAmenitiesExpanded = expanded;
                        });
                      },
                    ),
                  ],
                ),
              ),
              
              // Footer with clear button
              if (_selectedFilters.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {
                        setState(() {
                          _selectedFilters.clear();
                        });
                        widget.onFiltersChanged(_selectedFilters);
                      },
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Clear All Filters'),
                    ),
                  ),
                ),
          ],
        ),
      ),
    );
  }
}
