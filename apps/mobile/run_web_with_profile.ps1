# PowerShell script to run Flutter web app with a specific Chrome profile
# This allows you to stay signed in to your Google account
# 
# NOTE: If you just want to open in your current Chrome instance, use run_web.ps1 instead

# Find your Chrome profile directory
# Default location: C:\Users\<YourUsername>\AppData\Local\Google\Chrome\User Data
$chromeUserData = "$env:LOCALAPPDATA\Google\Chrome\User Data"

# List available profiles
Write-Host "`nAvailable Chrome profiles:" -ForegroundColor Green
$allProfiles = @()
$defaultProfile = Get-ChildItem -Path $chromeUserData -Directory -Filter "Default" -ErrorAction SilentlyContinue
if ($defaultProfile) {
    Write-Host "  [1] Default" -ForegroundColor Yellow
    $allProfiles += "Default"
}
$numberedProfiles = Get-ChildItem -Path $chromeUserData -Directory -Filter "Profile *" -ErrorAction SilentlyContinue | Sort-Object Name
$profileIndex = 2
foreach ($profile in $numberedProfiles) {
    Write-Host "  [$profileIndex] $($profile.Name)" -ForegroundColor Yellow
    $allProfiles += $profile.Name
    $profileIndex++
}

# Prompt user to select a profile
Write-Host "`nSelect a Chrome profile to use:" -ForegroundColor Cyan
$selectedIndex = Read-Host "Enter the number (1-$($allProfiles.Count)) or press Enter for Default"

# Validate and set profile name
$profileName = "Default"  # Default fallback
if ([string]::IsNullOrWhiteSpace($selectedIndex)) {
    $profileName = "Default"
    Write-Host "Using default profile: Default" -ForegroundColor Green
} else {
    $index = [int]$selectedIndex
    if ($index -ge 1 -and $index -le $allProfiles.Count) {
        $profileName = $allProfiles[$index - 1]
        Write-Host "Selected profile: $profileName" -ForegroundColor Green
    } else {
        Write-Host "Invalid selection. Using default profile: Default" -ForegroundColor Yellow
        $profileName = "Default"
    }
}

# Alternative: Use a custom user data directory
# Uncomment and modify the line below if you want to use a completely separate Chrome instance
# $customUserData = "C:\Dev\LOKI\chrome_profile"

# Set Chrome executable path (usually in Program Files)
$chromePath = "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
}

if (-not (Test-Path $chromePath)) {
    Write-Host "Error: Chrome not found at $chromePath" -ForegroundColor Red
    Write-Host "Please install Google Chrome or update the path in this script." -ForegroundColor Red
    exit 1
}

# Build the Chrome arguments
$chromeArgs = @(
    "--user-data-dir=`"$chromeUserData`"",
    "--profile-directory=`"$profileName`""
)

# Convert arguments to a single string
$chromeArgsString = $chromeArgs -join " "

# Verify the profile exists
$profilePath = Join-Path $chromeUserData $profileName
if (-not (Test-Path $profilePath)) {
    Write-Host "`nError: Profile '$profileName' not found at $profilePath" -ForegroundColor Red
    Write-Host "Available profiles:" -ForegroundColor Yellow
    Get-ChildItem -Path $chromeUserData -Directory | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Yellow }
    exit 1
}

Write-Host "Profile path verified: $profilePath" -ForegroundColor Green
Write-Host ""

# Check if Chrome is already running
$chromeProcesses = Get-Process -Name "chrome" -ErrorAction SilentlyContinue
if ($chromeProcesses) {
    Write-Host "Warning: Chrome is already running. You may need to close all Chrome windows first." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to cancel, or wait 5 seconds to continue anyway..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

# Set environment variable for Flutter to use
$env:CHROME_EXECUTABLE = $chromePath

# Run Flutter with Chrome flags
Write-Host "`nLaunching Flutter web app with Chrome profile: $profileName" -ForegroundColor Green
Write-Host "Chrome path: $chromePath" -ForegroundColor Cyan
Write-Host "Profile directory: $profileName" -ForegroundColor Cyan
Write-Host "User data directory: $chromeUserData" -ForegroundColor Cyan
Write-Host "`nNote: If this doesn't work, you may need to:" -ForegroundColor Yellow
Write-Host "  1. Close ALL Chrome windows first (including background processes)" -ForegroundColor Yellow
Write-Host "  2. Make sure you're signed in to your Google account in that Chrome profile" -ForegroundColor Yellow
Write-Host "`nRunning: flutter run -d chrome --web-browser-flag=`"--user-data-dir=$chromeUserData`" --web-browser-flag=`"--profile-directory=$profileName`"" -ForegroundColor Gray
Write-Host ""

# Run Flutter with Chrome flags
# Note: Make sure all Chrome windows are closed before running
flutter run -d chrome `
    --web-browser-flag="--user-data-dir=$chromeUserData" `
    --web-browser-flag="--profile-directory=$profileName"
