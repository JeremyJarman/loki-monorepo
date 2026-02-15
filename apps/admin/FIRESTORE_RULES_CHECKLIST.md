# Firestore rules checklist (admin login / getCurrentUserRole)

"Missing or insufficient permissions" means a Firestore read or write was denied by your rules.

## If you see "Missing or insufficient permissions" on startup (frontend home)

The home page loads **suggested users** by reading the **users** collection. If your rules only allow reading **your own** user document (e.g. `allow read: if request.auth.uid == userId`), that read will fail. Fix: use the **full rules file** below, which allows any signed-in user to read any user doc (`allow read, write: if request.auth != null`). Then click **Publish** in Firestore → Rules.

## ⚠️ Rules must be wrapped in `match /databases/{database}/documents`

Firestore only applies rules to paths under **`/databases/{database}/documents`**. If your `match /venues/...` (and other matches) are **directly** inside `service cloud.firestore { ... }` with no wrapper, they do **not** match the real document paths and everything is denied.

**Use this full rules file** (copy everything below, replace your current rules in Firebase Console → Firestore → Rules, then click **Publish**). This includes **lists** and allows **public read** for venues/experiences so the frontend doesn’t get “insufficient permission” on first load:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /handles/{handleId} {
      allow read: if true;
      allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null;
      match /following/{followingId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /followers/{followerId} {
        allow read: if request.auth != null;
        allow create, delete: if request.auth != null && request.auth.uid == followerId;
      }
      match /notifications/{notificationId} {
        allow read, update, delete: if request.auth != null && request.auth.uid == userId;
        allow create: if request.auth != null && request.resource.data.actorId == request.auth.uid;
      }
    }
    match /venues/{venueId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /experiences/{experienceId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /experienceInstances/{instanceId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /lists/{listId} {
      allow read, write: if request.auth != null;
      match /items/{itemId} {
        allow read, write: if request.auth != null;
        match /reactions/{reactionId} {
          allow read, write: if request.auth != null;
        }
        match /comments/{commentId} {
          allow read, write: if request.auth != null;
        }
      }
      match /activity/{activityId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

- **Notifications**: each user can read/update/delete only their own `users/{userId}/notifications/...`. The `match /notifications/{notificationId}` block must be **inside** `match /users/{userId}`. If you get "Missing or insufficient permissions" when opening the bell or /notifications page, paste the **full rules block** above (including the notifications block), then **Publish** in Firestore → Rules.

- **Venues / experiences / experienceInstances**: anyone can **read** (so Discover and first load work); only signed-in users can **write** (admin).
- **Users / lists**: read and write require **signed in** (`request.auth != null`).
- **Users**: the rule `allow read, write: if request.auth != null` lets any signed-in user read **any** user document. This is required for "Suggested for you" (which lists other users) and for viewing profiles. Do **not** use `request.auth.uid == userId` here or you will get "Missing or insufficient permissions" on the home page.
- **Handles** (signup): `handles/{handleId}` stores reserved usernames (doc id = normalized handle, field `uid` = owner). **Read is public** so the signup page can check availability before sign-in. **Create** is allowed only when signed in and `request.resource.data.uid == request.auth.uid`. If you omit the `handles` block, "Create account" will show "Missing or insufficient permissions" when checking handle availability or when reserving the handle after signup.

Then: **Publish** the rules, wait ~30 seconds, hard-refresh (or sign out and sign back in). Frontend and admin should work without “insufficient permission” on open.

## 0. Bypass client rules: server-side role API (recommended)

The admin app can **avoid** client Firestore rules for the login role check by using a server API that reads the role with the **Firebase Admin SDK** (which bypasses security rules).

1. **Add a service account key** to `apps/admin/.env.local`:
   - Firebase Console → Project settings → **Service accounts** → **Generate new private key**.
   - Copy the entire JSON object and put it in one line, then add:
   - `FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}` (the full JSON, no newlines, as a single line).
2. Restart the admin dev server. Login will call `POST /api/auth/role` with your ID token; the server verifies the token and reads `users/{uid}` with Admin SDK, then returns your role. No client Firestore read = no permission error for the role check.

You still need valid Firestore rules for the **Users** page (list users, edit role) if you use client-side Firestore there. The checklist below applies to those operations and to fixing rules if you prefer not to use the service account.

## 1. Correct project

- In **Firebase Console**, confirm you're in the **same project** as in admin `.env.local` (`NEXT_PUBLIC_FIREBASE_PROJECT_ID`).
- In **Firestore** → **Rules**, the rules you edit apply to this project only.

## 2. Rules must be published

- After editing rules, click **Publish**.
- Wait a few seconds and try again.

## 3. Rule for `users` collection

You must have a block that matches the `users` collection. **Exact** shape:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

- If you use a **single** `match /users/{userId}` without `match /databases/...`, that is valid in the console UI (it wraps it for you). The important part is: **path is `users/{userId}`** and **condition is `request.auth != null && request.auth.uid == userId`**.

## 4. Temporary test (any authenticated user can read any user doc)

To confirm the app and project are correct, you can **temporarily** use:

```
match /users/{userId} {
  allow read, write: if request.auth != null;
}
```

- If login works with this, the problem is the `userId` check (e.g. wrong UID or typo).
- Then put back: `request.auth.uid == userId` and publish again.
- If it still fails with the per-user rule, compare in Firebase Console → Authentication the **User UID** of the account you sign in with and the **document ID** of the user doc in `users` (they must be identical).

## 5. No other rule denying first

- If you have a catch-all like `match /{document=**} { allow read, write: if false; }`, it must come **after** the `users` rule or it will deny first. Better: don’t use a catch-all, or make sure `users` is matched by a more specific rule above it.

## 6. Full admin access (venues, specials, events)

The admin app treats **any signed-in user** as an admin: they can view and edit all venues, specials, and events. For that to work, Firestore rules must allow **authenticated users** to read and write the collections the admin uses:

- **venues** – list, create, update, delete venues
- **experiences** – list, create, update, delete (specials and events)
- **experienceInstances** – list, create, update, delete (for one-off events)
- **users** – list and update (for the Users tab; optional if you only use the role API for login)

Example (add these **in addition to** any existing rules, and ensure no catch-all denies first):

```
match /venues/{venueId} {
  allow read, write: if request.auth != null;
}
match /experiences/{experienceId} {
  allow read, write: if request.auth != null;
}
match /experienceInstances/{instanceId} {
  allow read, write: if request.auth != null;
}
```

With these rules, any signed-in admin user can add and edit venues and specials without permission errors.

## 7. Phase 1 social (lists, items, reactions, comments)

For the frontend app to create and view **lists** and list items (social features), add rules for the `lists` collection and its subcollections. Example (any authenticated user can read/write lists for now; tighten later by checking `ownerId` or `collaborators`):

```
match /lists/{listId} {
  allow read, write: if request.auth != null;
  match /items/{itemId} {
    allow read, write: if request.auth != null;
    match /reactions/{reactionId} {
      allow read, write: if request.auth != null;
    }
    match /comments/{commentId} {
      allow read, write: if request.auth != null;
    }
  }
  match /activity/{activityId} {
    allow read, write: if request.auth != null;
  }
}
```

For **users** subcollections (followers, following, saved_lists, notifications, activity_feed), add under `match /users/{userId}`:

```
match /followers/{followerId} { allow read, write: if request.auth.uid == userId; }
match /following/{followingId} { allow read, write: if request.auth.uid == userId; }
match /saved_lists/{listId} { allow read, write: if request.auth.uid == userId; }
match /notifications/{notificationId} { allow read, write: if request.auth.uid == userId; }
match /activity_feed/{feedId} { allow read, write: if request.auth.uid == userId; }
```

---

## 8. Firebase Storage rules

Use these in **Firebase Console → Storage → Rules** (separate from Firestore). LOKI uses:

- **venues/{venueId}/** – venue, food, menu images (admin uploads; app reads for display)
- **events/{eventId}/** – event images (admin)
- **specials/{specialId}/** – special/experience images (admin)
- **users/{userId}/** – profile image (frontend: user uploads their own `profile.jpg`)

Copy the rules below, paste into Storage → Rules, then **Publish**:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /venues/{path=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /events/{path=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /specials/{path=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /users/{userId}/{path=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

- **venues, events, specials**: anyone can read (images load in app); only signed-in users can write (admin).
- **users/{userId}/**: anyone can read (profile pics); only that user can write (frontend profile upload).
