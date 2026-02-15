# Data Structure Changelog — LOKI Admin

This document records **data structure and behaviour changes** that affect how the app works (Firestore documents, types, validation). Use it when syncing with the mobile app, web consumer app, or other services.

**In this monorepo:** Canonical types and handle utils live in **`packages/shared`** (`@loki/shared`). Admin, web, and mobile should depend on that package instead of copying `lib/types.ts` / `lib/handleUtils.ts`.

**Last updated:** January 2026 (session changes).

---

## Quick reference — key fields that impact app function

| Area | Fields / behaviour |
|------|--------------------|
| **Venue visibility** | `visibility: boolean` — default `true`. When `false`, venue is **hidden from the feed**. Dashboard can "Hide from feed" / "Show in feed". |
| **Venue ownership** | `ownerId: string \| null` — Firebase Auth UID when claimed; `claimed: boolean` — whether venue is claimed. Dashboard can "Assign owner". |
| **Venue identity** | `handle` — unique, URL-safe (3–40 chars, a–z 0–9 `-`). Used for profile URLs / @handle. |
| **Venue contact** | `websiteUrl`, `instagramUrl`, `email` — optional. |
| **Menu items** | `allergens?: string[]` — e.g. `["Gluten", "Dairy", "Nuts"]`. |

Consumer apps should: filter feed by `visibility === true`; respect `ownerId`/`claimed` for claiming flows; use `handle` for lookups or share URLs.

---

## 1. Firestore: `venues` collection

### New or changed fields

| Field | Type | Default / notes | Used for |
|-------|------|-----------------|----------|
| `handle` | `string` | — | URL-safe unique identifier. **Rules:** lowercase a–z, 0–9, hyphen only; 3–40 chars; no spaces, underscores, leading/trailing hyphen, consecutive `--`. Must be unique across venues. |
| `websiteUrl` | `string?` | `null` | Venue website URL (optional). |
| `instagramUrl` | `string?` | `null` | Venue Instagram profile URL (optional). |
| `ownerId` | `string \| null` | `null` | Firebase Auth UID of the venue owner. Set when venue is "claimed". |
| `claimed` | `boolean` | `false` | Whether the venue has been claimed by an owner. |
| `visibility` | `boolean` | `true` | If `false`, venue is hidden from the feed. Default `true` for new venues. |
| `email` | `string?` | `null` | Venue contact email (optional). |

### Unchanged but relevant

- `name`, `address`, `location` (lat/lng) — **read-only on profile** after create (editable only at create).
- `location` stored as Firestore `GeoPoint` (latitude, longitude).
- `openingHours` — object with keys `monday` … `sunday`, each value array of `{ open, close, kitchenClose? }` (HH:mm).
- `experiences` — array of `{ experienceId: string, isActive: boolean }`.
- `menuSections` — array of sections, each with `items`; see Menu item changes below.

### Create-venue payload (new venues)

On create, the admin sets:

- `ownerId: null`
- `claimed: false`
- `visibility: true`
- `handle` — required, validated (see handle rules below), stored lowercase.
- Lat/long can be supplied as a **single string** e.g. `(48.2095124,16.3072468)` and parsed into `location`.

### Handle rules (enforced in admin)

- **Allowed:** a–z, 0–9, hyphen `-`.
- **Not allowed:** spaces, `_`, uppercase, emojis, accents (é, ö, ß), punctuation (`. , ! ? @`), leading/trailing `-`, consecutive `--`.
- **Length:** 3–40 characters.
- **Uniqueness:** Checked against existing venues (by `handle` field) on create and when editing in Settings.

---

## 2. Firestore: `experiences` collection

No new fields. Behavioural notes:

- **Specials tags** (admin options): "Meal Deal" removed; **Meal Special**, **Meal & Drink Deal**, **Fine Dining**, **Tapas** added. See EXPERIENCE_SAVE_FORMAT.md for full tag lists.
- **Duplicate specials:** Admin allows "duplicate then edit"; saving is blocked if the new experience would be an **exact duplicate** (same venueId, type, title, description, cost, isRecurring, recurrenceRule daySchedules, tags).

---

## 3. Firestore: `venues` → `menuSections` → items (menu items)

### Menu item shape (in `menuSections[].items[]`)

| Field | Type | Notes |
|-------|------|--------|
| `id` | `string` | Item id. |
| `name` | `string` | Item name. |
| `description` | `string?` | Optional. |
| `price` | `string?` | Optional. |
| `imageUrl` | `string?` | Optional. |
| **`allergens`** | **`string[]?`** | **New.** Array of allergen labels, e.g. `["Gluten", "Dairy", "Nuts"]`. Optional. |

**Suggested allergen set (admin dropdown):**  
Gluten, Dairy, Eggs, Nuts, Peanuts, Tree Nuts, Soy, Shellfish, Fish, Sesame, Mustard, Celery, Lupin, Sulphites.

---

## 4. Venue profile: read-only vs editable

After create, on the **venue profile** (edit) screen:

- **Read-only:** `name`, `address`, `latitude`, `longitude` (and thus `location`). Shown but not editable.
- **Editable:** handle (in Settings), timezone, phone, email, establishmentType, currency, openingHours, description/introduction/offerings, tags, images, menu, websiteUrl, instagramUrl, etc.

Create flow is the only place name/address/lat-long can be set; profile can only edit the rest.

---

## 5. Dashboard / Specials / Venues list behaviour

- **Dashboard venues table:** Can toggle `visibility` (hide/show in feed), set `ownerId` (assign owner); `claimed` is derived from whether `ownerId` is set.
- **Specials tab:** Lists all specials with venue name, special name, active status, running status (Running / Upcoming / Passed). Recurring specials with no start/end date are treated as **Running**. Actions: Edit (navigate to venue profile → Specials → edit that special), Deactivate/Activate (via venue's `experiences[].isActive`), Delete (remove experience and its instances, and remove from venue's `experiences`).
- **Edit special from Specials tab:** Link goes to `/venues/{venueId}?tab=specials&edit={experienceId}` so the venue profile opens on Specials with that special in edit mode.

---

## 6. Types (TypeScript) — `packages/shared`

Summary of types that affect app behaviour:

- **Venue:** `handle`, `websiteUrl`, `instagramUrl`, `ownerId`, `claimed`, `visibility`, `email` (all optional where applicable).
- **MenuItem:** `allergens?: string[]`.
- **Experience / VenueExperience / MenuSection:** unchanged in structure; only tag options and duplicate-check behaviour changed in admin.

Use **`packages/shared`** (`@loki/shared`) as the canonical type definitions for Venue, Experience, MenuSection, MenuItem when syncing with another codebase.

---

## 7. Handle validation and generation

- **Validation:** Implement the same rules as in **`packages/shared/src/handleUtils.ts`** (length 3–40, charset a–z 0–9 `-`, no leading/trailing/consecutive hyphens) and uniqueness against `venues` where `handle == value`.
- **Generation from name:** Lowercase, strip accents, replace non-allowed chars with nothing, spaces with single hyphen, collapse hyphens, trim leading/trailing, slice to 40 chars. See `generateHandleFromName` in `packages/shared/src/handleUtils.ts`.

---

## 8. Indexes (Firestore)

- **Venues by handle:** If the consumer app queries venues by `handle`, ensure a Firestore index (or single-field usage) for `venues` where `handle` is used in equality. Admin uses `where('handle', '==', value)` for uniqueness checks.

---

## 9. Summary checklist for "copy across" or mobile/web parity

When syncing with another app (e.g. mobile or public web):

- [ ] **Venues:** Add or support `handle`, `websiteUrl`, `instagramUrl`, `ownerId`, `claimed`, `visibility`, `email`. Treat `visibility === false` as "hide from feed". Treat `claimed` and `ownerId` for ownership/claiming flows.
- [ ] **Menu items:** Add `allergens` as optional `string[]`; use same or subset of allergen labels if you show them.
- [ ] **Create venue:** Set `ownerId: null`, `claimed: false`, `visibility: true`; validate and store `handle`; support lat/long as single string if you use that input.
- [ ] **Venue profile:** Enforce read-only for name, address, lat/long after create; allow editing handle (with same validation + uniqueness) and all other fields.
- [ ] **Specials tags:** Use updated tag list (Meal Special, Meal & Drink Deal, Fine Dining, Tapas, etc.) if you display or filter by tags.
- [ ] **Types:** Use **`@loki/shared`** (or copy/re-generate from `packages/shared`) so both codebases stay aligned.

---

**Version:** 1.0  
**Matches:** Current admin behaviour and `packages/shared` types as of this changelog's date.
