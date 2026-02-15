# Running Flutter Web App with Chrome Profile

This guide helps you run your Flutter web app using a specific Chrome profile so you stay signed in to your Google account.

## Quick Start

1. **Find your Chrome profile name:**
   - Open Chrome and go to `chrome://version/`
   - Look for "Profile Path" - it will show something like `Profile 1` or `Default`
   - Or check: `C:\Users\<YourUsername>\AppData\Local\Google\Chrome\User Data\`

2. **Use the PowerShell script:**
   ```powershell
   .\run_web_with_profile.ps1
   ```

3. **Or run manually:**
   ```powershell
   flutter run -d chrome `
       --web-browser-flag="--user-data-dir=$env:LOCALAPPDATA\Google\Chrome\User Data" `
       --web-browser-flag="--profile-directory=Default"
   ```

## Finding Your Profile Name

### Method 1: Check Chrome Version Page
1. Open Chrome
2. Go to `chrome://version/`
3. Look for "Profile Path" - note the profile name (e.g., `Default`, `Profile 1`, `Profile 2`)

### Method 2: Check File System
1. Open File Explorer
2. Navigate to: `C:\Users\<YourUsername>\AppData\Local\Google\Chrome\User Data\`
3. You'll see folders like:
   - `Default` - Your main profile
   - `Profile 1` - Second profile
   - `Profile 2` - Third profile
   - etc.

## Using the Script

1. **Edit the script** (`run_web_with_profile.ps1`):
   - Open the file
   - Change `$profileName = "Default"` to your profile name (e.g., `"Profile 1"`)

2. **Run the script:**
   ```powershell
   .\run_web_with_profile.ps1
   ```

## Manual Command

Replace `Default` with your profile name:

```powershell
$chromeUserData = "$env:LOCALAPPDATA\Google\Chrome\User Data"
$profileName = "Default"  # Change this to your profile

flutter run -d chrome `
    --web-browser-flag="--user-data-dir=$chromeUserData" `
    --web-browser-flag="--profile-directory=$profileName"
```

## Alternative: Create a Dedicated Profile

If you want a completely separate Chrome instance for development:

1. Create a new directory for the profile:
   ```powershell
   New-Item -ItemType Directory -Path "C:\Dev\LOKI\chrome_dev_profile"
   ```

2. Run Flutter with that profile:
   ```powershell
   flutter run -d chrome `
       --web-browser-flag="--user-data-dir=C:\Dev\LOKI\chrome_dev_profile" `
       --web-browser-flag="--profile-directory=Default"
   ```

3. Sign in to your Google account in this Chrome instance - it will be saved for future runs

## Troubleshooting

### "Profile already in use" Error
- **Solution**: Close all Chrome windows first, then run the Flutter command again

### Can't Find Profile
- **Solution**: Make sure Chrome is installed and you've used that profile at least once
- Check the path: `C:\Users\<YourUsername>\AppData\Local\Google\Chrome\User Data\`

### Profile Not Staying Signed In
- **Solution**: Make sure you're using the correct profile name
- Try signing in again in that specific Chrome profile
- Check that cookies/localStorage are enabled

## VS Code Launch Configuration

You can also add this to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Flutter Web (Chrome Profile)",
      "type": "dart",
      "request": "launch",
      "program": "lib/main.dart",
      "deviceId": "chrome",
      "args": [
        "--web-browser-flag=--user-data-dir=${env:LOCALAPPDATA}/Google/Chrome/User Data",
        "--web-browser-flag=--profile-directory=Default"
      ]
    }
  ]
}
```

## Notes

- The profile directory must exist before using it
- You may need to close all Chrome windows before running Flutter
- Each profile maintains its own cookies, localStorage, and sign-in state
- The script will list available profiles when you run it
