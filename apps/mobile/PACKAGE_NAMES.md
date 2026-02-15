# Package Names Reference

This document contains the correct package names for Firebase configuration.

## Android Package Name
```
com.loki.loki_app
```
- Used in: `android/app/build.gradle.kts` (applicationId)
- Used in: Firebase Console when adding Android app
- Location: Already configured in the project

## iOS Bundle ID
```
com.loki.loki-app
```
- Used in: `ios/Runner.xcodeproj/project.pbxproj` (PRODUCT_BUNDLE_IDENTIFIER)
- Used in: Firebase Console when adding iOS app
- Location: Updated in the project

## Important Notes

1. **Android uses underscores** (`loki_app`)
2. **iOS uses hyphens** (`loki-app`)
3. These must match **exactly** in Firebase Console
4. The bundle ID/package name in Firebase must match your app configuration exactly

## Verification

### Android
Check: `android/app/build.gradle.kts`
```kotlin
applicationId = "com.loki.loki_app"  // ✅ Correct
```

### iOS
Check: `ios/Runner.xcodeproj/project.pbxproj`
```
PRODUCT_BUNDLE_IDENTIFIER = com.loki.loki-app;  // ✅ Correct
```

## Firebase Console Configuration

When adding apps in Firebase Console:

**Android App:**
- Package name: `com.loki.loki_app` ✅

**iOS App:**
- Bundle ID: `com.loki.loki-app` ✅

