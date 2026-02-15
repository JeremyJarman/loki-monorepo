import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/experience_instance_model.dart';
import '../models/experience_model.dart';
import '../models/venue_model.dart';
import '../screens/venue_profile_screen.dart';

/// Special card: image (rounded bottom corners, venue name + YRW overlays), title + cost,
/// description (secondary text), divider, Menu and Gallery buttons (venue-display style).
class SpecialCard extends StatefulWidget {
  final ExperienceInstanceModel instance;
  final ExperienceModel? experience;
  final VenueModel? venue;
  final Position? userPosition;

  const SpecialCard({
    super.key,
    required this.instance,
    this.experience,
    this.venue,
    this.userPosition,
  });

  @override
  State<SpecialCard> createState() => _SpecialCardState();
}

class _SpecialCardState extends State<SpecialCard> {
  Widget _buildLoadingPlaceholder() {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Center(
        child: CircularProgressIndicator(
          color: Theme.of(context).colorScheme.primary,
          strokeWidth: 2,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final imageUrl = widget.experience?.imageUrl;
    final venueName = widget.venue?.name ?? 'Venue';
    final description = widget.experience?.description ?? '';

    if (kDebugMode) {
      debugPrint(
          'SpecialCard[${widget.instance.instanceId}]: experience=${widget.experience?.experienceId}, imageUrl=$imageUrl');
    }

    String? finalImageUrl = imageUrl;
    if ((finalImageUrl == null || finalImageUrl.isEmpty || finalImageUrl.trim().isEmpty) &&
        widget.venue != null &&
        widget.venue!.imageUrls.isNotEmpty) {
      finalImageUrl = widget.venue!.imageUrls.first;
    }
    final hasValidImage =
        finalImageUrl != null && finalImageUrl.isNotEmpty && finalImageUrl.trim().isNotEmpty;

    final cost = widget.experience?.cost;
    final hasCost = cost != null && cost > 0;
    final costDisplay = hasCost
        ? (cost is int ? '€$cost' : '€${cost.toStringAsFixed(2)}') + (widget.experience?.costPerPerson == true ? ' pp' : '')
        : null;

    const double cornerRadius = 12;

    return Card(
      margin: EdgeInsets.zero,
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(cornerRadius)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(cornerRadius),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Image section: same layout as venue card (AspectRatio 1.0)
            ClipRRect(
              borderRadius: BorderRadius.circular(cornerRadius),
              child: AspectRatio(
                aspectRatio: 1.0,
                child: Stack(
                  fit: StackFit.expand,
                  clipBehavior: Clip.none, // allow YRW banner to paint so text isn’t clipped
                  children: [
                    Positioned.fill(
                      child: hasValidImage
                          ? CachedNetworkImage(
                              key: ValueKey(
                                  'special_img_${widget.instance.instanceId}_${finalImageUrl.hashCode}'),
                              imageUrl: finalImageUrl,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => _buildLoadingPlaceholder(),
                              errorWidget: (context, url, error) => _buildLoadingPlaceholder(),
                            )
                          : _buildLoadingPlaceholder(),
                    ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.transparent,
                            Colors.black.withOpacity(0.75),
                          ],
                        ),
                      ),
                      child: InkWell(
                        onTap: widget.venue != null
                            ? () {
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
                            : null,
                        child: Text(
                          venueName,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                shadows: const [
                                  Shadow(
                                    offset: Offset(1, 1),
                                    blurRadius: 3,
                                    color: Colors.black54,
                                  ),
                                ],
                              ) ??
                              const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                shadows: [
                                  Shadow(
                                    offset: Offset(1, 1),
                                    blurRadius: 3,
                                    color: Colors.black54,
                                  ),
                                ],
                              ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ),
                  // YRW logo in top-right corner
                  if (widget.experience?.tags != null &&
                      widget.experience!.tags!.contains('YRW2026'))
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Image.asset(
                        'assets/images/logos/YRW_logo.png',
                        width: 56,
                        height: 56,
                        fit: BoxFit.contain,
                      ),
                    ),
                ],
                ),
              ),
            ),
            // Content: flows from image (same card, outer ClipRRect rounds bottom)
            Builder(
              builder: (context) {
                final isDark = Theme.of(context).brightness == Brightness.dark;
                final cardBackground = isDark ? const Color(0xFF121212) : Colors.white;
                final primaryTextColor = isDark ? const Color(0xFFF5F5F5) : Theme.of(context).colorScheme.onSurface;
                final secondaryTextColor = isDark ? const Color(0xFFAEAEAE) : (Theme.of(context).textTheme.bodySmall?.color ?? Theme.of(context).colorScheme.onSurfaceVariant);
                final dividerColor = isDark ? const Color(0xFFAEAEAE) : Theme.of(context).colorScheme.outlineVariant;
                return Container(
                  width: double.infinity,
                  color: cardBackground,
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Expanded(
                            child: Text(
                              widget.instance.title,
                              style: GoogleFonts.crimsonText(
                                fontSize: 20,
                                fontWeight: FontWeight.normal,
                                color: primaryTextColor,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (costDisplay != null) ...[
                            const SizedBox(width: 12),
                            Text(
                              costDisplay,
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (description.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Text(
                          description,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: secondaryTextColor,
                                height: 1.4,
                              ) ??
                              GoogleFonts.dmSans(
                                fontSize: 15,
                                color: secondaryTextColor,
                                height: 1.4,
                              ),
                        ),
                      ],
                      // Demo: availability and distance/closing
                      const SizedBox(height: 10),
                      Text(
                        'Available: Mon–Fri 12–5pm',
                        style: GoogleFonts.dmSans(
                          fontSize: 13,
                          color: secondaryTextColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '1.3km away • Closes 9:30pm',
                        style: GoogleFonts.dmSans(
                          fontSize: 12,
                          color: secondaryTextColor,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Divider(
                          height: 1,
                          color: dividerColor,
                          thickness: 1,
                        ),
                      ),
                      const SizedBox(height: 12),
                      // Action row: Save, Share, View Menu, Open
                      Row(
                        children: [
                          _SpecialDemoAction(
                            icon: Icons.bookmark_border,
                            label: 'Save',
                            onTap: () {},
                          ),
                          const SizedBox(width: 8),
                          _SpecialDemoAction(
                            icon: Icons.share_outlined,
                            label: 'Share',
                            onTap: () {},
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _SpecialDemoAction(
                              icon: Icons.restaurant_menu_outlined,
                              label: 'View Menu',
                              onTap: widget.venue != null
                                  ? () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => VenueProfileScreen(
                                            venue: widget.venue!,
                                            userPosition: widget.userPosition,
                                            initialTabIndex: 1,
                                          ),
                                        ),
                                      );
                                    }
                                  : () {},
                            ),
                          ),
                          const SizedBox(width: 6),
                          IconButton(
                            onPressed: widget.venue != null
                                ? () {
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
                                : null,
                            icon: Icon(
                              Icons.arrow_forward_ios,
                              size: 14,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                            style: IconButton.styleFrom(
                              backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.12),
                              minimumSize: const Size(36, 36),
                              padding: EdgeInsets.zero,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Compact icon+label button for Save / Share / View Menu.
class _SpecialDemoAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _SpecialDemoAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.primary.withOpacity(0.12),
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: theme.colorScheme.primary),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
