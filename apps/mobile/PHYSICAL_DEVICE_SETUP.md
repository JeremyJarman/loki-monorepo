# Running LOKI App on Physical Android Tablet

## 📱 Step 1: Enable Developer Options on Your Tablet

1. **Open Settings** on your Android tablet
2. **Go to "About tablet"** or "About device" (usually at the bottom of Settings)
3. **Find "Build number"** and tap it **7 times**
   - You'll see a message like "You are now a developer!"
4. **Go back** to the main Settings menu
5. You should now see **"Developer options"** (usually under System or Advanced)

## 🔓 Step 2: Enable USB Debugging

1. **Open "Developer options"** in Settings
2. **Enable "Developer options"** (toggle at the top)
3. **Enable "USB debugging"**
   - You may see a warning - tap "OK" or "Allow"
4. **Optional but recommended**: Enable "Stay awake" (keeps screen on while charging)

## 🔌 Step 3: Connect Your Tablet to Computer

1. **Connect your tablet** to your Windows computer using a USB cable
2. **On your tablet**, you should see a popup asking "Allow USB debugging?"
   - Check **"Always allow from this computer"** (optional but helpful)
   - Tap **"Allow"** or **"OK"**
3. **If you don't see the popup**, try:
   - Unplug and replug the USB cable
   - Make sure you're using a data cable (not just a charging cable)
   - Try a different USB port on your computer

## ✅ Step 4: Verify Connection

Open PowerShell or Command Prompt and run:

```powershell
adb devices
```

You should see something like:
```
List of devices attached
ABC123XYZ    device
```

If you see `unauthorized` instead of `device`:
- Check your tablet screen for the USB debugging permission popup
- Tap "Allow" on the tablet

If you see `offline`:
- Unplug and replug the USB cable
- Run `adb kill-server` then `adb devices` again

## 🚀 Step 5: Run the App on Your Tablet

Once your device is connected and authorized:

```powershell
# Navigate to your project directory
cd c:\Dev\LOKI

# Run the app (Flutter will detect your tablet automatically)
flutter run

# Or specify the device explicitly
flutter run -d <device-id>
```

To see your device ID:
```powershell
flutter devices
```

## 📋 Quick Commands Reference

```powershell
# Check if device is connected
adb devices

# List all Flutter devices (emulators + physical devices)
flutter devices

# Run app on connected device
flutter run

# Run on specific device
flutter run -d <device-id>

# Build APK for manual installation (optional)
flutter build apk
```

## 🎯 What to Expect

1. **First Build** (2-5 minutes):
   - Flutter will compile your app
   - Build the Android APK
   - Install it on your tablet
   - You'll see progress in the terminal

2. **App Launch**:
   - The app will automatically launch on your tablet
   - You should see the LOKI login/signup screen

3. **Hot Reload**:
   - Once running, press `r` in terminal for hot reload
   - Press `R` for hot restart
   - Press `q` to quit

## 🐛 Troubleshooting

### Device Not Detected

**Problem**: `adb devices` shows nothing or shows `unauthorized`

**Solutions**:
- Make sure USB debugging is enabled on the tablet
- Check the tablet screen for permission popup
- Try a different USB cable (must be a data cable)
- Try a different USB port
- On Windows, you may need to install USB drivers for your tablet
- Run `adb kill-server` then `adb start-server`

### "No devices found" in Flutter

**Problem**: `flutter devices` doesn't show your tablet

**Solutions**:
- Make sure `adb devices` shows your device as `device` (not `unauthorized` or `offline`)
- Restart ADB: `adb kill-server` then `adb start-server`
- Unplug and replug the USB cable
- Try `flutter doctor` to check for issues

### Build Errors

**Problem**: App fails to build or install

**Solutions**:
- Make sure your tablet meets minimum requirements (Android 6.0 / API 23+)
- Check tablet has enough storage space
- Try `flutter clean` then `flutter pub get` then `flutter run`
- Check terminal output for specific error messages

### App Crashes on Launch

**Problem**: App installs but crashes immediately

**Solutions**:
- Check tablet's Android version (needs API 23+)
- Check if Firebase is properly configured
- Look at `adb logcat` for error messages:
  ```powershell
  adb logcat | findstr flutter
  ```

## 📱 Wireless Debugging (Optional - Android 11+)

If your tablet supports it and you want to debug wirelessly:

1. **On your tablet**: Developer options → Enable "Wireless debugging"
2. **On your tablet**: Tap "Wireless debugging" → "Pair device with pairing code"
3. **On your computer**: Run:
   ```powershell
   adb pair <ip-address>:<port>
   ```
   (Use the IP and port shown on your tablet)
4. **Enter the pairing code** shown on your tablet
5. **Connect wirelessly**:
   ```powershell
   adb connect <ip-address>:<port>
   ```
   (Use the IP and port shown under "IP address & port" on tablet)

## 🎉 Success!

Once you see the app running on your tablet, you can:
- Test all features in a real environment
- Test with real location services
- Test with real camera (if your app uses it)
- Show the demo to others!

## 💡 Tips

- **Keep USB debugging enabled** - You'll need it each time you want to deploy
- **Use a good USB cable** - Some cables only charge, not transfer data
- **First build is slowest** - Subsequent builds will be faster
- **Hot reload works** - Make code changes and press `r` to see them instantly
- **Keep tablet unlocked** - Some tablets require screen to be on for debugging
