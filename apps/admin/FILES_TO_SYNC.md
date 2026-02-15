# Files to Copy Across — LOKI Admin ↔ Mobile / Web

Use this when syncing **data structures and shared logic** from the admin repo to the mobile app or consumer web app. It also suggests **better long-term approaches** so you don’t rely on manual copy-paste.

**Unifying repos?** If you want to merge LOKI, loki-landing, and loki-admin into one monorepo with a shared package for types and handle utils, see **[MONOREPO_MIGRATION.md](./MONOREPO_MIGRATION.md)** for step-by-step instructions.

---

## Copy these 3 files (minimum)

For **data structure and behaviour** to stay in sync, copy (or reimplement) these in the other codebase:

1. **`lib/types.ts`** — Venue, Experience, MenuItem, MenuSection, etc. (includes `visibility`, `ownerId`, `claimed`, `handle`, `allergens`, etc.)
2. **`lib/handleUtils.ts`** — Handle validation and generation from name (same rules everywhere).
3. **`DATA_STRUCTURE_CHANGELOG.md`** — What changed and how to use the new fields (visibility, ownerId, handle, allergens, etc.).

Optional: `STYLE_GUIDE.md`, `STYLE_GUIDE_PROMPT.md`, `EXPERIENCE_SAVE_FORMAT.md` (see tables below).

---

## 1. Files that impact app function (copy these)

These are the files that **directly affect behaviour** (types, validation, constants). Copy or reimplement them in the other codebase so both sides stay in sync.

| File | Purpose | What to do |
|------|---------|------------|
| **`lib/types.ts`** | Canonical Venue, Experience, MenuSection, MenuItem, etc. | Copy as-is or generate types from it. Any change to Firestore shape should be reflected here first, then in the other app. |
| **`lib/handleUtils.ts`** | Handle validation + generation from name | Copy or reimplement (same rules). Used for venue handle on create/edit. |
| **`DATA_STRUCTURE_CHANGELOG.md`** | Changelog of data/storage and behaviour changes | Copy or keep in a shared doc; use when updating mobile/web to match admin. |

**Optional but useful:**

| File | Purpose |
|------|---------|
| **`STYLE_GUIDE.md`** | Design tokens (colors, fonts, shadows, etc.) for consistent UI. |
| **`STYLE_GUIDE_PROMPT.md`** | Prompt to give to AI/developers so they follow the style guide. |
| **`EXPERIENCE_SAVE_FORMAT.md`** | Exact format for saving experiences (if the other app writes to `experiences`). |

---

## 2. Admin-only files (reference only)

You don’t need to “run” these in the mobile/web app, but they’re useful as reference when implementing the same behaviour or design.

| File | Use |
|------|-----|
| `STORAGE_STRUCTURE.md` | Firebase Storage paths for images. |
| `EXPERIENCE_INSTANCES_FORMAT.md` | Format of experience instances. |
| `RECURRING_EXPERIENCES_FORMAT.md` | Recurrence rules for experiences. |
| `DESIGN_BRIEF.md` | Broader design system. |
| `STYLE_GUIDE.md` | Single source for fonts, colors, shadows, header, mobile light mode. |

---

## 3. What to copy per platform

### Mobile app (React Native / Flutter / etc.)

- **Required:** `lib/types.ts` (or generate equivalent types), `lib/handleUtils.ts` (or same rules in your language), `DATA_STRUCTURE_CHANGELOG.md`.
- **Recommended:** `STYLE_GUIDE.md` (Section 3 + tokens) and/or `STYLE_GUIDE_PROMPT.md` for UI consistency.
- **If you write experiences:** `EXPERIENCE_SAVE_FORMAT.md`.

### Consumer web app

- **Required:** Same as mobile (types, handleUtils, changelog).
- **Recommended:** `STYLE_GUIDE.md` and `STYLE_GUIDE_PROMPT.md` so header and styling match admin.

### Another admin or backend service

- **Required:** `lib/types.ts`, `lib/handleUtils.ts`, `DATA_STRUCTURE_CHANGELOG.md`.
- **Recommended:** `EXPERIENCE_SAVE_FORMAT.md`, `STORAGE_STRUCTURE.md`, and any other format docs you rely on.

---

## 4. Better approaches (avoid manual copy where possible)

Manual copy works but drifts over time. Prefer one of these if you can.

### A. Single repo (monorepo)

- Keep **admin**, **mobile**, and **web** in one repo (e.g. `apps/admin`, `apps/mobile`, `apps/web`).
- Put shared code in a **shared package** (e.g. `packages/shared` or `packages/types`).
- **`lib/types.ts`** and **`lib/handleUtils.ts`** live in the shared package; admin and mobile/web import from it.
- **Pros:** One source of truth, refactors in one place. **Cons:** Repo and tooling get bigger.

### B. Shared npm package (private or public)

- Publish a small package (e.g. `@loki/shared` or `@loki/types`) with:
  - Types (Venue, Experience, MenuItem, etc.)
  - Handle validation + generation
  - Constants (e.g. allergen list, tag lists)
- Admin and mobile/web depend on it (`npm install @loki/shared`).
- **Pros:** Versioned, each app chooses when to upgrade. **Cons:** Need to publish and maintain the package.

### C. Git submodule

- Put **only** shared types + utils (and maybe docs) in a small repo.
- Add it as a **submodule** in both admin and mobile repos.
- **Pros:** Single copy of the code, explicit updates via submodule. **Cons:** Submodule workflow can be fiddly; both sides must remember to pull and use the same ref.

### D. “Single source of truth” doc + codegen (advanced)

- Keep **DATA_STRUCTURE_CHANGELOG.md** (or a single schema doc) as the human-readable source.
- Use a small script or codegen to generate types (and maybe validation) for TypeScript and other languages from that doc or from a JSON schema.
- **Pros:** One doc drives everything. **Cons:** More setup; doc and codegen must be kept in sync.

### E. Keep using docs + manual copy (what you have now)

- **DATA_STRUCTURE_CHANGELOG.md** + **FILES_TO_SYNC.md** list what changed and what to copy.
- When you change types or handle rules, update the changelog and copy the listed files (or their equivalents) to the other repo.
- **Pros:** Simple, no extra infra. **Cons:** Easy to forget a file or a field; drift over time.

**Recommendation:** If admin and mobile/web are in the same org and you expect more shared logic, **monorepo + shared package** (A or B) is the most robust. If you want minimal setup, **E** plus a recurring “sync checklist” (using this file and the changelog) is fine; just review both docs when you change data or behaviour.

---

## 5. Quick checklist when you change data or behaviour

When you add or change a Firestore field or validation in the admin:

1. Update **`lib/types.ts`** (and any create/payload code).
2. Update **`DATA_STRUCTURE_CHANGELOG.md`** (new/changed fields, defaults, rules).
3. If handle rules change, update **`lib/handleUtils.ts`** and the changelog.
4. Copy (or publish) the files listed in **Section 1** to the other repo, or bump the shared package version and update the other app.
5. In the other app, update types and any code that reads/writes the changed fields.

---

**Version:** 1.0  
**Last updated:** January 2026
