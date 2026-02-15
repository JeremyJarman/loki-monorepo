# Firebase Setup Checklist

Use this checklist to track your progress setting up Firebase for the LOKI app.

## Pre-Setup
- [ ] Have a Google account ready
- [ ] Have access to Firebase Console (https://console.firebase.google.com/)

## Firebase Project
- [ ] Created new Firebase project OR selected existing project
- [ ] Project name: _______________
- [ ] Project created successfully

## Android Configuration
- [ ] Clicked "Add Android app" in Firebase Console
- [ ] Entered package name: `com.loki.loki_app`
- [ ] Downloaded `google-services.json` file
- [ ] Placed file in: `android/app/google-services.json`
- [ ] Verified file location is correct

## iOS Configuration
- [ ] Clicked "Add iOS app" in Firebase Console
- [ ] Entered bundle ID: `com.loki.loki-app`
- [ ] Downloaded `GoogleService-Info.plist` file
- [ ] Placed file in: `ios/Runner/GoogleService-Info.plist`
- [ ] Verified file location is correct

## Enable Services
- [ ] Authentication → Enabled
  - [ ] Email/Password enabled
  - [ ] Google sign-in enabled (optional)
  - [ ] Apple sign-in enabled (optional)
- [ ] Firestore Database → Created
  - [ ] Database location selected: _______________
- [ ] Storage → Enabled
  - [ ] Storage location selected: _______________

## Verification
- [ ] Ran `flutter clean`
- [ ] Ran `flutter pub get`
- [ ] Android build files updated (already done)
- [ ] Tested app build: `flutter run`

## Notes
- Android package name: `com.loki.loki_app`
- iOS bundle ID: `com.loki.loki-app`
- Configuration files must be in exact locations shown above

## Troubleshooting
If you encounter issues, check:
- [ ] File names are exact (case-sensitive)
- [ ] Files are in correct folders (not parent directories)
- [ ] Package name/Bundle ID matches exactly
- [ ] Services are enabled in Firebase Console
- [ ] Ran `flutter clean` after adding files

---

**Quick Reference:**
- Firebase Console: https://console.firebase.google.com/
- Android config: `android/app/google-services.json`
- iOS config: `ios/Runner/GoogleService-Info.plist`



