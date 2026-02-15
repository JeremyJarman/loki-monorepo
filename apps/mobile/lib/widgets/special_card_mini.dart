import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/experience_instance_model.dart';
import '../models/experience_model.dart';
import '../models/venue_model.dart';
import '../screens/venue_profile_screen.dart';

/// Special card: image (rounded bottom corners, venue name + YRW overlays), title + cost,
/// description (secondary text), divider, Menu and Gallery buttons (venue-display style).
class SpecialCardMini extends StatefulWidget {
  final ExperienceInstanceModel instance;
  final ExperienceModel? experience;
  final VenueModel? venue;
  final Position? userPosition;
  final bool showVenueName;

  const SpecialCardMini({
    super.key,
    required this.instance,
    this.experience,
    this.venue,
    this.userPosition,
    this.showVenueName = true,
  });

  @override
  State<SpecialCardMini> createState() => _SpecialCardMiniState();
}

class _SpecialCardMiniState extends State<SpecialCardMini> {
  static String _currencySymbolFor(String? code) {
    if (code == null || code.isEmpty) return '€';
    switch (code.toUpperCase()) {
      case 'EUR': return '€';
      case 'USD': return '\$';
      case 'GBP': return '£';
      case 'CZK': return 'Kč';
      case 'HUF': return 'Ft';
      default: return '€';
    }
  }

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
    String? finalImageUrl = imageUrl;
    if ((finalImageUrl == null || finalImageUrl.isEmpty) &&
        widget.venue != null &&
        widget.venue!.imageUrls.isNotEmpty) {
      finalImageUrl = widget.venue!.imageUrls.first;
    }
    final hasValidImage = finalImageUrl != null && finalImageUrl.isNotEmpty;

    final cost = widget.experience?.cost;
    final hasCost = cost != null && cost > 0;
    final currencySymbol = _currencySymbolFor(widget.venue?.currency);
    final costDisplay = hasCost
        ? (cost is int ? '$currencySymbol$cost' : '$currencySymbol${cost.toStringAsFixed(2)}') + (widget.experience?.costPerPerson == true ? ' pp' : '')
        : null;

    const double cornerRadius = 12;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Material(
        color: Colors.transparent,
        elevation: 4,
        shadowColor: Colors.black.withOpacity(0.25),
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
          borderRadius: BorderRadius.circular(cornerRadius),
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
                      clipBehavior: Clip.none,
                      children: [
                      // Frame behind the image (matches card content background)
                      Container(
                        decoration: BoxDecoration(
                          color: Theme.of(context).brightness == Brightness.dark
                              ? const Color(0xFF121212)
                              : Colors.white,
                          borderRadius: BorderRadius.only(
                            topLeft: Radius.circular(cornerRadius),
                            topRight: Radius.circular(cornerRadius),
                          ),
                        ),
                      ),
                      // Image with rounded bottom corners on top of white
                      Positioned(
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        child: ClipRRect(
                          borderRadius: const BorderRadius.only(
                            bottomLeft: Radius.circular(cornerRadius),
                            bottomRight: Radius.circular(cornerRadius),
                          ),
                          child: hasValidImage
                              ? CachedNetworkImage(
                                  imageUrl: finalImageUrl,
                                  fit: BoxFit.cover,
                                  placeholder: (context, url) => _buildLoadingPlaceholder(),
                                  errorWidget: (context, url, error) => _buildLoadingPlaceholder(),
                                )
                              : _buildLoadingPlaceholder(),
                        ),
                      ),
                      if (widget.showVenueName)
                        Positioned(
                          left: 0,
                          right: 0,
                          bottom: 0,
                          child: Container(
                            height: 56,
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
                            padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
                            alignment: Alignment.bottomLeft,
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
                      // YRW logo in top-right corner
                      if (widget.experience?.tags != null &&
                          widget.experience!.tags!.contains('YRW2026'))
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Image.asset(
                            'assets/images/logos/YRW_logo.png',
                            width: 48,
                            height: 48,
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
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Expanded(
                                child: Text(
                                  widget.instance.title,
                                  style: GoogleFonts.dmSans(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: primaryTextColor,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (costDisplay != null) ...[
                                const SizedBox(width: 8),
                                Text(
                                  costDisplay,
                                  style: GoogleFonts.dmSans(
                                    fontSize: 18,
                                    fontWeight: FontWeight.normal,
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
                                    fontSize: 14,
                                    color: secondaryTextColor,
                                    height: 1.4,
                                  ),
                            ),
                          ],
                          const SizedBox(height: 8),
                          Text(
                            'Available: Mon–Fri 12–5pm',
                            style: GoogleFonts.dmSans(
                              fontSize: 12,
                              color: secondaryTextColor,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '1.3km away • Closes 9:30pm',
                            style: GoogleFonts.dmSans(
                              fontSize: 11,
                              color: secondaryTextColor,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            child: Divider(
                              height: 1,
                              color: dividerColor,
                              thickness: 1,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              _SpecialMiniDemoAction(icon: Icons.bookmark_border, onTap: () {}),
                              const SizedBox(width: 6),
                              _SpecialMiniDemoAction(icon: Icons.share_outlined, onTap: () {}),
                              const SizedBox(width: 6),
                              Expanded(
                                child: _SpecialMiniDemoAction(
                                  icon: Icons.restaurant_menu_outlined,
                                  label: 'Menu',
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
                                  size: 12,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                                style: IconButton.styleFrom(
                                  backgroundColor: Theme.of(context).colorScheme.primary.withOpacity(0.12),
                                  minimumSize: const Size(32, 32),
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
        ),
      ),
    );
  }
}

/// Compact icon (and optional label) for mini card action row.
class _SpecialMiniDemoAction extends StatelessWidget {
  final IconData icon;
  final String? label;
  final VoidCallback onTap;

  const _SpecialMiniDemoAction({
    required this.icon,
    this.label,
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
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: theme.colorScheme.primary),
              if (label != null) ...[
                const SizedBox(width: 4),
                Text(
                  label!,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
