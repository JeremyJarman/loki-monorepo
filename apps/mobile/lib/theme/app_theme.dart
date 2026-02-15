import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'loki_tokens.dart';

class AppTheme {
  /// Base text theme using design-system fonts (DM Sans body, Crimson Text for display/headline).
  static TextTheme _textTheme({
    required Color primaryColor,
    required Color secondaryColor,
  }) {
    final base = GoogleFonts.dmSansTextTheme();
    final heading = GoogleFonts.crimsonTextTextTheme();
    return TextTheme(
      displayLarge: heading.displayLarge?.copyWith(color: primaryColor),
      displayMedium: heading.displayMedium?.copyWith(color: primaryColor),
      displaySmall: heading.displaySmall?.copyWith(color: primaryColor),
      headlineLarge: heading.headlineLarge?.copyWith(color: primaryColor),
      headlineMedium: heading.headlineMedium?.copyWith(color: primaryColor),
      headlineSmall: heading.headlineSmall?.copyWith(color: primaryColor),
      titleLarge: base.titleLarge?.copyWith(color: primaryColor),
      titleMedium: base.titleMedium?.copyWith(color: primaryColor),
      titleSmall: base.titleSmall?.copyWith(color: primaryColor),
      bodyLarge: base.bodyLarge?.copyWith(color: primaryColor),
      bodyMedium: base.bodyMedium?.copyWith(color: primaryColor),
      bodySmall: base.bodySmall?.copyWith(color: secondaryColor),
      labelLarge: base.labelLarge?.copyWith(color: primaryColor),
      labelMedium: base.labelMedium?.copyWith(color: secondaryColor),
      labelSmall: base.labelSmall?.copyWith(color: secondaryColor),
    );
  }

  /// Light theme — design-system primary (gold) on light background.
  /// Uses landing-style warm tint (Problem section: primary/5 to secondary/5).
  static const Color _lightScaffoldTint = Color(0xFFFDF8F6); // Warm pinkish/peach from landing Problem section

  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.light(
      primary: LokiTokens.colorPrimary,
      onPrimary: LokiTokens.colorPrimaryForeground,
      secondary: LokiTokens.colorSecondary,
      onSecondary: LokiTokens.colorPrimaryForeground,
      surface: _lightScaffoldTint,
      onSurface: LokiTokens.colorBackground,
      error: LokiTokens.colorError,
      onError: Colors.white,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: _lightScaffoldTint,
      appBarTheme: AppBarTheme(
        backgroundColor: _lightScaffoldTint,
        foregroundColor: const Color(0xFF333333),
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(LokiTokens.radiusLg),
        ),
      ),
      dividerColor: LokiTokens.colorTextMuted,
      textTheme: _textTheme(
        primaryColor: LokiTokens.colorBackground,
        secondaryColor: LokiTokens.colorTextMuted,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: LokiTokens.colorPrimary,
          foregroundColor: LokiTokens.colorPrimaryForeground,
          elevation: 2,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(100),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: LokiTokens.colorPrimary,
          side: const BorderSide(color: LokiTokens.colorPrimary),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(100),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: LokiTokens.colorPrimary,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(100),
          ),
        ),
      ),
    );
  }

  /// Default theme — LOKI design-system dark (gold on dark).
  static ThemeData get defaultTheme {
    return _darkThemeFromTokens();
  }

  /// Dark theme — same as default (design-system dark).
  static ThemeData get darkTheme {
    return _darkThemeFromTokens();
  }

  static ThemeData _darkThemeFromTokens() {
    final colorScheme = ColorScheme.dark(
      primary: LokiTokens.colorPrimary,
      onPrimary: LokiTokens.colorPrimaryForeground,
      secondary: LokiTokens.colorSecondary,
      onSecondary: LokiTokens.colorSecondaryForeground,
      surface: LokiTokens.colorBackground,
      onSurface: LokiTokens.colorTextPrimary,
      error: LokiTokens.colorError,
      onError: Colors.white,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      appBarTheme: AppBarTheme(
        backgroundColor: LokiTokens.colorBackground,
        foregroundColor: LokiTokens.colorTextPrimary,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: LokiTokens.colorBackgroundElevated,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(LokiTokens.radiusLg),
        ),
      ),
      dividerColor: LokiTokens.colorTextMuted,
      textTheme: _textTheme(
        primaryColor: LokiTokens.colorTextPrimary,
        secondaryColor: LokiTokens.colorTextSecondary,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: LokiTokens.colorPrimary,
          foregroundColor: LokiTokens.colorPrimaryForeground,
          elevation: 2,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(100),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: LokiTokens.colorPrimary,
          side: const BorderSide(color: LokiTokens.colorPrimary),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(100),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: LokiTokens.colorPrimary,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(100),
          ),
        ),
      ),
    );
  }
}
