# Quick Start: Getting Google Services Files

## TL;DR - Quick Steps

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Create/Select Project**: Create a new project or select existing one
3. **Add Android App**: 
   - Package name: `com.loki.loki_app`
   - Download `google-services.json` → Place in `android/app/`
4. **Add iOS App**:
   - Bundle ID: `com.loki.loki-app`
   - Download `GoogleService-Info.plist` → Place in `ios/Runner/`
5. **Enable Services**: Authentication, Firestore, Storage
6. **Done!**

---

## Detailed Step-by-Step

### Step 1: Access Firebase Console

1. Open your browser and go to: **https://console.firebase.google.com/**
2. Sign in with your Google account

### Step 2: Create or Select Project

**If creating a new project:**
1. Click **"Add project"** or **"Create a project"**
2. Enter project name: **"LOKI"** (or your preferred name)
3. Click **"Continue"**
4. (Optional) Disable Google Analytics if you don't need it, or keep it enabled
5. Click **"Create project"**
6. Wait for creation, then click **"Continue"**

**If using existing project:**
1. Select your project from the dashboard

### Step 3: Add Android App

1. In the Firebase project dashboard, you'll see cards for different platforms
2. Click the **Android icon** (or find "Add app" → Android)
3. Fill in the registration form:
   ```
   Android package name: com.loki.loki_app
   App nickname (optional): LOKI Android
   Debug signing certificate SHA-1: (leave blank for now)
   ```
4. Click **"Register app"**
5. **IMPORTANT**: Download the `google-services.json` file
   - Click the download button
   - The file will be named `google-services.json`
6. **Place the file**:
   - Copy the downloaded file
   - Navigate to: `c:\Dev\LOKI\android\app\`
   - Paste `google-services.json` into this folder
   - The full path should be: `c:\Dev\LOKI\android\app\google-services.json`
7. Click **"Next"** (you can skip the SDK setup steps)
8. Click **"Continue to console"**

### Step 4: Add iOS App

1. In the Firebase project dashboard, click the **iOS icon** (or "Add app" → iOS)
2. Fill in the registration form:
   ```
   iOS bundle ID: com.loki.loki-app
   App nickname (optional): LOKI iOS
   App Store ID: (leave blank)
   ```
4. Click **"Register app"**
5. **IMPORTANT**: Download the `GoogleService-Info.plist` file
   - Click the download button
   - The file will be named `GoogleService-Info.plist`
6. **Place the file**:
   - Copy the downloaded file
   - Navigate to: `c:\Dev\LOKI\ios\Runner\`
   - Paste `GoogleService-Info.plist` into this folder
   - The full path should be: `c:\Dev\LOKI\ios\Runner\GoogleService-Info.plist`
7. Click **"Next"** (you can skip the SDK setup steps)
8. Click **"Continue to console"**

### Step 5: Enable Required Services

#### Enable Authentication

1. In Firebase Console, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Go to the **"Sign-in method"** tab
4. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"
5. Enable **Google** (optional but recommended):
   - Click on "Google"
   - Toggle "Enable" to ON
   - Enter a support email
   - Click "Save"
6. Enable **Apple** (optional, iOS only):
   - Click on "Apple"
   - Toggle "Enable" to ON
   - Click "Save"

#### Enable Firestore Database

1. Click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Select **"Start in production mode"** (we'll add security rules later)
4. Choose a location (select closest to your users, e.g., `us-central1`)
5. Click **"Enable"**
6. Wait for the database to be created

#### Enable Storage

1. Click **"Storage"** in the left sidebar
2. Click **"Get started"**
3. Select **"Start in production mode"** (we'll add security rules later)
4. Click **"Next"**
5. Select the same location as Firestore
6. Click **"Done"**

### Step 6: Verify File Placement

Check that both files are in the correct locations:

```
c:\Dev\LOKI\
├── android\
│   └── app\
│       └── google-services.json          ✅ Should be here
└── ios\
    └── Runner\
        └── GoogleService-Info.plist      ✅ Should be here
```

### Step 7: Verify Android Configuration

The Android build files have already been updated to include the Google Services plugin. Verify:

- ✅ `android/build.gradle.kts` - Contains Google Services classpath
- ✅ `android/app/build.gradle.kts` - Contains Google Services plugin

### Step 8: Test the Setup

1. Run `flutter clean` to clear any cached build files
2. Run `flutter pub get` to ensure dependencies are up to date
3. Try building the app:
   ```bash
   flutter run
   ```

If you see Firebase initialization errors, double-check:
- Files are in the correct locations
- Package name/Bundle ID matches Firebase configuration
- Services are enabled in Firebase Console

## Common Issues & Solutions

### "google-services.json not found"
- **Solution**: Make sure the file is in `android/app/` (not `android/`)
- Verify the file name is exactly `google-services.json` (not `google-services.json.txt`)

### "GoogleService-Info.plist not found"
- **Solution**: Make sure the file is in `ios/Runner/`
- In Xcode, verify the file is added to the project target

### "Package name mismatch"
- **Solution**: The package name in Firebase must exactly match `com.loki.loki_app`
- Check `android/app/build.gradle.kts` - `applicationId` should be `com.loki.loki_app`

### "Bundle ID mismatch"
- **Solution**: The Bundle ID in Firebase must match your iOS app's Bundle ID
- Check in Xcode: Project Settings → General → Bundle Identifier

### Build errors after adding files
- **Solution**: Run `flutter clean` then `flutter pub get`
- For Android: `cd android && ./gradlew clean`
- For iOS: Clean build folder in Xcode (Cmd+Shift+K)

## Next Steps

After completing this setup:

1. ✅ Configuration files are in place
2. ✅ Services are enabled in Firebase
3. ⏭️ Update Firestore security rules (see README.md)
4. ⏭️ Add location permissions
5. ⏭️ Test authentication
6. ⏭️ Add test data to Firestore

## Need Help?

- **Firebase Console**: https://console.firebase.google.com/
- **Firebase Docs**: https://firebase.google.com/docs/flutter/setup
- **FlutterFire Docs**: https://firebase.flutter.dev/



