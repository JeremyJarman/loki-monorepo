import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/list_model.dart';
import '../models/user_model.dart';
import '../models/venue_model.dart';
import '../screens/list_detail_screen.dart';

class ListCard extends StatelessWidget {
  final ListModel list;
  final UserModel? creator;
  final List<VenueModel>? venues;

  const ListCard({
    super.key,
    required this.list,
    this.creator,
    this.venues,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ListDetailScreen(listId: list.listId),
          ),
        );
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: Theme.of(context).cardColor,
          border: Border.all(
            color: Theme.of(context).colorScheme.primary,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image Display
          _buildImageSection(context),

          // List Info
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                Text(
                  list.name,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).textTheme.titleLarge?.color,
                  ),
                ),
                const SizedBox(height: 8),

                // Description
                if (list.description != null && list.description!.isNotEmpty)
                  Text(
                    list.description!,
                    style: TextStyle(
                      fontSize: 14,
                      color: Theme.of(context).textTheme.bodySmall?.color,
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),

                const SizedBox(height: 12),

                // Created By Tag
                if (creator != null)
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 12,
                        backgroundImage: creator!.profileImageUrl != null
                            ? NetworkImage(creator!.profileImageUrl!)
                            : null,
                        backgroundColor: Theme.of(context).colorScheme.surface,
                        child: creator!.profileImageUrl == null
                            ? Icon(
                                Icons.person,
                                size: 16,
                                color: Theme.of(context).colorScheme.onSurface,
                              )
                            : null,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'By ${creator!.username}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Theme.of(context).textTheme.bodySmall?.color,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildImage(String imageUrl, BuildContext buildContext) {
    if (imageUrl.isEmpty) {
      return Container(
        color: Theme.of(buildContext).colorScheme.surface,
        child: Icon(
          Icons.image,
          color: Theme.of(buildContext).colorScheme.onSurface.withOpacity(0.3),
        ),
      );
    }
    
    return CachedNetworkImage(
      imageUrl: imageUrl,
      fit: BoxFit.cover,
      placeholder: (context, url) => Container(
        color: Theme.of(buildContext).colorScheme.surface,
        child: Center(
          child: CircularProgressIndicator(
            color: Theme.of(buildContext).colorScheme.primary,
            strokeWidth: 2,
          ),
        ),
      ),
      errorWidget: (context, url, error) {
        debugPrint('Error loading list image: $url, error: $error');
        return Container(
          color: Theme.of(buildContext).colorScheme.surface,
          child: Icon(
            Icons.image,
            color: Theme.of(buildContext).colorScheme.onSurface.withOpacity(0.3),
          ),
        );
      },
    );
  }

  Widget _buildImageSection(BuildContext context) {
    // Priority 1: Use list's own image if available
    final listImageUrl = list.imageUrl;
    if (listImageUrl != null && listImageUrl.isNotEmpty && listImageUrl.trim().isNotEmpty) {
      debugPrint('ListCard: Using list imageUrl: $listImageUrl');
      return ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
        child: SizedBox(
          height: 150,
          width: double.infinity,
          child: _buildImage(listImageUrl, context),
        ),
      );
    }
    
    debugPrint('ListCard: No list imageUrl, falling back to venue images. List: ${list.name}, imageUrl: $listImageUrl');

    // Priority 2: Get venue images
    final venueImages = _getVenueImages();

    if (venueImages.isEmpty) {
      // No images available
      return Container(
        height: 150,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
        ),
        child: Icon(
          Icons.list,
          size: 50,
          color: Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
        ),
      );
    }

    // If only one venue, show single image full width
    if (venueImages.length == 1) {
      return ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
        child: SizedBox(
          height: 150,
          width: double.infinity,
          child: _buildImage(venueImages[0], context),
        ),
      );
    }

    // If 2+ venues, show first 2 images in collage
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
      child: SizedBox(
        height: 150,
        width: double.infinity,
        child: Row(
          children: [
            // First image
            Expanded(
              flex: 1,
              child: _buildImage(venueImages[0], context),
            ),
            // Second image
            Container(
              width: 2,
              color: Colors.white,
            ),
            Expanded(
              flex: 1,
              child: _buildImage(venueImages[1], context),
            ),
          ],
        ),
      ),
    );
  }

  List<String> _getVenueImages() {
    if (venues == null || venues!.isEmpty) return [];

    final imageUrls = <String>[];
    for (final venue in venues!) {
      if (venue.imageUrls.isNotEmpty) {
        // Get first non-empty image URL
        final imageUrl = venue.imageUrls.firstWhere(
          (url) => url.isNotEmpty,
          orElse: () => '',
        );
        if (imageUrl.isNotEmpty) {
          imageUrls.add(imageUrl);
          if (imageUrls.length >= 2) break; // Max 2 images for collage
        }
      }
    }

    return imageUrls;
  }
}
