import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../models/experience_instance_model.dart';
import '../models/experience_model.dart';
import '../models/venue_model.dart';
import '../screens/event_detail_screen.dart';
import '../services/firestore_service.dart';

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
  final FirestoreService _firestoreService = FirestoreService();

  double _responsiveFont({
    required double base,
    required double scale,
    required double min,
    required double max,
  }) {
    return (base * scale).clamp(min, max);
  }

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
    final screenWidth = MediaQuery.sizeOf(context).width;
    final fontScale = ((screenWidth - 320) / 110).clamp(0.88, 1.06);
    final titleFontSize = _responsiveFont(
      base: 17,
      scale: fontScale,
      min: 15,
      max: 18,
    );
    final bodyFontSize = _responsiveFont(
      base: 14,
      scale: fontScale,
      min: 12.5,
      max: 14.5,
    );
    final metaCountFontSize = _responsiveFont(
      base: 13,
      scale: fontScale,
      min: 11.5,
      max: 13.5,
    );
    final pillFontSize = _responsiveFont(
      base: 11,
      scale: fontScale,
      min: 10,
      max: 11.5,
    );
    
    // Use venue imageUrls as fallback if experience has no image
    String? finalImageUrl = imageUrl;
    if ((finalImageUrl == null || finalImageUrl.isEmpty) && 
        widget.venue != null && 
        widget.venue!.imageUrls.isNotEmpty) {
      finalImageUrl = widget.venue!.imageUrls.first;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => EventDetailScreen(
                  instance: widget.instance,
                  experience: widget.experience,
                  venue: widget.venue,
                ),
              ),
            );
          },
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Theme.of(context).dividerColor,
                width: 1,
              ),
            ),
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
                    fontSize: titleFontSize,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).textTheme.titleMedium?.color,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                
                // Venue name (if showVenueName is true and venue is provided)
                if (widget.showVenueName && widget.venue != null) ...[
                  Text(
                    widget.venue!.name,
                    style: TextStyle(
                      fontSize: bodyFontSize,
                      color: Theme.of(context).textTheme.bodySmall?.color,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                ],
                
                // Date and time
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${_formatSimplifiedDate()} \u2022 ${_formatStartTime()}',
                        style: TextStyle(
                          fontSize: bodyFontSize,
                          color: Theme.of(context).textTheme.bodySmall?.color,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 10),
                    StreamBuilder<int>(
                      stream: _firestoreService
                          .getEventCommentCountStream(widget.instance.instanceId),
                      builder: (context, snapshot) {
                        final count = snapshot.data ?? 0;
                        return Row(
                          children: [
                            Icon(
                              Icons.chat_bubble_outline,
                              size: bodyFontSize,
                              color: Theme.of(context).textTheme.bodySmall?.color,
                            ),
                            const SizedBox(width: 3),
                            Text(
                              '$count',
                              style: TextStyle(
                                fontSize: metaCountFontSize,
                                color: Theme.of(context).textTheme.bodySmall?.color,
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
                
                // Cost
                const SizedBox(height: 4),
                Text(
                  cost != null ? _formatPrice(cost) : 'Free',
                  style: TextStyle(
                    fontSize: bodyFontSize,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),

                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    if ((widget.experience?.genre ?? '').trim().isNotEmpty)
                      _MetaPill(
                        label: widget.experience!.genre!.trim(),
                        fontSize: pillFontSize,
                      ),
                    if (widget.experience?.bookingRequired == true)
                      _MetaPill(
                        label: 'Booking required',
                        fontSize: pillFontSize,
                      ),
                    _MetaPill(
                      label: 'View details',
                      fontSize: pillFontSize,
                    ),
                  ],
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
                            fontSize: bodyFontSize,
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
                              fontSize: bodyFontSize,
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
                                  fontSize: bodyFontSize,
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
          ),
        ),
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  final String label;
  final double fontSize;
  const _MetaPill({
    required this.label,
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          color: Theme.of(context).textTheme.bodySmall?.color,
        ),
      ),
    );
  }
}
