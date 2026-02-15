# LOKI App - MVP

A social-centric local discovery platform built with Flutter and Firebase, focusing on user-curated lists and venue/event information.

## Technology Stack

- **Frontend**: Flutter (Dart)
- **Backend/Database**: Firebase
  - Firestore (NoSQL database)
  - Firebase Authentication
  - Firebase Storage (for media)
- **State Management**: BLoC/Cubit pattern
- **Location Services**: Geolocator

## Features

### Core MVP Features

1. **User Profiles and Following**
   - User registration and login (Email/Password, Google, Apple)
   - Profile creation with username and about section
   - Follow/unfollow functionality
   - Real-time follower/following counts

2. **Curated Lists**
   - Create and manage lists of venues
   - Add venues to lists
   - View lists with venue cards

3. **Venue Cards**
   - Display venue information (name, description, address, phone)
   - Image carousel
   - Distance from user location
   - Opening hours status
   - Atmosphere section
   - Navigate button (opens maps)
   - Book a Table button

4. **Event Cards**
   - Event name, description, date/time
   - Cost information
   - Event image
   - Link to parent venue

5. **Discovery/Search Page**
   - Tabbed interface (Venues/Events)
   - Search functionality
   - Proximity-based ordering
   - Infinite scrolling

## Project Structure

```
lib/
├── models/          # Data models for Firestore collections
├── services/        # Firebase services (Auth, Firestore, Storage, Location)
├── repositories/    # Data repositories (if needed)
├── bloc/            # BLoC/Cubit state management
├── screens/         # Main app screens
├── widgets/         # Reusable UI components
├── utils/           # Utility functions and helpers
├── config/          # Configuration files
└── main.dart        # App entry point
```

## Setup Instructions

### Prerequisites

- Flutter SDK (3.8.1 or higher)
- Dart SDK (3.8.1 or higher)
- Firebase account
- Android Studio / Xcode (for mobile development)

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

2. Add Android and iOS apps to your Firebase project:
   - **Android**: Add package name `com.loki.loki_app`
   - **iOS**: Add bundle ID (configure in Xcode)

3. Download configuration files:
   - **Android**: Download `google-services.json` and place it in `android/app/`
   - **iOS**: Download `GoogleService-Info.plist` and place it in `ios/Runner/`

4. Enable Firebase services:
   - **Authentication**: Enable Email/Password, Google, and Apple sign-in
   - **Firestore Database**: Create database in production mode (update security rules later)
   - **Storage**: Enable Firebase Storage

5. Install Firebase CLI and FlutterFire CLI:
   ```bash
   npm install -g firebase-tools
   dart pub global activate flutterfire_cli
   ```

6. Configure Firebase for Flutter:
   ```bash
   flutterfire configure
   ```
   This generates `lib/firebase_options.dart` (gitignored — never commit; contains API keys).

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd LOKI
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Run the app:
   ```bash
   flutter run
   ```

## Firestore Data Models

### Collections

- **users**: User profile data
- **venues**: Venue information
- **events**: Event information
- **lists**: User-curated lists
- **follows**: Social graph (who follows whom)

See `lib/models/` for detailed model definitions.

## Development Notes

### Location Permissions

The app requires location permissions for:
- Calculating distance to venues
- Proximity-based venue ordering

Add location permissions to:
- **Android**: `android/app/src/main/AndroidManifest.xml`
- **iOS**: `ios/Runner/Info.plist`

### Security Rules

Update Firestore security rules in Firebase Console to restrict access based on authentication status.

Example rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    // Add more rules for other collections
  }
}
```

## Next Steps

1. Implement authentication screens (login/signup)
2. Add list creation and management screens
3. Implement venue detail screens
4. Add image upload functionality
5. Enhance search with filters
6. Add pull-to-refresh functionality
7. Implement error handling and loading states
8. Add unit and widget tests

## License

[Add your license here]
