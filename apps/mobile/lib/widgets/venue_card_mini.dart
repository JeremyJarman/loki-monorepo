import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/venue_model.dart';
import '../screens/explore_screen.dart';

class VenueCardMini extends StatelessWidget {
  final VenueModel venue;
  final dynamic userPosition; // Kept for API compatibility; no longer used for distance
  final String? listId;
  final VoidCallback? onRemove;

  const VenueCardMini({
    super.key,
    required this.venue,
    this.userPosition,
    this.listId,
    this.onRemove,
  });

  void _navigateToExplore(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ExploreScreen(
          initialVenue: venue,
          listId: listId,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = venue.imageUrls.isNotEmpty && venue.imageUrls.first.isNotEmpty
        ? venue.imageUrls.first
        : null;
    const radius = 12.0;

    return InkWell(
      onTap: () => _navigateToExplore(context),
      borderRadius: BorderRadius.circular(radius),
      child: Stack(
        children: [
          // Transparent background so parent gradient shows through; rounded corners on all sides
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              color: Colors.transparent,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Square image (1:1), all corners rounded
                ClipRRect(
                  borderRadius: BorderRadius.circular(radius),
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: imageUrl != null
                        ? CachedNetworkImage(
                            imageUrl: imageUrl,
                            fit: BoxFit.cover,
                            width: double.infinity,
                            placeholder: (context, url) => Container(
                              color: Theme.of(context).colorScheme.surface,
                              child: const Center(child: CircularProgressIndicator()),
                            ),
                            errorWidget: (context, url, error) => Container(
                              color: Theme.of(context).colorScheme.surface,
                              child: Center(
                                child: Icon(Icons.restaurant, color: Theme.of(context).colorScheme.primary, size: 32),
                              ),
                            ),
                          )
                        : Container(
                            color: Theme.of(context).colorScheme.surface,
                            child: Center(
                              child: Icon(Icons.restaurant, color: Theme.of(context).colorScheme.primary, size: 32),
                            ),
                          ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(10, 10, 10, 12),
                  child: Text(
                    venue.name,
                    style: GoogleFonts.crimsonText(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).brightness == Brightness.dark
                          ? Colors.white
                          : const Color(0xFF333333),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          if (onRemove != null)
            Positioned(
              top: 8,
              right: 8,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onRemove,
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.9),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.remove, color: Colors.white, size: 20),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
