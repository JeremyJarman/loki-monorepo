# Simple script to run Flutter web app
# Opens in your current/default Chrome instance

Write-Host "Launching Flutter web app in Chrome..." -ForegroundColor Green
Write-Host "This will open in your default Chrome browser (where you're already signed in)" -ForegroundColor Cyan
Write-Host ""

flutter run -d chrome
