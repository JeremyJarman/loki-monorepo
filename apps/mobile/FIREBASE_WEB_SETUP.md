# Firebase Web Configuration Setup

## Secure Configuration Approach

This project uses FlutterFire's recommended approach to store Firebase configuration securely, avoiding API keys in `index.html`.

## Setup Instructions

### Option 1: Use FlutterFire CLI (Recommended)

1. **Install FlutterFire CLI** (if not already installed):
   ```bash
   dart pub global activate flutterfire_cli
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Configure Firebase for your project**:
   ```bash
   flutterfire configure
   ```
   
   This will:
   - Detect your Firebase projects
   - Generate `lib/firebase_options.dart` with all platform configurations
   - Automatically populate the correct values for web, Android, and iOS

### Option 2: Manual Configuration

If you prefer to manually configure, edit `lib/firebase_options.dart`:

1. Open `lib/firebase_options.dart`
2. Replace the placeholder values in the `web`, `android`, and `ios` sections with your actual Firebase configuration values
3. You can find these values in Firebase Console:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Click gear icon → Project Settings
   - Scroll to "Your apps" section
   - For each platform (Web, Android, iOS), copy the configuration values

## Configuration Values Needed

For each platform, you'll need:

### Web:
- `apiKey`
- `appId`
- `messagingSenderId`
- `projectId`
- `authDomain`
- `storageBucket`
- `measurementId` (optional, only if using Analytics)

### Android:
- `apiKey`
- `appId`
- `messagingSenderId`
- `projectId`
- `storageBucket`

### iOS:
- `apiKey`
- `appId`
- `messagingSenderId`
- `projectId`
- `storageBucket`
- `iosBundleId`

## Security Notes

- **Web API keys are public by design**: Firebase web API keys are meant to be included in client-side code. Security is enforced through:
  - Firebase Security Rules (for Firestore, Storage)
  - Authorized domains (configured in Firebase Console)
  - OAuth client restrictions
  
- **Best Practice**: Use FlutterFire CLI to generate `firebase_options.dart` - it ensures correct configuration and reduces errors.

- **Git**: The `firebase_options.dart` file is typically committed to version control as it's needed for builds. If you want to exclude it, uncomment the line in `.gitignore`.

## Current Setup

- ✅ `index.html` - No Firebase config (clean and secure)
- ✅ `lib/firebase_options.dart` - Contains all Firebase configuration
- ✅ `lib/main.dart` - Uses `DefaultFirebaseOptions.currentPlatform` for initialization

## Verification

After configuration, test the setup:

```bash
flutter clean
flutter pub get
flutter run -d chrome
```

The app should connect to Firebase without any configuration errors.
