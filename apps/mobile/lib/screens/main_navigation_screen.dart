import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'home_screen.dart';
import 'search_screen.dart';
import 'profile_screen.dart';
import '../utils/responsive_layout.dart';
import '../widgets/web_header.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> 
    with SingleTickerProviderStateMixin {
  int _selectedIndex = 0;
  late TabController _tabController;
  final List<Widget?> _screens = [null, null, null];

  Widget _getScreen(int index) {
    if (_screens[index] == null) {
      _screens[index] = index == 0
          ? const HomeScreen()
          : index == 1
              ? const SearchScreen()
              : const ProfileScreen();
    }
    return _screens[index]!;
  }
  
  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      _tabController = TabController(length: 3, vsync: this, initialIndex: _selectedIndex);
      _tabController.addListener(() {
        if (_tabController.indexIsChanging || _tabController.index != _tabController.previousIndex) {
          setState(() {
            _selectedIndex = _tabController.index;
          });
        }
      });
    }
  }
  
  @override
  void dispose() {
    if (kIsWeb) {
      _tabController.dispose();
    }
    super.dispose();
  }

  void _onWebTabSelected(int index) {
    setState(() {
      _selectedIndex = index;
      if (kIsWeb) {
        _tabController.animateTo(index);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: kIsWeb
          ? Column(
              children: [
                WebHeader(
                  selectedIndex: _selectedIndex,
                  onTabSelected: _onWebTabSelected,
                ),
                Expanded(
                  child: ResponsiveLayout(
                    child: _getScreen(_selectedIndex),
                  ),
                ),
              ],
            )
          : ResponsiveLayout(
              child: _getScreen(_selectedIndex),
            ),
      bottomNavigationBar: kIsWeb
          ? null
          : Padding(
              padding: const EdgeInsets.only(top: 20),
              child: Theme(
                data: Theme.of(context).copyWith(
                  navigationBarTheme: NavigationBarThemeData(
                    height: 50,
                    backgroundColor: Theme.of(context).brightness == Brightness.light
                        ? Theme.of(context).scaffoldBackgroundColor
                        : null,
                    indicatorColor: Theme.of(context).colorScheme.primary.withOpacity(0.2),
                    iconTheme: WidgetStateProperty.resolveWith((states) {
                      if (states.contains(WidgetState.selected)) {
                        return IconThemeData(color: Theme.of(context).colorScheme.primary);
                      }
                      final brightness = Theme.of(context).brightness;
                      final unselectedColor = brightness == Brightness.light
                          ? Theme.of(context).textTheme.bodyLarge?.color ?? Colors.black
                          : Colors.white;
                      return IconThemeData(color: unselectedColor);
                    }),
                    labelTextStyle: WidgetStateProperty.resolveWith((states) => null),
                  ),
                ),
                child: NavigationBar(
                  selectedIndex: _selectedIndex,
                  onDestinationSelected: (index) {
                    setState(() => _selectedIndex = index);
                  },
                  destinations: const [
                    NavigationDestination(icon: Icon(Icons.home), label: ''),
                    NavigationDestination(icon: Icon(Icons.search), label: ''),
                    NavigationDestination(icon: Icon(Icons.person), label: ''),
                  ],
                ),
              ),
            ),
    );
  }
}

