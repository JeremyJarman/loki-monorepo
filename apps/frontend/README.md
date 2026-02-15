# LOKI Frontend

Web app for discovering specials, managing lists, and collaborating with friends. Uses the same design system as the admin and landing apps (Crimson Text, DM Sans, Roboto Mono, primary green/orange palette).

## Run locally

From the monorepo root:

```bash
npm run dev:frontend
```

Or from this directory:

```bash
npm run dev
```

The app will be at **http://localhost:3001** (admin uses 3000).

## Environment

Create `apps/frontend/.env.local` with the same Firebase config as admin (same project is typical):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

You can copy from `apps/admin/.env.local` if you use one project.

## Auth

The app requires sign-in. Use existing Firebase Auth users (email/password). Unauthenticated users are redirected to `/login`.

## Structure

- **Home** (`/`) – Activity feed placeholder; links to Discover and Profile.
- **Discover** (`/discover`) – All visible specials (same data as admin specials preview), with category/price/keyword filters.
- **Profile** (`/profile`) – User profile and lists (personal and collaborative). List entries link to the list view.
- **List view** (`/lists/[listId]`) – Hybrid list layout: fixed header (title, collaborators, stats, Edit/Share/Sort), medium list item cards with “Added by” and reaction/comment counts, expandable discussion section, and “Add Special” CTA. Uses mock list data until Firestore lists are wired.

Build: `npm run build` (from this directory) or `npm run build:frontend` from the repo root.
