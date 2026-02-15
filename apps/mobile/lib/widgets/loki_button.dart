import 'package:flutter/material.dart';

/// Shared action button style across the app (profile, list detail, etc.).
/// Outlined, bold primary text color, pill shape, no icon.
/// Border: secondary text color in dark mode, subtle grey in light.
class LokiButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final String label;

  const LokiButton({
    super.key,
    required this.onPressed,
    required this.label,
  });

  /// Shared style values used by LokiButton (and optionally by screens that build rows of them).
  static EdgeInsets get padding => const EdgeInsets.symmetric(horizontal: 10, vertical: 8);

  static OutlinedBorder get shape => RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(100),
      );

  static TextStyle labelStyle(BuildContext context) {
    final textColor = Theme.of(context).textTheme.bodyLarge?.color ??
        Theme.of(context).colorScheme.onSurface;
    return TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.bold,
      color: textColor,
    );
  }

  static ButtonStyle style(BuildContext context) {
    final textColor = Theme.of(context).textTheme.bodyLarge?.color ??
        Theme.of(context).colorScheme.onSurface;
    final borderColor = Theme.of(context).textTheme.bodySmall?.color ?? Colors.grey;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final side = BorderSide(
      color: isDark ? borderColor : Colors.grey.withOpacity(0.4),
      width: 1,
    );
    return OutlinedButton.styleFrom(
      padding: padding,
      shape: shape,
      side: side,
      foregroundColor: textColor,
    );
  }

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: style(context),
      child: Text(label, style: labelStyle(context)),
    );
  }
}
