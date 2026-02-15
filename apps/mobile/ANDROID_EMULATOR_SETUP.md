# Android Emulator Setup Guide

## ✅ Available Emulators

You have 2 Android emulators available:
- `Medium_Phone_API_35` - Medium Phone API 35
- `Medium_Phone_API_35_2` - Medium Phone API 35 2

## 🚀 Launching an Emulator

### Option 1: Using Flutter CLI (Recommended)
```bash
# Launch a specific emulator
flutter emulators --launch Medium_Phone_API_35

# Or launch the other one
flutter emulators --launch Medium_Phone_API_35_2
```

### Option 2: Using Android Studio
1. Open Android Studio
2. Click "Device Manager" (phone icon in toolbar)
3. Click the play button next to your emulator

### Option 3: List and Choose
```bash
# List all available emulators
flutter emulators

# Launch by ID
flutter emulators --launch <emulator_id>
```

## ⏱️ Waiting for Emulator to Start

The emulator takes 30-60 seconds to fully boot. Wait until you see:
- Android home screen appears
- No loading indicators
- Emulator is responsive

## 📱 Running Your App

Once the emulator is running:

```bash
# Run the app (Flutter will auto-detect the emulator)
flutter run

# Or specify the device explicitly
flutter run -d Medium_Phone_API_35
```

## 🔍 Check if Emulator is Running

```bash
# List connected devices
flutter devices

# You should see something like:
# sdk gphone64 arm64 • emulator-5554 • android-arm64 • Android 15 (API 35)
```

## 🛠️ Creating a New Emulator (If Needed)

If you want to create a new emulator:

```bash
# Create with default settings
flutter emulators --create

# Create with a specific name
flutter emulators --create --name MyEmulator
```

Or use Android Studio:
1. Tools → Device Manager
2. Create Device
3. Choose device (e.g., Pixel 5)
4. Choose system image (API 35 recommended)
5. Finish

## ⚠️ Troubleshooting

### Emulator Won't Start
- **Check**: Android Studio is installed
- **Check**: HAXM or Hyper-V is enabled (for virtualization)
- **Try**: Restart Android Studio
- **Try**: Cold boot the emulator from Android Studio

### Emulator is Slow
- **Solution**: Increase RAM allocation in emulator settings
- **Solution**: Use a lower API level (API 30 instead of 35)
- **Solution**: Enable hardware acceleration

### "No devices found"
- **Wait**: Emulator needs 30-60 seconds to fully boot
- **Check**: Run `flutter devices` to see if it's detected
- **Try**: Restart the emulator

### Android Licenses Not Accepted
```bash
# Accept Android licenses (optional but recommended)
flutter doctor --android-licenses
```

## 📋 Quick Commands Reference

```bash
# List emulators
flutter emulators

# Launch emulator
flutter emulators --launch Medium_Phone_API_35

# Check devices
flutter devices

# Run app
flutter run

# Stop emulator
# Close the emulator window or use Android Studio Device Manager
```

## 🎯 Next Steps

1. ✅ Emulator is launching...
2. ⏳ Wait for emulator to fully boot (30-60 seconds)
3. ⏳ Run `flutter devices` to verify it's ready
4. ⏳ Run `flutter run` to launch your app

## 💡 Tips

- **First boot is slowest**: Subsequent boots will be faster
- **Keep emulator running**: Don't close it between test runs
- **Use hot reload**: Press `r` in terminal to hot reload after code changes
- **Use hot restart**: Press `R` in terminal to hot restart
- **Quit app**: Press `q` in terminal

