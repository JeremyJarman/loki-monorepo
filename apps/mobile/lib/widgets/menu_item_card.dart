import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class MenuItemCard extends StatefulWidget {
  final String name;
  final String? description;
  final String? imageUrl;
  final num? price; // Can be int or double

  const MenuItemCard({
    super.key,
    required this.name,
    this.description,
    this.imageUrl,
    this.price,
  });

  @override
  State<MenuItemCard> createState() => _MenuItemCardState();
}

class _MenuItemCardState extends State<MenuItemCard> {
  bool _isDescriptionExpanded = false;

  String _formatPrice(num? price) {
    if (price == null) return '';
    if (price is int) {
      return '€$price';
    } else if (price is double) {
      return '€${price.toStringAsFixed(2)}';
    }
    return '€$price';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image on the left (1:1 aspect ratio)
          if (widget.imageUrl != null && widget.imageUrl!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 100,
                  height: 100,
                  child: CachedNetworkImage(
                    imageUrl: widget.imageUrl!,
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
                    errorWidget: (context, url, error) => Container(
                      color: Theme.of(context).colorScheme.surface,
                      child: Icon(
                        Icons.restaurant,
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
                        size: 32,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          if (widget.imageUrl != null && widget.imageUrl!.isNotEmpty)
            const SizedBox(width: 12),
          
          // Content on the right
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Item name
                Text(
                  widget.name,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).textTheme.titleMedium?.color,
                  ),
                ),
                const SizedBox(height: 4),
                
                // Price
                Text(
                  widget.price != null ? _formatPrice(widget.price) : 'not listed',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: widget.price != null
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey,
                  ),
                ),
                
                // Description with expand/collapse
                if (widget.description != null && widget.description!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  LayoutBuilder(
                    builder: (context, constraints) {
                      // Create a TextPainter to measure if text exceeds 3 lines
                      final textPainter = TextPainter(
                        text: TextSpan(
                          text: widget.description,
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
                            widget.description!,
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
