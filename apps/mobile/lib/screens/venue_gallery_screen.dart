import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/venue_model.dart';

/// Full-screen gallery of venue images and food images for a venue.
class VenueGalleryScreen extends StatelessWidget {
  final VenueModel venue;

  const VenueGalleryScreen({
    super.key,
    required this.venue,
  });

  @override
  Widget build(BuildContext context) {
    final venueImages = venue.imageUrls;
    final foodImages = venue.foodImageUrls;
    final allImages = <String>[];
    if (venueImages.isNotEmpty) {
      allImages.addAll(venueImages);
    }
    if (foodImages.isNotEmpty) {
      allImages.addAll(foodImages);
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('${venue.name} – Gallery'),
        backgroundColor: Theme.of(context).colorScheme.surface,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
      ),
      body: allImages.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'No images available for this venue.',
                  style: TextStyle(
                    fontSize: 16,
                    color: Theme.of(context).textTheme.bodyLarge?.color,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          : GridView.builder(
              padding: const EdgeInsets.all(12),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 0.85,
              ),
              itemCount: allImages.length,
              itemBuilder: (context, index) {
                final url = allImages[index];
                return ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CachedNetworkImage(
                    imageUrl: url,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: Colors.grey[300],
                      child: const Center(child: CircularProgressIndicator()),
                    ),
                    errorWidget: (context, url, error) => Container(
                      color: Colors.grey[300],
                      child: const Icon(Icons.broken_image_outlined, size: 48),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
