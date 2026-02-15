import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

class ResponsiveLayout extends StatelessWidget {
  final Widget child;
  final double maxWidth;
  final EdgeInsets? padding;

  const ResponsiveLayout({
    super.key,
    required this.child,
    this.maxWidth = 1200,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    // On web, center content with max-width constraint
    if (kIsWeb) {
      return Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: Padding(
            padding: padding ?? const EdgeInsets.symmetric(horizontal: 24),
            child: child,
          ),
        ),
      );
    }
    
    // On mobile, use full width with padding
    return Padding(
      padding: padding ?? EdgeInsets.zero,
      child: child,
    );
  }
}

class ResponsivePadding extends StatelessWidget {
  final Widget child;
  final EdgeInsets mobilePadding;
  final EdgeInsets webPadding;

  const ResponsivePadding({
    super.key,
    required this.child,
    this.mobilePadding = const EdgeInsets.symmetric(horizontal: 16),
    this.webPadding = const EdgeInsets.symmetric(horizontal: 24),
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: kIsWeb ? webPadding : mobilePadding,
      child: child,
    );
  }
}

// Helper to get responsive card width for grids
double getResponsiveCardWidth(BuildContext context, {int columns = 2}) {
  if (kIsWeb) {
    final screenWidth = MediaQuery.of(context).size.width;
    final maxContentWidth = 1200.0;
    final padding = 48.0; // 24px on each side
    final availableWidth = screenWidth > maxContentWidth 
        ? maxContentWidth - padding 
        : screenWidth - padding;
    final spacing = 16.0 * (columns - 1);
    return (availableWidth - spacing) / columns;
  }
  return MediaQuery.of(context).size.width;
}

// Helper to determine if we should use grid layout
bool shouldUseGridLayout(BuildContext context) {
  if (kIsWeb) {
    final width = MediaQuery.of(context).size.width;
    return width > 800; // Use grid on screens wider than 800px
  }
  return false;
}
