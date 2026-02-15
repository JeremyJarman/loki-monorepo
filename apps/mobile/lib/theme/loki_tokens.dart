// Design-system tokens (inlined so app works without path dependency).
// Source of truth: packages/loki_design_system or apps/admin/design-system/tokens/
// Regenerate from design-system with: npm run build:tokens (from repo root)

import 'package:flutter/material.dart';

/// LOKI design tokens — premium dark theme.
/// Use these when building [ThemeData] or custom widgets.
abstract class LokiTokens {
  LokiTokens._();

  // --- Colors ---
  static const colorPrimary = Color(0xFFC9A962);
  static const colorPrimaryHover = Color(0xFFD4B872);
  static const colorPrimaryMuted = Color(0xFF8B7355);
  static const colorPrimaryForeground = Color(0xFF0F0E0C);
  static const colorSecondary = Color(0xFF1A1916);
  static const colorSecondaryHover = Color(0xFF252420);
  static const colorSecondaryMuted = Color(0xFF2D2B28);
  static const colorSecondaryForeground = Color(0xFFF5F3EF);
  static const colorAccent = Color(0xFFD4A853);
  static const colorAccentHover = Color(0xFFE0B860);
  static const colorAccentMuted = Color(0xFFA88B45);
  static const colorAccentForeground = Color(0xFF0F0E0C);
  static const colorBackground = Color(0xFF0F0E0C);
  static const colorBackgroundElevated = Color(0xFF1A1916);
  static const colorBackgroundOverlay = Color(0xFF252420);
  static const colorTextPrimary = Color(0xFFF5F3EF);
  static const colorTextSecondary = Color(0xFFA8A29E);
  static const colorTextMuted = Color(0xFF78716C);
  static const colorTextInverse = Color(0xFF0F0E0C);
  static const colorError = Color(0xFFDC2626);
  static const colorErrorMuted = Color(0xFF991B1B);
  static const colorSuccess = Color(0xFF16A34A);
  static const colorSuccessMuted = Color(0xFF15803D);

  // --- Spacing (logical pixels, 16px base) ---
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;

  // --- Border radius (logical pixels) ---
  static const double radiusSm = 4.0;
  static const double radiusMd = 8.0;
  static const double radiusLg = 12.0;

  // --- Breakpoints (min-width in logical pixels) ---
  static const double mobile = 640.0;
  static const double tablet = 1024.0;
  static const double desktop = 1280.0;

  // --- Typography (font family names; use with Google Fonts in app) ---
  static const String fontFamilyHeading = "Crimson Text";
  static const String fontFamilyBody = "DM Sans";
  static const String fontFamilyMono = "Roboto Mono";

  static const Map<String, double> fontSize = {
    "xs": 12,
    "sm": 14,
    "base": 16,
    "lg": 18,
    "xl": 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  };

  static const Map<String, FontWeight> fontWeight = {
    "normal": FontWeight.w400,
    "medium": FontWeight.w500,
    "semibold": FontWeight.w600,
    "bold": FontWeight.w700,
  };

  static const Map<String, double> lineHeight = {
    "tight": 1.25,
    "normal": 1.5,
    "relaxed": 1.625,
    "loose": 2.0,
  };
}
