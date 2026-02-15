# Script to backup LOKI landing page to GitHub
# Run this script after closing Cursor/VS Code to avoid lock file issues

Write-Host "Initializing git repository..." -ForegroundColor Cyan
cd c:\Dev\loki-landing

# Remove any existing lock files
if (Test-Path .git\config.lock) {
    Remove-Item .git\config.lock -Force -ErrorAction SilentlyContinue
}
if (Test-Path .git\index.lock) {
    Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue
}

# Initialize git if needed
if (-not (Test-Path .git)) {
    git init
}

# Add remote if not already added
$remoteExists = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Adding remote repository..." -ForegroundColor Cyan
    git remote add origin https://github.com/JeremyJarman/Loki-landing.git
} else {
    Write-Host "Remote already configured: $remoteExists" -ForegroundColor Green
}

# Stage all files
Write-Host "Staging all files..." -ForegroundColor Cyan
git add .

# Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "Committing changes..." -ForegroundColor Cyan
    git commit -m "Initial commit: LOKI landing page with React, TypeScript, and TailwindCSS"
    
    # Determine default branch name
    $branch = git branch --show-current
    if (-not $branch) {
        $branch = "main"
        git branch -M main
    }
    
    Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
    git push -u origin $branch
    
    Write-Host "`nBackup complete! Your code has been pushed to GitHub." -ForegroundColor Green
} else {
    Write-Host "No changes to commit. Everything is up to date." -ForegroundColor Yellow
}
