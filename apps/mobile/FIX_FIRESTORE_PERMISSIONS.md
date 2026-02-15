# Fix Firestore Permission Denied Errors

## 🔴 Problem
You're seeing "permission denied" errors when trying to read/write Firestore data. This happens because Firestore security rules are blocking access.

## ✅ Solution: Update Firestore Security Rules

### Step 1: Open Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top

### Step 2: Update Security Rules for Development

**For Development/Testing** (allows all reads/writes):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all reads and writes for development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ WARNING**: These rules allow anyone to read/write your database. Only use for development!

### Step 3: Better Rules (Requires Authentication)

**For Testing with Authentication** (requires users to be signed in):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if true; // Anyone can read user profiles
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Venues - anyone can read, only authenticated users can write
    match /venues/{venueId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Events - anyone can read, only authenticated users can write
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Lists - users can read/write their own lists
    match /lists/{listId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      (request.auth.uid == resource.data.userId || 
                       !resource.exists);
    }
    
    // Follows - users can read all, write their own
    match /follows/{followId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      (request.auth.uid == resource.data.followerId || 
                       !resource.exists);
    }
  }
}
```

### Step 4: Publish Rules
1. After updating the rules, click **Publish** button
2. Rules take effect immediately

## 🎯 Quick Fix for Testing

If you just want to test quickly, use the first set of rules (allows all access). You can tighten security later.

## 📝 About Storage

### ⚠️ Important: Storage Requires Blaze Plan

The Storage page shows "upgrade your project's billing plan" - this is because **Storage requires the Blaze (pay-as-you-go) plan to be enabled**.

**BUT DON'T WORRY!** Here's what this means:

✅ **You won't be charged** - Blaze plan includes the same free tier:
- 5 GB storage (free)
- 1 GB downloads/day (free)
- 20,000 uploads/day (free)

✅ **You only pay** if you exceed these free limits

✅ **Your app works perfectly** without Storage - it uses placeholder images!

### Option 1: Enable Storage (Recommended for Testing)

If you want to test image uploads:

1. Click the **"Upgrade project"** button on the Storage page
2. You'll be taken to billing setup
3. Add a payment method (credit card)
4. **Important**: Set up billing alerts to $0.01 so you get notified if you ever exceed free tier
5. Go back to Storage and click **"Get Started"**
6. Choose **"Start in test mode"**
7. Select a location → **Done**

**You won't be charged** unless you exceed the free limits (which is very unlikely for development).

### Option 2: Skip Storage (Recommended for Now)

**You can skip Storage entirely!** Your app is designed to work without it:
- ✅ Uses placeholder images automatically
- ✅ No crashes or errors
- ✅ Perfect for testing the layout

You can enable Storage later when you're ready to test image uploads.

### Storage Security Rules (for test mode)

After enabling Storage, update Storage rules:

1. Go to **Storage** → **Rules** tab
2. Use these rules for development:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow all reads and writes for development
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click **Publish**

## ✅ Verification

After updating rules:
1. Restart your app
2. Try reading/writing data
3. Permission errors should be gone!

## 🔒 Production Rules

When you're ready for production, you'll want stricter rules. But for now, the development rules above will let you test everything.
