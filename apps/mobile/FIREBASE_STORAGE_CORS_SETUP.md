# Firebase Storage CORS Setup for Web

## Problem
Images from Firebase Storage are not loading on the web app due to CORS (Cross-Origin Resource Sharing) restrictions.

## Solution: Configure CORS on Firebase Storage Bucket

Your storage bucket: `YOUR_PROJECT_ID.firebasestorage.app` (replace with your Firebase project ID)

### Option 1: Using Google Cloud Console (Recommended)

**Important**: CORS configuration is done in **Google Cloud Console**, NOT in Firebase Console Storage section.

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com
   - Make sure you're logged in with the same Google account as Firebase
   - Select your project (use the project selector at the top)

2. **Navigate to Cloud Storage**
   - In the left hamburger menu (☰), click on **"Cloud Storage"** → **"Buckets"**
   - If you don't see "Cloud Storage" in the menu, you may need to enable the API first:
     - Go to "APIs & Services" → "Library"
     - Search for "Cloud Storage API" and enable it

3. **Find Your Bucket**
   - Look for a bucket named: `YOUR_PROJECT_ID.firebasestorage.app`
   - If you don't see it, it might be named differently. Check:
     - Buckets starting with your project ID
     - Or the default bucket might be `YOUR_PROJECT_ID.appspot.com`

4. **Configure CORS**
   - Click on your bucket name to open it
   - Click on the **"Configuration"** tab at the top
   - Scroll down to find **"CORS configuration"** section
   - Click **"Edit CORS configuration"** button
   - If you see existing configuration, you can add to it or replace it
   - Add the following JSON:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

4. **Save** the configuration

### Option 2: Using gsutil Command Line

1. **Install Google Cloud SDK** (if not already installed)
   - Download from: https://cloud.google.com/sdk/docs/install
   - Or use Cloud Shell in Google Cloud Console

2. **Create a CORS configuration file** (`cors.json`):

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

3. **Apply CORS configuration**:

```bash
gsutil cors set cors.json gs://YOUR_PROJECT_ID.firebasestorage.app
```

4. **Verify the configuration**:

```bash
gsutil cors get gs://YOUR_PROJECT_ID.firebasestorage.app
```

### Option 3: More Secure (Production)

For production, replace `"*"` with your specific domain(s):

```json
[
  {
    "origin": [
      "http://localhost:*",
      "https://your-domain.com",
      "https://www.your-domain.com"
    ],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

## After Configuration

1. **Clear browser cache** or use incognito mode
2. **Hard refresh** the web app (Ctrl+Shift+R or Cmd+Shift+R)
3. **Check browser console** (F12) for any remaining CORS errors

## Verify It's Working

After configuring CORS, images should load properly. If you still see issues:

1. Check browser console (F12) for specific error messages
2. Verify Storage rules allow public read access (if images are public)
3. Ensure image URLs are valid Firebase Storage download URLs

## Storage Rules Check

Also verify your Storage rules allow reading. In Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow public read access to images
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Quick Test

After setting up CORS, try accessing an image URL directly in your browser. If it loads, CORS is configured correctly.

## Can't Find CORS Configuration?

If you don't see the CORS configuration option:

1. **Make sure you're in Google Cloud Console** (not Firebase Console)
   - URL should be: `console.cloud.google.com`
   - NOT: `console.firebase.google.com`

2. **Enable Cloud Storage API** (if needed):
   - Go to: https://console.cloud.google.com/apis/library/storage-component.googleapis.com
   - Click "Enable"

3. **Check if you have the right permissions**:
   - You need "Storage Admin" or "Owner" role on the project
   - Check in: IAM & Admin → IAM

4. **Alternative: Use Firebase CLI with gsutil**:
   - This is often easier - see Option 2 below
