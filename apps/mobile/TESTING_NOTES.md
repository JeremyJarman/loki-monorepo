# Testing Notes

## Running the App

The app is currently building/running. Here's what to expect:

### Expected Behavior

1. **App Launch**
   - Firebase will initialize (may show errors on Windows desktop if web config is missing)
   - Auth wrapper checks authentication state

2. **First Screen**
   - If not logged in: Authentication screen appears
   - If logged in: Profile check → Setup or Main app

3. **Authentication Screen**
   - Email/password fields
   - Google sign-in button
   - Apple sign-in button (iOS only)
   - Toggle between Sign In / Sign Up

### Known Limitations on Windows Desktop

- **Firebase**: May need web configuration for full functionality
- **Location Services**: May not work on Windows desktop
- **Google/Apple Sign-In**: May have limited support on desktop

### Best Testing Platforms

For full functionality, test on:
- **Android Emulator** (recommended)
- **iOS Simulator** (if on Mac)
- **Physical Android/iOS device**

### Quick Test Commands

```bash
# Run on Windows desktop
flutter run -d windows

# Run on Chrome (web)
flutter run -d chrome

# List available devices
flutter devices

# List emulators
flutter emulators
```

### If You See Firebase Errors

If you see Firebase initialization errors:
1. Check that `google-services.json` exists (for Android)
2. Check that `GoogleService-Info.plist` exists (for iOS)
3. For web/desktop, you may need to add web Firebase config
4. The app will still run but Firebase features won't work

### Testing Checklist

- [ ] App launches without crashes
- [ ] Authentication screen appears
- [ ] Can see email/password fields
- [ ] Can toggle between Sign In/Sign Up
- [ ] UI looks correct
- [ ] Navigation works (if logged in)

