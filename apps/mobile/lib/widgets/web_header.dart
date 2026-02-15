import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';

/// Landing-page-style header for web: white background, logo + LOKI left,
/// Home / Search / Profile as text links in the center.
class WebHeader extends StatelessWidget implements PreferredSizeWidget {
  final int selectedIndex;
  final ValueChanged<int> onTabSelected;

  const WebHeader({
    super.key,
    required this.selectedIndex,
    required this.onTabSelected,
  });

  static const double _height = 64;

  @override
  Size get preferredSize => const Size.fromHeight(_height);

  static const Color _neutral = Color(0xFF333333);

  @override
  Widget build(BuildContext context) {
    if (!kIsWeb) return const SizedBox.shrink();

    // Landing style: always white header with dark text
    final navColor = _neutral;
    final navColorHover = _neutral.withOpacity(0.8);

    return Container(
      height: _height,
      color: Colors.white,
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            children: [
              // Logo + LOKI (left)
              Expanded(
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: _HeaderLogo(),
                ),
              ),
              // Nav links (center)
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _NavLink(
                      label: 'Home',
                      isSelected: selectedIndex == 0,
                      color: navColor,
                      hoverColor: navColorHover,
                      onTap: () => onTabSelected(0),
                    ),
                    const SizedBox(width: 32),
                    _NavLink(
                      label: 'Search',
                      isSelected: selectedIndex == 1,
                      color: navColor,
                      hoverColor: navColorHover,
                      onTap: () => onTabSelected(1),
                    ),
                    const SizedBox(width: 32),
                    _NavLink(
                      label: 'Profile',
                      isSelected: selectedIndex == 2,
                      color: navColor,
                      hoverColor: navColorHover,
                      onTap: () => onTabSelected(2),
                    ),
                  ],
                ),
              ),
              // Right spacer for balance
              const Expanded(child: SizedBox()),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeaderLogo extends StatelessWidget {
  static const Color _neutral = Color(0xFF333333);
  static const String _logoAsset = 'assets/images/logos/Logo.png';

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          _logoAsset,
          height: 32,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => Icon(Icons.restaurant_menu, size: 28, color: _neutral),
        ),
        const SizedBox(width: 12),
        Text(
          'LOKI',
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: _neutral,
          ),
        ),
      ],
    );
  }
}

class _NavLink extends StatefulWidget {
  final String label;
  final bool isSelected;
  final Color color;
  final Color hoverColor;
  final VoidCallback onTap;

  const _NavLink({
    required this.label,
    required this.isSelected,
    required this.color,
    required this.hoverColor,
    required this.onTap,
  });

  @override
  State<_NavLink> createState() => _NavLinkState();
}

class _NavLinkState extends State<_NavLink> {
  bool _hover = false;

  @override
  Widget build(BuildContext context) {
    final effectiveColor = _hover ? widget.hoverColor : widget.color;
    return MouseRegion(
      onEnter: (_) => setState(() => _hover = true),
      onExit: (_) => setState(() => _hover = false),
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: widget.onTap,
        child: Text(
          widget.label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: widget.isSelected ? FontWeight.bold : FontWeight.w600,
            color: effectiveColor,
          ),
        ),
      ),
    );
  }
}
