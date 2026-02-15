# Troubleshooting App Launch Issues

## Current Status
- ✅ Emulator is running: `emulator-5554`
- ✅ Dependencies installed
- ✅ Project cleaned
- ⏳ App is building...

## Common Issues & Solutions

### 1. App Not Appearing on Emulator

**Possible Causes:**
- Build is still in progress (first build takes 2-5 minutes)
- Firebase initialization error blocking launch
- Missing `google-services.json` file
- Build errors

**Solutions:**

#### Check Build Progress
Look for these messages in terminal:
- `Running Gradle task 'assembleDebug'...` - Building
- `Built build\app\outputs\flutter-apk\app-debug.apk` - Build complete
- `Installing...` - Installing on device
- `Flutter run key commands` - App is running!

#### Check for Firebase Errors
If you see Firebase errors:
```bash
# Check if google-services.json exists
Test-Path android/app/google-services.json

# If missing, you need to add it from Firebase Console
```

#### Check Logs
```bash
# View Flutter logs
flutter logs

# Or check Android logs
adb logcat
```

### 2. Firebase Initialization Errors

**Error**: `[core/no-app] No Firebase App '[DEFAULT]' has been created`

**Solution**: 
- Make sure `google-services.json` is in `android/app/`
- Verify package name matches: `com.loki.loki_app`
- Run `flutter clean` and rebuild

### 3. Build Timeout

**If build takes too long:**
- First build always takes longer (2-5 minutes)
- Check your internet connection (downloading dependencies)
- Try: `flutter run -d emulator-5554 --no-sound-null-safety`

### 4. Emulator Not Responding

**If emulator seems frozen:**
- Wait 30-60 seconds (emulator can be slow)
- Check if emulator window is responsive
- Try restarting emulator from Android Studio

### 5. App Crashes on Launch

**Check logs:**
```bash
adb logcat | Select-String -Pattern "flutter"
```

**Common crash causes:**
- Missing Firebase config files
- Permission issues
- Null pointer exceptions

## Quick Diagnostic Commands

```bash
# Check devices
flutter devices

# Check for errors
flutter analyze

# Clean and rebuild
flutter clean
flutter pub get
flutter run -d emulator-5554

# Check Android build
cd android
./gradlew assembleDebug
```

## What to Look For

### In Terminal:
- ✅ "Launching lib\main.dart on emulator-5554..."
- ✅ "Running Gradle task..."
- ✅ "Built build\app\outputs\flutter-apk\app-debug.apk"
- ✅ "Installing..."
- ✅ "Flutter run key commands"

### On Emulator:
- App icon appears in app drawer
- App window opens
- Authentication screen appears

## If App Still Doesn't Show

1. **Check emulator is fully booted**
   - Android home screen visible
   - No loading indicators

2. **Try manual install**
   ```bash
   flutter build apk
   adb install build\app\outputs\flutter-apk\app-debug.apk
   ```

3. **Check app in emulator**
   - Open app drawer on emulator
   - Look for "loki_app" or "Loki App"
   - Try launching manually

4. **Check for errors in terminal**
   - Look for red error messages
   - Check for Firebase errors
   - Look for build failures

## Next Steps

The app is currently building. Watch your terminal for:
- Build progress messages
- Any error messages
- "Flutter run key commands" (means it's ready!)

If you see specific errors, share them and I can help fix them!
