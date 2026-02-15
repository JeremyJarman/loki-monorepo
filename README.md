# LOKI Monorepo

Single repo for LOKI: admin dashboard, consumer web app, landing page, and mobile app (Flutter).

## Structure

```
loki-monorepo/
├── apps/
│   ├── admin/       Next.js admin dashboard
│   ├── frontend/    Next.js consumer web app
│   ├── landing/     Vite + React landing page
│   └── mobile/      Flutter app (iOS, Android, web)
├── packages/
│   ├── shared/      @loki/shared — types, Firestore paths, utils
│   └── loki_design_system/  Design tokens (Flutter)
└── package.json
```

## Quick Start

```bash
npm install
```

### Run apps

| App | Command |
|-----|---------|
| Admin | `npm run dev:admin` |
| Frontend | `npm run dev:frontend` |
| Landing | `npm run dev:landing` |
| Mobile (Flutter) | `cd apps/mobile && flutter run` |

### Build

```bash
npm run build:admin
npm run build:frontend
npm run build:landing
```

Mobile: `cd apps/mobile && flutter build web` (or `apk` / `ios`)

Design tokens: after editing `apps/admin/design-system/tokens/`, run `npm run build:tokens`.

## Environment Setup

- **Admin & Frontend:** Copy `.env.example` to `.env.local` in each app. Add Firebase config (see `apps/admin/README.md`).
- **Landing:** Copy `apps/landing/.env.example` to `apps/landing/.env.local`. Add Mailchimp form URL and honeypot field.
- **Mobile:** Run `flutterfire configure` in `apps/mobile` to generate `firebase_options.dart` (gitignored).

## Docs

- `SECURITY_CHECKLIST.md` — Before pushing to GitHub
- `apps/admin/README.md` — Admin setup
- `apps/landing/DEPLOYMENT.md` — Hostinger deployment
- `DATA_STRUCTURE_CHANGELOG.md` — Firestore schema changes
