# Quick CORS Fix for Firebase Storage

## The Problem
You're looking at Firebase Console Storage section, but CORS configuration is in **Google Cloud Console**, not Firebase Console.

## Fastest Solution: Use Cloud Shell

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com
   - Select your Firebase project

2. **Open Cloud Shell** (top right, icon looks like `>_`)

3. **Run these commands** in Cloud Shell:

```bash
# Create CORS config file
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS to your storage bucket
gsutil cors set cors.json gs://YOUR_PROJECT_ID.firebasestorage.app

# Verify it worked
gsutil cors get gs://YOUR_PROJECT_ID.firebasestorage.app
```

4. **Done!** Refresh your web app and images should load.

## If That Bucket Name Doesn't Work

Try finding your actual bucket name:

```bash
# List all buckets
gsutil ls
```

Then use the correct bucket name in the command above.

## Still Having Issues?

The bucket might be named `YOUR_PROJECT_ID.appspot.com` instead. Try:

```bash
gsutil cors set cors.json gs://YOUR_PROJECT_ID.appspot.com
```
