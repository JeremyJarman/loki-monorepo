import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/firestore_service.dart';
import 'auth_screen.dart';
import 'main_navigation_screen.dart';
import 'profile_setup_screen.dart';
import 'splash_loading_screen.dart';

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  static final FirestoreService _firestoreService = FirestoreService();
  String? _profileCheckUid;
  Future<bool>? _profileCheckFuture;

  Future<bool> _checkUserProfileExists(String uid) async {
    final user = await _firestoreService.getUser(uid);
    return user != null;
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SplashLoadingScreen();
        }

        if (snapshot.hasData) {
          final user = snapshot.data!;
          if (_profileCheckUid != user.uid) {
            _profileCheckUid = user.uid;
            _profileCheckFuture = _checkUserProfileExists(user.uid);
          }
          return FutureBuilder<bool>(
            future: _profileCheckFuture,
            builder: (context, profileSnapshot) {
              if (profileSnapshot.connectionState == ConnectionState.waiting) {
                return const SplashLoadingScreen();
              }
              if (profileSnapshot.hasData && !profileSnapshot.data!) {
                return const ProfileSetupScreen();
              }
              return const MainNavigationScreen();
            },
          );
        }

        return const AuthScreen();
      },
    );
  }
}
