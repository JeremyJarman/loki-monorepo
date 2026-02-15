# Firebase Authentication Fix

## Problem Identified

The Firebase CLI is having authentication issues. The debug log shows:
- **401 Unauthenticated** errors
- **Token refresh failures** (400 errors)
- Failed to list/create Firebase projects

## Solution: Re-authenticate Firebase CLI

### Step 1: Logout from Firebase CLI

```bash
firebase logout
```

### Step 2: Login to Firebase CLI

```bash
firebase login
```

This will:
1. Open your browser
2. Ask you to sign in with your Google account (j.jarman.zim@gmail.com)
3. Grant permissions to Firebase CLI
4. Complete the authentication

### Step 3: Verify Authentication

```bash
firebase projects:list
```

This should now successfully list your Firebase projects.

### Step 4: Create Project (if needed)

If you need to create a new project:

```bash
firebase projects:create loki-mvp
```

Or use the Firebase Console web interface instead (recommended for first-time setup).

## Alternative: Use Firebase Console Web Interface

Since you're having CLI authentication issues, you can set up everything through the web interface:

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Sign in** with your Google account
3. **Create project** through the web UI
4. **Add Android/iOS apps** through the web UI
5. **Download configuration files** directly from the web UI

This is actually the recommended approach for initial setup, as it's more visual and easier to follow.

## Why This Happened

The authentication tokens stored by Firebase CLI expired or became invalid. This can happen when:
- Tokens expire after a period of inactivity
- You changed your Google account password
- There were network issues during previous authentication
- The tokens were corrupted

## After Re-authenticating

Once you're logged in again, you can:
- List projects: `firebase projects:list`
- Use FlutterFire CLI: `flutterfire configure`
- Deploy Firebase functions (if needed later)
- Manage Firebase from command line

## Quick Fix Commands

```bash
# Logout
firebase logout

# Login (will open browser)
firebase login

# Verify it works
firebase projects:list
```

## Note

You don't actually need Firebase CLI to set up the project initially. The web console is sufficient for:
- Creating the project
- Adding Android/iOS apps
- Downloading configuration files
- Enabling services

The CLI is mainly useful for:
- FlutterFire configuration (`flutterfire configure`)
- Deploying Firebase Functions
- Managing projects from command line

