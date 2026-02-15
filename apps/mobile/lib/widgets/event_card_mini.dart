import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../models/experience_instance_model.dart';
import '../models/experience_model.dart';
import '../models/venue_model.dart';

class EventCardMini extends StatefulWidget {
  final ExperienceInstanceModel instance;
  final ExperienceModel? experience;
  final VenueModel? venue; // Optional - if provided, will show venue name
  final bool showVenueName; // Whether to show venue name (default: true if venue provided)

  const EventCardMini({
    super.key,
    required this.instance,
    this.experience,
    this.venue,
    this.showVenueName = true,
  });

  @override
  State<EventCardMini> createState() => _EventCardMiniState();
}

class _EventCardMiniState extends State<EventCardMini> {
  bool _isDescriptionExpanded = false;

  Widget _buildNoImagePlaceholder() {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: const Center(
        child: Icon(Icons.image_not_supported_outlined, size: 48),
      ),
    );
  }

  String _formatSimplifiedDate() {
    final startDate = widget.instance.startAt.toDate();
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final startDay = DateTime(startDate.year, startDate.month, startDate.day);
    final tomorrow = today.add(const Duration(days: 1));

    if (startDay == today) {
      return 'Today';
    } else if (startDay == tomorrow) {
      return 'Tomorrow';
    } else {
      // Format as "MMM d" (e.g., "Jan 15") without year
      final dateFormat = DateFormat('MMM d');
      return dateFormat.format(startDate);
    }
  }

  String _formatStartTime() {
    final startDate = widget.instance.startAt.toDate();
    final timeFormat = DateFormat('h:mm a');
    return timeFormat.format(startDate);
  }

  String _formatPrice(num? cost) {
    if (cost == null) return '';
    if (cost is int) {
      return '€$cost';
    } else if (cost is double) {
      return '€${cost.toStringAsFixed(2)}';
    }
    return '€$cost';
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = widget.experience?.imageUrl;
    final description = widget.experience?.description ?? '';
    final cost = widget.experience?.cost;
    
    // Use venue imageUrls as fallback if experience has no image
    String? finalImageUrl = imageUrl;
    if ((finalImageUrl == null || finalImageUrl.isEmpty) && 
        widget.venue != null && 
        widget.venue!.imageUrls.isNotEmpty) {
      finalImageUrl = widget.venue!.imageUrls.first;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image on the left (1:1 aspect ratio)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 100,
                height: 100,
                child: finalImageUrl != null && finalImageUrl.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: finalImageUrl,
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(
                          color: Theme.of(context).colorScheme.surface,
                          child: Center(
                            child: CircularProgressIndicator(
                              color: Theme.of(context).colorScheme.primary,
                              strokeWidth: 2,
                            ),
                          ),
                        ),
                        errorWidget: (context, url, error) => _buildNoImagePlaceholder(),
                      )
                    : _buildNoImagePlaceholder(),
              ),
            ),
          ),
          const SizedBox(width: 12),
          
          // Content on the right
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                Text(
                  widget.instance.title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).textTheme.titleMedium?.color,
                  ),
                ),
                const SizedBox(height: 4),
                
                // Venue name (if showVenueName is true and venue is provided)
                if (widget.showVenueName && widget.venue != null) ...[
                  Text(
                    widget.venue!.name,
                    style: TextStyle(
                      fontSize: 14,
                      color: Theme.of(context).textTheme.bodySmall?.color,
                    ),
                  ),
                  const SizedBox(height: 4),
                ],
                
                // Date and time
                Row(
                  children: [
                    Text(
                      _formatSimplifiedDate(),
                      style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _formatStartTime(),
                      style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                  ],
                ),
                
                // Cost
                const SizedBox(height: 4),
                Text(
                  cost != null ? _formatPrice(cost) : 'Free',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                
                // Description with expand/collapse
                if (description.isNotEmpty) ...[
                  const SizedBox(height: 8),
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
