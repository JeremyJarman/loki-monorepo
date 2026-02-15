import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart';
import 'screens/auth_wrapper.dart';
import 'screens/home_screen.dart';
import 'screens/profile_screen.dart';
import 'services/theme_service.dart';
import 'services/app_theme_mode.dart';
import 'theme/app_theme.dart';

void precacheFonts(BuildContext context) {
  // Trigger font load so first on-screen use doesn't jank
  GoogleFonts.crimsonText(fontSize: 14);
  GoogleFonts.dmSans(fontSize: 14);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    // Initialize Firebase using FlutterFire options for all platforms
    // Configuration is stored in firebase_options.dart (not in index.html)
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } catch (e) {
    // Handle Firebase initialization errors
    debugPrint('Firebase initialization error: $e');
    // You might want to show an error screen or use default options
  }
  
  final themeService = ThemeService();
  
  runApp(LokiApp(themeService: themeService));
}

class LokiApp extends StatelessWidget {
  final ThemeService themeService;

  const LokiApp({
    super.key,
    required this.themeService,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: themeService,
      child: Consumer<ThemeService>(
        builder: (context, themeService, child) {
          // Get the appropriate theme based on app theme mode
          ThemeData currentTheme;
          switch (themeService.appThemeMode) {
            case AppThemeMode.defaultTheme:
              currentTheme = AppTheme.defaultTheme;
              break;
            case AppThemeMode.light:
              currentTheme = AppTheme.lightTheme;
              break;
            case AppThemeMode.dark:
              currentTheme = AppTheme.darkTheme;
              break;
          }

          return MaterialApp(
            title: 'LOKI',
            debugShowCheckedModeBanner: false,
            theme: currentTheme,
            home: const AuthWrapper(),
            builder: (context, child) {
              child ??= const SizedBox.shrink();
              // Precache fonts after first frame to reduce jank when first used
              WidgetsBinding.instance.addPostFrameCallback((_) {
                try {
                  if (context.mounted) {
                    precacheFonts(context);
                  }
                } catch (_) {}
              });
              return child;
            },
            routes: {
              '/home': (context) => const HomeScreen(),
              '/profile': (context) => const ProfileScreen(),
            },
          );
        },
      ),
    );
  }
}
