import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import '../models/experience_instance_model.dart';
import '../models/experience_model.dart';
import '../models/venue_model.dart';
import '../screens/venue_profile_screen.dart';

class ExperienceInstanceCard extends StatefulWidget {
  final ExperienceInstanceModel instance;
  final ExperienceModel? experience; // Optional - fetched separately
  final VenueModel? venue; // Optional - fetched separately
  final Position? userPosition; // Optional - for venue navigation

  const ExperienceInstanceCard({
    super.key,
    required this.instance,
    this.experience,
    this.venue,
    this.userPosition,
  });

  @override
  State<ExperienceInstanceCard> createState() => _ExperienceInstanceCardState();
}

class _ExperienceInstanceCardState extends State<ExperienceInstanceCard> {
  bool _isDescriptionExpanded = false;

  Widget _buildNoImagePlaceholder() {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: const Center(
        child: Icon(Icons.image_not_supported_outlined, size: 48),
      ),
    );
  }

  String _formatDateTime() {
    final startDate = widget.instance.startAt.toDate();
    final endDate = widget.instance.endAt.toDate();
    final dateFormat = DateFormat('MMM d, yyyy');
    final timeFormat = DateFormat('h:mm a');

    // If same day, show: "Jan 15, 2024 at 8:00 PM - 11:00 PM"
    if (dateFormat.format(startDate) == dateFormat.format(endDate)) {
      return '${dateFormat.format(startDate)} at ${timeFormat.format(startDate)} - ${timeFormat.format(endDate)}';
    }
    // If different days, show: "Jan 15, 2024 at 8:00 PM - Jan 16, 2024 at 11:00 PM"
    return '${dateFormat.format(startDate)} at ${timeFormat.format(startDate)} - ${dateFormat.format(endDate)} at ${timeFormat.format(endDate)}';
  }

  void _navigateToVenueProfile() {
    if (widget.venue != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => VenueProfileScreen(
            venue: widget.venue!,
            userPosition: widget.userPosition,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = widget.experience?.imageUrl;
    final description = widget.experience?.description ?? '';
    final cost = widget.experience?.cost;

    // Debug logging
    if (kDebugMode) {
      debugPrint('ExperienceInstanceCard[${widget.instance.instanceId}]: experience=${widget.experience?.experienceId}, imageUrl=$imageUrl');
    }

    return Card(
      margin: EdgeInsets.zero,
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Type Badge
          if (widget.instance.type == 'special')
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.orange.shade100,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Row(
                children: [
                  Icon(Icons.local_offer, size: 16, color: Colors.orange.shade800),
                  const SizedBox(width: 6),
                  Text(
                    'Special',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange.shade800,
                    ),
                  ),
                ],
              ),
            ),

          // Image
          ClipRRect(
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(widget.instance.type == 'special' ? 0 : 12),
              bottom: const Radius.circular(0),
            ),
            child: Builder(
              builder: (context) {
                final hasValidImage = imageUrl != null && imageUrl.isNotEmpty && imageUrl.trim().isNotEmpty;
                final experienceId = widget.experience?.experienceId ?? 'no_exp';
                
                if (hasValidImage) {
                  // imageUrl is guaranteed to be non-null here due to hasValidImage check
                  return CachedNetworkImage(
                    key: ValueKey('event_img_${widget.instance.instanceId}_${experienceId}_${imageUrl.hashCode}'),
                    imageUrl: imageUrl,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    height: 200,
                    placeholder: (context, url) {
                      if (kDebugMode) {
                        debugPrint('ExperienceInstanceCard[${widget.instance.instanceId}]: Loading image from $url');
                      }
                      return _buildNoImagePlaceholder();
                    },
                    errorWidget: (context, url, error) {
                      if (kDebugMode) {
                        debugPrint('ExperienceInstanceCard[${widget.instance.instanceId}]: Error loading image from $url: $error');
                      }
                      return _buildNoImagePlaceholder();
                    },
                  );
                } else {
                  return _buildNoImagePlaceholder();
                }
              },
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                Text(
                  widget.instance.title,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),

                // Venue Name (if available) - White, bold, clickable, larger
                if (widget.venue != null) ...[
                  InkWell(
                    onTap: _navigateToVenueProfile,
                    child: Text(
                      widget.venue!.name,
                      style: const TextStyle(
                        fontSize: 18,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                // Date and Time
                Text(
                  _formatDateTime(),
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).textTheme.bodySmall?.color,
                    fontWeight: FontWeight.w500,
                  ),
                ),

                // Cost
                const SizedBox(height: 8),
                Text(
                  cost != null ? '€${widget.experience?.costDisplay ?? cost}' : 'Free',
                  style: TextStyle(
                    fontSize: 14,
                    color: Theme.of(context).textTheme.bodySmall?.color,
                    fontWeight: FontWeight.w500,
                  ),
                ),

                // Description with expand/collapse
                if (description.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      // Create a TextPainter to measure if text exceeds 3 lines
                      final textPainter = TextPainter(
                        text: TextSpan(
                          text: description,
                          style: TextStyle(
                            fontSize: 14,
                            color: Theme.of(context).textTheme.bodySmall?.color,
                          ),
                        ),
                        maxLines: 3,
                        textDirection: Directionality.of(context),
                      );
                      textPainter.layout(maxWidth: constraints.maxWidth);
                      final exceedsMaxLines = textPainter.didExceedMaxLines;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            description,
                            style: TextStyle(
                              fontSize: 14,
                              color: Theme.of(context).textTheme.bodySmall?.color,
                            ),
                            maxLines: _isDescriptionExpanded ? null : 3,
                            overflow: _isDescriptionExpanded ? TextOverflow.visible : TextOverflow.ellipsis,
                          ),
                          if (exceedsMaxLines) ...[
                            const SizedBox(height: 4),
                            InkWell(
                              onTap: () {
                                setState(() {
                                  _isDescriptionExpanded = !_isDescriptionExpanded;
                                });
                              },
                              child: Text(
                                _isDescriptionExpanded ? 'See less' : 'See more',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Theme.of(context).colorScheme.primary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ],
                      );
                    },
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
