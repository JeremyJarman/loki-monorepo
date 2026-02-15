# LOKI Admin Portal

Admin web portal for managing venues and events for the LOKI mobile app.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your LOKI project
3. Go to **Project Settings** → **General**
4. Scroll down to **Your apps** section
5. If you don't have a web app, click **Add app** → **Web** (</> icon)
6. Copy the Firebase configuration values

### 3. Create Environment File

1. Create a `.env.local` file in the root directory
2. Fill in your Firebase configuration values and OpenAI API key:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# OpenAI API Key (for AI Test feature)
# Get your API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Access control

Only users with **admin** or **superadmin** role can sign in to the admin portal. Roles are stored in Firestore in the `users/{uid}` document (`role` field). If a user signs in but their role is not admin/superadmin, they are signed out and see "Access denied. Admin or Superadmin role required." on the login page.

- **Users** tab: lists all documents in the `users` collection (email, UID, role). Admins can change a user's role (user, admin, superadmin). Firestore rules must allow read/write on `users` for authenticated users with role admin or superadmin (e.g. using a custom claim or a get() on the current user's doc to check role).

## Features

### Venues Management
- ✅ Create new venues
- ✅ View all venues
- ✅ Delete venues
- ⏳ Edit venues (coming soon)
- ⏳ Upload venue images (coming soon)

### Events Management
- ✅ Create new events
- ✅ View all events
- ✅ Delete events
- ⏳ Edit events (coming soon)
- ⏳ Upload event images (coming soon)

### AI Test
- ✅ Test OpenAI API integration
- ✅ Generate venue descriptions using custom prompts
- ✅ Copy generated text to clipboard

### Users
- ✅ List users (from Firestore `users` collection)
- ✅ View and edit user roles (user, admin, superadmin)

## Data Models

### Venue
- `name` (string, required)
- `description` (string, required)
- `address` (string, required)
- `location` (GeoPoint, required) - latitude/longitude
- `atmosphere` (string, optional)
- `phone` (string, optional)
- `openingHours` (object, optional)
- `imageUrl` (array of strings, optional)

### Event
- `name` (string, required)
- `description` (string, required)
- `venueId` (string, required) - reference to venue
- `dateTime` (Timestamp, required)
- `cost` (string, optional)
- `imageUrl` (string, optional)

## Getting Coordinates

To get latitude/longitude for venues:
1. Use [Google Maps](https://www.google.com/maps)
2. Right-click on the location
3. Click the coordinates to copy them
4. Format: `latitude, longitude` (e.g., `40.7128, -74.0060`)

## Next Steps

- [x] Add authentication (admin login, role-based)
- [ ] Add image upload functionality
- [ ] Add edit functionality for venues and events
- [ ] Add opening hours editor
- [ ] Add location picker with map
- [ ] Add bulk import/export
