# Unifying LOKI repos into a monorepo

This guide walks you through merging your three repos into one monorepo so you can share types and utils (e.g. `lib/types.ts`, `lib/handleUtils.ts`) across admin, landing, web, and mobile.

**Current setup**

| Repo          | Contents                    |
|---------------|-----------------------------|
| **LOKI**      | Mobile app(s) + Web app     |
| **loki-landing** | Landing page            |
| **loki-admin**   | Admin app (this repo)   |

**Target: single repo with workspaces**

```
loki/                          # new root repo
├── package.json               # workspace root
├── apps/
│   ├── admin/                 # current loki-admin
│   ├── landing/               # current loki-landing
│   │   # web/                 # (commented out for now) future React web app; LOKI web is Flutter from apps/mobile
│   └── mobile/                # mobile app(s) from LOKI; run web via flutter run -d chrome
├── packages/
│   └── shared/                # types, handleUtils, constants
│       ├── package.json
│       ├── src/
│       │   ├── types.ts
│       │   ├── handleUtils.ts
│       │   └── index.ts
│       └── tsconfig.json
├── DATA_STRUCTURE_CHANGELOG.md
├── FILES_TO_SYNC.md
└── MONOREPO_MIGRATION.md
```

---

## 1. Choose a location and create the monorepo root

Do this on your machine (same parent folder as your existing repos is easiest).

```bash
# Example: all repos live in c:\Dev\
cd c:\Dev
mkdir loki-monorepo
cd loki-monorepo
git init
```

---

## 2. Set up npm workspaces

Create the root `package.json`:

```json
{
  "name": "loki-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:admin": "npm run dev -w apps/admin",
    "dev:landing": "npm run dev -w apps/landing",
    "build:admin": "npm run build -w apps/admin",
    "build:landing": "npm run build -w apps/landing"
  }
}
```

When you add a React web app in `apps/web` later, add `"dev:web": "npm run dev -w apps/web"` and `"build:web": "npm run build -w apps/web"` to `scripts`.

Add a root `.gitignore` (merge in whatever you use in admin/landing/LOKI):

```
node_modules
.next
.turbo
dist
.env*.local
*.log
```

---

## 3. Create the shared package

```bash
mkdir -p packages/shared/src
```

**`packages/shared/package.json`**

```json
{
  "name": "@loki/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types.ts",
    "./handleUtils": "./src/handleUtils.ts"
  },
  "peerDependencies": {
    "firebase": ">=10.0.0"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

**`packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`packages/shared/src/types.ts`**  
Copy the full contents of **loki-admin** `lib/types.ts` here (it already uses `Timestamp` from `firebase/firestore`).

**`packages/shared/src/handleUtils.ts`**  
Copy the full contents of **loki-admin** `lib/handleUtils.ts` here (no Firebase dependency).

**`packages/shared/src/index.ts`**

```ts
export * from './types';
export * from './handleUtils';
```

---

## 4. Move each app into `apps/`

From the **monorepo root**:

- **Admin**  
  Copy the entire contents of **loki-admin** (except `node_modules`, `.next`, `.git`) into `apps/admin/`.  
  If you prefer to keep git history: use `git subtree` or clone loki-admin and move it (see Section 7).

- **Landing**  
  Copy the entire contents of **loki-landing** (except `node_modules`, build output, `.git`) into `apps/landing/`.

- **Mobile (from LOKI)**  
  Copy the mobile app into `apps/mobile/`. Web is built from Flutter (`flutter run -d chrome` / `flutter build web`) for now.  
  <!-- When you add a React web app later, copy it into apps/web/. -->

Example (copy only, no git):

```bash
# From monorepo root
cp -r ../loki-admin/* apps/admin/    # then remove apps/admin/node_modules, .next, .git if copied
cp -r ../loki-landing/* apps/landing/
# Copy from LOKI repo into apps/mobile (web build is Flutter from apps/mobile for now)
# cp -r ../LOKI/* apps/mobile/   # or whatever your LOKI repo path is
```

On Windows (PowerShell) you can use `Copy-Item -Recurse` or robocopy, and manually exclude `node_modules`, `.next`, `.git`.

---

## 5. Wire the admin app to `@loki/shared`

In **`apps/admin/package.json`** add:

```json
"dependencies": {
  "@loki/shared": "workspace:*",
  ...
}
```

In **`apps/admin`**, replace local type/handle imports with the shared package:

- Where you have `from '@/lib/types'` or `from '../../lib/types'`, switch to `from '@loki/shared'` or `from '@loki/shared/types'`.
- Where you have `from '@/lib/handleUtils'` or `from '../../lib/handleUtils'`, switch to `from '@loki/shared'` or `from '@loki/shared/handleUtils'`.

Then remove (or stop using) **`apps/admin/lib/types.ts`** and **`apps/admin/lib/handleUtils.ts`** so the single source of truth is `packages/shared`. Keep `lib/firebase.ts`, `lib/storage.ts` etc. in the admin app.

Run from monorepo root:

```bash
npm install
npm run dev:admin
```

Fix any path or type errors until the admin app builds and runs.

---

## 6. Wire landing, web, and mobile to `@loki/shared` (optional)

- **Landing**  
  Add `"@loki/shared": "workspace:*"` only if the landing page needs LOKI types or handle utils; otherwise you can skip.

- **Web** (commented out for now — we use Flutter for web; when you add a React app in `apps/web` later, add `"@loki/shared": "workspace:*"` there and replace local types/handleUtils with `@loki/shared`.)

- **Mobile**  
  Same idea: add the workspace dependency and point to `@loki/shared`. If the mobile app is not JavaScript/TypeScript, you’ll need to either consume the shared package via a small JS/TS bridge or reimplement types and handle rules from `DATA_STRUCTURE_CHANGELOG.md` and `packages/shared`.

---

## 7. Preserving git history (optional)

If you want to keep the commit history of each repo inside the monorepo:

**Option A – Add existing repos as remotes and merge**

```bash
cd c:\Dev\loki-monorepo
git remote add admin ../loki-admin
git fetch admin
git merge admin/main --allow-unrelated-histories
mkdir -p apps/admin
git mv <everything except apps/admin> apps/admin/   # adjust: move current root content into apps/admin
git commit -m "Move loki-admin into apps/admin"
```

Repeat the idea for landing and LOKI (merge, then move into `apps/landing`, `apps/mobile`). When you add a React web app later, move it into `apps/web`. This can get messy; many teams do a one-time merge and then rely on the new monorepo history.

**Option B – Fresh start (simplest)**

- Create the monorepo with a single initial commit (root `package.json`, workspaces, `.gitignore`).
- Copy in each app and the shared package as plain files (no git history from the old repos).
- Commit “Add apps and shared package.”

You can keep the old repos as read-only archives.

---

## 8. Copy shared docs to the root

Copy these from **loki-admin** to the monorepo root so they’re the single place for data-structure and sync guidance:

- `DATA_STRUCTURE_CHANGELOG.md`
- `FILES_TO_SYNC.md`
- `MONOREPO_MIGRATION.md`

Update **FILES_TO_SYNC.md** to say that types and handleUtils now live in **`packages/shared`** and that other apps should depend on `@loki/shared` instead of copying files.

---

## 9. CI/CD and deployment

- **Build**  
  From the root you can run `npm run build:admin`, `npm run build:landing` (and `npm run build:web` when you add a React web app). Web is built from Flutter: `flutter build web` from `apps/mobile`. In CI, run `npm install` at the root so all workspaces are installed.

- **Deploy**  
  Point your existing pipelines (Vercel, Netlify, etc.) at the right app directory (e.g. `apps/admin`, `apps/landing`; `apps/web` when you add the React app). Most hosts let you set “Root directory” to `apps/admin` etc.

- **Optional: Turborepo**  
  For caching and task orchestration, you can add Turborepo later and keep the same `apps/*` and `packages/*` layout.

---

## 10. Checklist

- [ ] Create monorepo root and `package.json` with workspaces.
- [ ] Add `packages/shared` and copy `lib/types.ts` and `lib/handleUtils.ts` from loki-admin; add `index.ts`.
- [ ] Move loki-admin → `apps/admin`, loki-landing → `apps/landing`, LOKI mobile → `apps/mobile` (web = Flutter from apps/mobile for now; add `apps/web` when you add a React app).
- [ ] In `apps/admin`, add `@loki/shared`, switch imports, remove local `lib/types.ts` and `lib/handleUtils.ts`.
- [ ] Run `npm install` at root and `npm run dev:admin` (then landing as needed; web via `flutter run -d chrome` from apps/mobile).
- [ ] Copy `DATA_STRUCTURE_CHANGELOG.md`, `FILES_TO_SYNC.md`, `MONOREPO_MIGRATION.md` to root; update FILES_TO_SYNC to reference `packages/shared`.
- [ ] Update CI/deploy to use repo root and the correct app directory.
- [ ] (Optional) Preserve git history with Option A or B in Section 7.

Once this is done, you’ll have one repo, shared types and handle utils in `packages/shared`, and no need to manually copy `lib/types.ts` / `lib/handleUtils.ts` across repos.
