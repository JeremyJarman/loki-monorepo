import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Shown while app loads (auth check). Logo + LOKI + tagline with simple animations.
class SplashLoadingScreen extends StatefulWidget {
  const SplashLoadingScreen({super.key});

  @override
  State<SplashLoadingScreen> createState() => _SplashLoadingScreenState();
}

class _SplashLoadingScreenState extends State<SplashLoadingScreen>
    with TickerProviderStateMixin {
  static const String _logoAsset = 'assets/images/logos/Logo.png';
  static const String _tagline = 'experience sharing starts here';

  late AnimationController _logoController;
  late AnimationController _titleController;
  late AnimationController _taglineController;
  late Animation<double> _logoOpacity;
  late Animation<double> _titleOpacity;
  late Animation<double> _taglineOpacity;

  @override
  void initState() {
    super.initState();
    _logoController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _titleController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _taglineController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _logoOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _logoController, curve: Curves.easeOut),
    );
    _titleOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _titleController, curve: Curves.easeOut),
    );
    _taglineOpacity = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _taglineController, curve: Curves.easeOut),
    );
    _logoController.forward();
    Future.delayed(const Duration(milliseconds: 150), () {
      if (mounted) _titleController.forward();
    });
    Future.delayed(const Duration(milliseconds: 350), () {
      if (mounted) _taglineController.forward();
    });
  }

  @override
  void dispose() {
    _logoController.dispose();
    _titleController.dispose();
    _taglineController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLight = Theme.of(context).brightness == Brightness.light;
    final bg = isLight ? const Color(0xFFFDF8F6) : const Color(0xFF1A1A1A);
    final textColor = isLight ? const Color(0xFF333333) : Colors.white;

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              FadeTransition(
                opacity: _logoOpacity,
                child: Image.asset(
                  _logoAsset,
                  height: 72,
                  width: 72,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => Icon(
                    Icons.restaurant_menu,
                    size: 72,
                    color: textColor,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FadeTransition(
                opacity: _titleOpacity,
                child: Text(
                  'LOKI',
                  style: GoogleFonts.crimsonText(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              FadeTransition(
                opacity: _taglineOpacity,
                child: Text(
                  _tagline,
                  style: GoogleFonts.dmSans(
                    fontSize: 14,
                    color: textColor.withOpacity(0.8),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
