import 'package:flutter/material.dart';

import 'loki_tokens.dart';

/// Centralized color system — now backed by LOKI design-system tokens.
/// All app colors map to [LokiTokens] for consistency with admin and landing.
/// Prefer using [LokiTokens] or [Theme.of(context).colorScheme] in new code.
class AppColors {
  AppColors._();

  // Primary — design-system gold
  static const Color primary = LokiTokens.colorPrimary;
  static const Color primaryDark = LokiTokens.colorPrimaryMuted;
  static const Color primaryLight = LokiTokens.colorAccent;
  static const Color primaryDefault = LokiTokens.colorPrimary;

  // Secondary
  static const Color secondary = LokiTokens.colorSecondary;
  static const Color secondaryDark = LokiTokens.colorSecondaryMuted;
  static const Color secondaryLight = LokiTokens.colorSecondaryForeground;

  // Semantic
  static const Color accent = LokiTokens.colorAccent;
  static const Color success = LokiTokens.colorSuccess;
  static const Color warning = LokiTokens.colorAccentMuted;
  static const Color error = LokiTokens.colorError;

  // Backgrounds — design-system dark
  static const Color backgroundLight = LokiTokens.colorSecondaryForeground;
  static const Color backgroundDark = LokiTokens.colorBackgroundOverlay;
  static const Color backgroundDarkBlack = LokiTokens.colorBackground;
  static const Color backgroundDefault = LokiTokens.colorBackground;
  static const Color surfaceLight = LokiTokens.colorSecondaryForeground;
  static const Color surfaceDark = LokiTokens.colorBackgroundOverlay;
  static const Color surfaceDefault = LokiTokens.colorBackground;

  // Text
  static const Color textPrimaryLight = LokiTokens.colorBackground;
  static const Color textSecondaryLight = LokiTokens.colorTextMuted;
  static const Color textPrimaryDark = LokiTokens.colorTextPrimary;
  static const Color textSecondaryDark = LokiTokens.colorTextSecondary;
  static const Color textPrimaryDefault = LokiTokens.colorTextPrimary;
  static const Color textSecondaryDefault = LokiTokens.colorTextSecondary;

  // Borders / dividers
  static const Color borderLight = LokiTokens.colorTextMuted;
  static const Color borderDark = LokiTokens.colorTextMuted;
  static const Color borderDefault = LokiTokens.colorPrimary;
  static const Color dividerLight = LokiTokens.colorTextMuted;
  static const Color dividerDark = LokiTokens.colorTextMuted;
  static const Color dividerDefault = LokiTokens.colorPrimary;

  // Cards
  static const Color cardLight = LokiTokens.colorSecondaryForeground;
  static const Color cardDark = LokiTokens.colorBackground;
  static const Color cardDefault = LokiTokens.colorBackground;
  static const Color cardMiniDefault = LokiTokens.colorBackgroundElevated;
}
