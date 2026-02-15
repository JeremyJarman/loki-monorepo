# LOKI App Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   flutter pub get
   ```

2. **Set up Firebase**
   - Follow the Firebase setup instructions in README.md
   - Run `flutterfire configure` after setting up your Firebase project

3. **Run the App**
   ```bash
   flutter run
   ```

## Project Structure Overview

The project follows a clean architecture pattern:

```
lib/
├── models/          # Data models (User, Venue, Event, List, Follow)
├── services/        # Business logic services
│   ├── auth_service.dart
│   ├── firestore_service.dart
│   ├── storage_service.dart
│   └── location_service.dart
├── repositories/    # Data layer (currently using services directly)
├── bloc/            # State management (to be implemented)
├── screens/         # UI screens
│   ├── discovery_screen.dart
│   └── profile_screen.dart
├── widgets/         # Reusable UI components
│   ├── venue_card.dart
│   └── event_card.dart
├── utils/           # Helper functions
│   ├── date_formatter.dart
│   └── opening_hours_helper.dart
├── config/          # Configuration
│   └── firebase_config.dart
└── main.dart        # App entry point
```

## Next Implementation Steps

1. **Authentication Screens**
   - Create login/signup screens
   - Implement profile creation flow
   - Add authentication state management

2. **List Management**
   - Create list creation screen
   - Add "Add to List" functionality
   - Implement list detail view

3. **Enhanced Features**
   - Add pull-to-refresh
   - Implement infinite scrolling
   - Add error handling and loading states
   - Create venue detail screen

4. **State Management**
   - Implement BLoC/Cubit for state management
   - Add proper error handling
   - Implement caching strategies

## Notes

- All linting errors are expected until `flutter pub get` is run
- Firebase configuration files need to be added manually
- Location permissions need to be configured in platform-specific files
- Security rules need to be set up in Firebase Console

