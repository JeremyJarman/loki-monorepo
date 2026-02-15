# Files to Copy Across — LOKI Admin ↔ Mobile / Web

Use this when syncing **data structures and shared logic** from the admin repo to the mobile app or consumer web app. It also suggests **better long-term approaches** so you don't rely on manual copy-paste.

**In this monorepo:** Types and handle utils live in **`packages/shared`** (`@loki/shared`). Admin, web, and mobile should depend on `@loki/shared` (e.g. `"@loki/shared": "workspace:*"`) instead of copying `lib/types.ts` or `lib/handleUtils.ts`. See **MONOREPO_MIGRATION.md** (in `apps/admin/`) for full migration steps.

---

## Copy these 3 things (minimum) — when outside this repo

For **data structure and behaviour** to stay in sync with another codebase (e.g. a separate mobile repo):

1. **`packages/shared`** (or its types + handleUtils) — Venue, Experience, MenuItem, MenuSection, handle validation and generation.
2. **`DATA_STRUCTURE_CHANGELOG.md`** — What changed and how to use the new fields (visibility, ownerId, handle, allergens, etc.).

Optional: `STYLE_GUIDE.md`, `STYLE_GUIDE_PROMPT.md`, `EXPERIENCE_SAVE_FORMAT.md` (see tables below).

---

## 1. Files that impact app function

| File / package | Purpose | What to do |
|----------------|---------|------------|
| **`packages/shared`** (`@loki/shared`) | Canonical Venue, Experience, MenuSection, MenuItem, handleUtils | In this repo: add `"@loki/shared": "workspace:*"` and import from `@loki/shared`. Outside: copy types + handleUtils or depend on published package. |
| **`DATA_STRUCTURE_CHANGELOG.md`** | Changelog of data/storage and behaviour changes | Copy or keep as shared doc; use when updating mobile/web to match admin. |

**Optional but useful:**

| File | Purpose |
|------|---------|
| **`STYLE_GUIDE.md`** | Design tokens (colors, fonts, shadows, etc.) for consistent UI. |
| **`STYLE_GUIDE_PROMPT.md`** | Prompt to give to AI/developers so they follow the style guide. |
| **`EXPERIENCE_SAVE_FORMAT.md`** | Exact format for saving experiences (if the other app writes to `experiences`). |

---

## 2. Admin-only files (reference only)

You don't need to "run" these in the mobile/web app, but they're useful as reference when implementing the same behaviour or design.

| File | Use |
|------|-----|
| `STORAGE_STRUCTURE.md` | Firebase Storage paths for images. |
| `EXPERIENCE_INSTANCES_FORMAT.md` | Format of experience instances. |
| `RECURRING_EXPERIENCES_FORMAT.md` | Recurrence rules for experiences. |
| `DESIGN_BRIEF.md` | Broader design system. |
| `STYLE_GUIDE.md` | Single source for fonts, colors, shadows, header, mobile light mode. |

---

## 3. What to copy per platform

### Mobile app (React Native / Flutter / etc.) — in or outside this repo

- **In this repo:** Depend on `@loki/shared` and use `DATA_STRUCTURE_CHANGELOG.md`.
- **Outside:** Copy types + handleUtils (or equivalent) and `DATA_STRUCTURE_CHANGELOG.md`. Recommended: `STYLE_GUIDE.md` and/or `STYLE_GUIDE_PROMPT.md`. If you write experiences: `EXPERIENCE_SAVE_FORMAT.md`.

### Consumer web app

- **Required:** Same as mobile (types/handleUtils via `@loki/shared` or copy, plus changelog).
- **Recommended:** `STYLE_GUIDE.md` and `STYLE_GUIDE_PROMPT.md` so header and styling match admin.

### Another admin or backend service

- **Required:** `packages/shared` (or types + handleUtils), `DATA_STRUCTURE_CHANGELOG.md`.
- **Recommended:** `EXPERIENCE_SAVE_FORMAT.md`, `STORAGE_STRUCTURE.md`, and any other format docs you rely on.

---

## 4. Quick checklist when you change data or behaviour

When you add or change a Firestore field or validation in the admin:

1. Update **`packages/shared/src/types.ts`** (and any create/payload code).
2. Update **`DATA_STRUCTURE_CHANGELOG.md`** (new/changed fields, defaults, rules).
3. If handle rules change, update **`packages/shared/src/handleUtils.ts`** and the changelog.
4. In other apps in this repo, ensure they use `@loki/shared` and pull latest. Outside: copy or publish the shared package and update the other app.
5. In the other app, update types and any code that reads/writes the changed fields.

---

**Version:** 1.0  
**Last updated:** January 2026
