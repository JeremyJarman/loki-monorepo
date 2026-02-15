enum AppThemeMode {
  defaultTheme, // Green theme (#122220, #26483F)
  light,       // Original blue theme
  dark,         // Dark gray theme (#252427, #373539)
}

extension AppThemeModeExtension on AppThemeMode {
  String get displayName {
    switch (this) {
      case AppThemeMode.defaultTheme:
        return 'Default';
      case AppThemeMode.light:
        return 'Light';
      case AppThemeMode.dark:
        return 'Dark';
    }
  }
}
