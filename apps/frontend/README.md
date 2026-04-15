# LOKI Frontend

Web app for discovering specials, managing lists, and collaborating with friends. Uses the same design system as the admin and landing apps (Crimson Text, DM Sans, Roboto Mono, primary green/orange palette).

## Run locally

From the monorepo root:

```bash
npm run dev:frontend
```
## Structure

- **Home** (`/`) – Activity feed placeholder; links to Discover and Profile.
- **Discover** (`/discover`) – All visible specials (same data as admin specials preview), with category/price/keyword filters.
- **Profile** (`/profile`) – User profile and lists (personal and collaborative). List entries link to the list view.
- **List view** (`/lists/[listId]`) – Hybrid list layout: fixed header (title, collaborators, stats, Edit/Share/Sort), medium list item cards with “Added by” and reaction/comment counts, expandable discussion section, and “Add Special” CTA. Uses mock list data until Firestore lists are wired.

Build: `npm run build` (from this directory) or `npm run build:frontend` from the repo root.
