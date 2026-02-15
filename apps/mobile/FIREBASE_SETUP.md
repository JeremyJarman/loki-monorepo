# Firebase Setup Guide - Google Services Files

This guide will walk you through obtaining the Google Services configuration files needed for Firebase integration.

## Prerequisites

- A Google account
- Access to [Firebase Console](https://console.firebase.google.com/)

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter your project name (e.g., "LOKI App")
4. Click **"Continue"**
5. (Optional) Enable Google Analytics - you can skip this for now or enable it
6. Click **"Create project"**
7. Wait for the project to be created, then click **"Continue"**

## Step 2: Add Android App to Firebase

1. In your Firebase project dashboard, click the **Android icon** (or click **"Add app"** and select Android)
2. Fill in the Android app details:
   - **Android package name**: `com.loki.loki_app`
     - This must match the package name in `android/app/build.gradle.kts`
   - **App nickname** (optional): "LOKI Android"
   - **Debug signing certificate SHA-1** (optional): You can skip this for now
3. Click **"Register app"**
4. **Download the `google-services.json` file**
   - Click the download button
   - Save the file to your computer
5. Click **"Next"** (you can skip the remaining steps for now)
6. Click **"Continue to console"**

### Place the Android Configuration File

1. Copy the downloaded `google-services.json` file
2. Paste it into: `android/app/google-services.json`
   - The file should be at: `c:\Dev\LOKI\android\app\google-services.json`

## Step 3: Add iOS App to Firebase

1. In your Firebase project dashboard, click the **iOS icon** (or click **"Add app"** and select iOS)
2. Fill in the iOS app details:
   - **iOS bundle ID**: `com.loki.loki-app`
   - **App nickname** (optional): "LOKI iOS"
   - **App Store ID** (optional): Leave blank for now
3. Click **"Register app"**
4. **Download the `GoogleService-Info.plist` file**
   - Click the download button
   - Save the file to your computer
5. Click **"Next"** (you can skip the remaining steps for now)
6. Click **"Continue to console"**

### Place the iOS Configuration File

1. Copy the downloaded `GoogleService-Info.plist` file
2. Paste it into: `ios/Runner/GoogleService-Info.plist`
   - The file should be at: `c:\Dev\LOKI\ios\Runner\GoogleService-Info.plist`

## Step 4: Verify File Locations

After placing the files, your project structure should look like:

```
LOKI/
├── android/
│   └── app/
│       └── google-services.json          ← Android config file
├── ios/
│   └── Runner/
│       └── GoogleService-Info.plist     ← iOS config file
└── ...
```

## Step 5: Enable Firebase Services

In the Firebase Console, enable the following services:

### Authentication
1. Go to **Authentication** in the left sidebar
2. Click **"Get started"**
3. Enable the following sign-in methods:
   - **Email/Password**: Click to enable
   - **Google**: Click to enable (you'll need to configure OAuth consent screen)
   - **Apple**: Click to enable (for iOS, requires Apple Developer account)

### Firestore Database
1. Go to **Firestore Database** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll update security rules later)
4. Select a location (choose closest to your users)
5. Click **"Enable"**

### Storage
1. Go to **Storage** in the left sidebar
2. Click **"Get started"**
3. Choose **"Start in production mode"** (we'll update security rules later)
4. Click **"Next"**
5. Select the same location as Firestore
6. Click **"Done"**

## Step 6: Update Android Build Files

The Android project needs to be configured to use the Google Services plugin.

### Check `android/build.gradle.kts`

Make sure it includes the Google Services classpath:

```kotlin
buildscript {
    dependencies {
        // ... other dependencies
        classpath("com.google.gms:google-services:4.4.0")
    }
}
```

### Check `android/app/build.gradle.kts`

Make sure it applies the Google Services plugin at the bottom:

```kotlin
plugins {
    // ... other plugins
    id("com.google.gms.google-services")
}
```

## Step 7: Update iOS Configuration

The iOS project should automatically pick up the `GoogleService-Info.plist` file if it's in the correct location.

### Verify in Xcode (Optional)
1. Open `ios/Runner.xcworkspace` in Xcode
2. Check that `GoogleService-Info.plist` appears in the project navigator
3. If not, drag and drop it into the Runner folder in Xcode

## Step 8: Run FlutterFire CLI (Recommended)

For a more automated setup, you can use FlutterFire CLI:

1. Install FlutterFire CLI:
   ```bash
   dart pub global activate flutterfire_cli
   ```

2. Run the configuration:
   ```bash
   flutterfire configure
   ```

3. Select your Firebase project
4. Select the platforms you want to configure (Android, iOS, Web, etc.)
5. The CLI will automatically download and place the configuration files

## Troubleshooting

### Android Issues

- **File not found**: Make sure `google-services.json` is in `android/app/` (not `android/`)
- **Build errors**: Run `flutter clean` and then `flutter pub get`
- **Plugin not applied**: Check that the Google Services plugin is in both build.gradle files

### iOS Issues

- **File not found**: Make sure `GoogleService-Info.plist` is in `ios/Runner/`
- **Xcode errors**: Open the project in Xcode and ensure the file is added to the target
- **Bundle ID mismatch**: Make sure the bundle ID in Firebase matches your iOS app's bundle ID

### General Issues

- **Firebase not initialized**: Make sure you've run `flutter pub get` after adding dependencies
- **Authentication errors**: Verify that Authentication is enabled in Firebase Console
- **Firestore errors**: Check that Firestore Database is created and enabled

## Next Steps

After completing this setup:

1. Update Firestore security rules (see README.md)
2. Configure location permissions for Android and iOS
3. Test the app with `flutter run`
4. Implement authentication screens
5. Add test data to Firestore

## Quick Reference

- **Android config**: `android/app/google-services.json`
- **iOS config**: `ios/Runner/GoogleService-Info.plist`
- **Package name (Android)**: `com.loki.loki_app`
- **Bundle ID (iOS)**: `com.loki.loki-app`
- **Firebase Console**: https://console.firebase.google.com/

