# LOKI Style Guide — Web & Mobile (Light Mode)

Use this document to keep a **consistent look** across the LOKI admin (web) and mobile app. All values are the single source of truth for fonts, colors, backgrounds, shadows, and key UI patterns.

---

## 1. Design tokens (shared)

Use these everywhere — web and mobile.

### 1.1 Colors

| Token | Hex | Usage |
|-------|-----|--------|
| **Primary** | `#122220` | Brand, primary buttons, links, focus |
| **Primary dark** | `#0E1A18` | Primary hover |
| **Primary light** | `#1A2E2C` | Primary light variant |
| **Secondary** | `#FF3D00` | CTAs, alerts, destructive actions |
| **Secondary dark** | `#CC2F00` | Secondary hover |
| **Secondary light** | `#FF6B33` | Secondary light variant |
| **Accent** | `#485C11` | Accent, badges, secondary highlights |
| **Neutral** | `#333333` | Primary text, headings, icons |
| **Neutral light** | `#F5F5F5` | Borders, light backgrounds, dividers |
| **Text paragraph** | `#6F6F6F` | Body/secondary text |
| **Background** | `#FFFFFF` | Page and card background (light mode) |

**Tailwind / CSS variables (already in `globals.css`):**

- `--color-primary`, `--color-primary-dark`, `--color-primary-light`
- `--color-secondary`, `--color-secondary-dark`, `--color-secondary-light`
- `--color-accent`, `--color-neutral`, `--color-neutral-light`, `--color-text-paragraph`
- Use classes: `text-neutral`, `bg-primary`, `border-neutral-light`, `text-text-paragraph`, etc.

### 1.2 Typography

| Role | Font | Weights | Usage |
|------|------|---------|--------|
| **Heading** | Crimson Text | 400, 600, 700 | All headings (h1–h6), brand name |
| **Body** | DM Sans | 400, 500, 600, 700 | Body, UI, buttons, forms |
| **Mono** | Roboto Mono | 400, 500, 600 | Code, IDs, technical data |

**Google Fonts URL (for non–Next.js):**

```
Crimson Text: 400, 600, 700
DM Sans: 400, 500, 600, 700
Roboto Mono: 400, 500, 600
```

**CSS / Tailwind:** `font-heading`, `font-body`, `font-mono` (from `globals.css`).

### 1.3 Background hue (pink/peach tint)

Soft gradient used for **alternating sections** (e.g. “profile detail” area), not full page.

- **Class:** `bg-gradient-to-br from-primary/5 to-secondary/5`
- **Effect:** Very light green → light orange; reads as soft pink/peach on white.
- **Where:** Section wrappers, not the main content cards (cards stay white).

**Example section:**

```
className="py-8 px-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5"
```

### 1.4 Shadows & elevation

| Level | Tailwind | Use case |
|-------|----------|----------|
| **None** | (none) | Flat content |
| **Card** | `shadow` or `shadow-lg` | Cards, nav panel, modals |
| **Dropdown / popover** | `shadow-lg` | Menus, tooltips, actions dropdown |
| **Modal / overlay** | `shadow-xl` | Modals, dialogs |
| **Notification** | `shadow-lg` | Toasts, save confirmation |

Prefer **one level per context** (e.g. cards = `shadow-lg`, dropdowns = `shadow-lg`) so elevation feels consistent.

### 1.5 Borders & radius

| Element | Border | Radius |
|---------|--------|--------|
| **Inputs, small buttons** | `border-2 border-neutral-light`, focus: `border-primary` | `rounded-lg` (8px) |
| **Cards, panels, modals** | `border border-neutral-light` or none | `rounded-xl` (12px) |
| **Large containers** | optional `border-neutral-light` | `rounded-xl` or `rounded-2xl` |
| **Dividers** | `border-t border-neutral-light` or `border-b border-neutral-light` | — |

### 1.6 Spacing

- **Page padding:** `px-4 py-6` (mobile), `sm:px-6 lg:px-8` (desktop).
- **Section vertical:** `py-8` or `py-20` for large sections.
- **Card padding:** `p-6` or `p-6 md:p-8`.
- **Gap between cards/sections:** `gap-6` or `mb-6` / `mb-8`.

---

## 2. Web (Admin) — Header & layout

Use the **same header** on all admin pages so the web app looks consistent.

### 2.1 Header structure

- **Sticky:** `sticky top-0 z-50 bg-white`
- **Layout:** Three columns — logo left, nav center, right slot (e.g. menu button).
- **Container:** `container mx-auto px-4 py-4`
- **Grid:** `grid grid-cols-3 items-center`

### 2.2 Header — Logo block (left)

- Wrapper: `flex items-center`
- Link: `flex items-center gap-3`
- Logo image: `h-8 w-auto`, `src="/logo.png"`, `alt="LOKI"`
- Brand text: `text-xl font-heading font-bold text-neutral`

### 2.3 Header — Desktop nav (center)

- Wrapper: `hidden md:flex items-center justify-center space-x-6 lg:space-x-8`
- Each link: `text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap`

### 2.4 Header — Right slot (mobile)

- Wrapper: `flex items-center justify-end`
- Toggle button: `md:hidden p-2 text-neutral`, `aria-label="Toggle menu"`
- Icons: `Menu` and `X` from `lucide-react`, size 24

### 2.5 Header — Mobile nav (when open)

- Wrapper: `md:hidden mt-4 pb-4 space-y-4`
- Each link: `block text-neutral text-sm font-bold hover:text-neutral/80 transition-colors`

### 2.6 Web page layout

- **Main:** `max-w-7xl mx-auto py-6 sm:px-6 lg:px-8`
- **Sections:** White cards with `bg-white rounded-xl shadow-lg border border-neutral-light` (or `shadow` + `border`).
- **Alternating hue:** Use `bg-gradient-to-br from-primary/5 to-secondary/5` for selected sections; keep cards inside them `bg-white rounded-xl shadow...`.

---

## 3. Mobile (light mode)

Same **tokens** as above; apply them in the native app with your mobile framework (e.g. React Native, Flutter).

### 3.1 Colors (same hex)

- **Primary:** `#122220` — primary buttons, links, active states.
- **Secondary:** `#FF3D00` — CTAs, alerts.
- **Neutral:** `#333333` — primary text; **Neutral light:** `#F5F5F5` — borders, list dividers.
- **Text paragraph:** `#6F6F6F` — secondary text.
- **Background:** `#FFFFFF` — screens (light mode).

### 3.2 Fonts (same families)

- **Headings:** Crimson Text, 600–700.
- **Body / UI:** DM Sans, 400–700.
- **Mono:** Roboto Mono for IDs/code.

Use the same Google Fonts (or bundled equivalents) as the web.

### 3.3 Background hue (mobile)

Use the **same gradient idea** for light-mode sections:

- Start: primary at ~5% opacity (`#122220` at 5%).
- End: secondary at ~5% opacity (`#FF3D00` at 5%).
- Direction: top-left to bottom-right (or your platform’s equivalent).

So mobile “alternating” sections (e.g. detail area) should feel like the web’s pink/peach tint; content cards remain white.

### 3.4 Shadows (mobile light mode)

Map to your platform’s elevation/shadow system:

- **Cards / list rows:** Subtle shadow (e.g. 2–4dp, low opacity).
- **App bar:** Optional very light shadow for separation.
- **Modals / sheets:** Stronger shadow than cards.
- **FAB / primary actions:** Slightly stronger shadow.

Keep shadows **subtle** so the look stays clean and consistent with the web.

### 3.5 Borders & radius (mobile)

- **Inputs, buttons:** Radius ~8px; border color `#F5F5F5`, focus `#122220`.
- **Cards, modals:** Radius ~12px; optional border `#F5F5F5`.
- **Dividers:** 1px `#F5F5F5`.

### 3.6 Header / app bar (mobile)

- **Background:** `#FFFFFF`.
- **Title / brand:** Crimson Text, bold, color `#333333`.
- **Icons / nav:** `#333333`; tap state can use `#333333` at 80% opacity.
- **Height:** Match platform guidelines (e.g. 56dp); logo height ~32px if you show the same logo as web.

Use the **same logo and brand name** as the web header for consistency.

---

## 4. Quick reference — copy/paste

### Web — Header (one block)

```tsx
<header className="sticky top-0 z-50 bg-white">
  <nav className="container mx-auto px-4 py-4">
    <div className="grid grid-cols-3 items-center">
      <div className="flex items-center">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="LOKI" className="h-8 w-auto" />
          <span className="text-xl font-heading font-bold text-neutral">LOKI</span>
        </Link>
      </div>
      <div className="hidden md:flex items-center justify-center space-x-6 lg:space-x-8">
        {/* Nav links: text-neutral text-sm font-bold hover:text-neutral/80 transition-colors whitespace-nowrap */}
      </div>
      <div className="flex items-center justify-end">
        {/* Mobile menu button: md:hidden p-2 text-neutral */}
      </div>
    </div>
    {/* Mobile nav: md:hidden mt-4 pb-4 space-y-4, same link styles */}
  </nav>
</header>
```

### Web — Card

```tsx
<div className="bg-white rounded-xl shadow-lg border border-neutral-light p-6 md:p-8">
  {/* content */}
</div>
```

### Web — Section with pink/peach background

```tsx
<div className="py-8 px-4 rounded-xl bg-gradient-to-br from-primary/5 to-secondary/5">
  <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
    {/* content */}
  </div>
</div>
```

### Web — Input

```tsx
<input
  className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary font-body text-neutral"
/>
```

### Web — Primary button

```tsx
<button className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
  Label
</button>
```

---

## 5. Checklist for consistency

**Web**

- [ ] Header uses: `sticky top-0 z-50 bg-white`, grid, logo `h-8`, brand `text-xl font-heading font-bold text-neutral`, nav links `text-neutral text-sm font-bold hover:text-neutral/80`.
- [ ] Cards: `bg-white rounded-xl shadow-lg border border-neutral-light`.
- [ ] Sections that need the hue: `bg-gradient-to-br from-primary/5 to-secondary/5`.
- [ ] Fonts: Crimson Text (headings), DM Sans (body), Roboto Mono (code/IDs).
- [ ] Colors: primary `#122220`, neutral `#333333`, neutral-light `#F5F5F5`, text-paragraph `#6F6F6F`.

**Mobile (light mode)**

- [ ] Same color hex values and font families as web.
- [ ] Same pink/peach tint for alternating sections (primary/5% → secondary/5%).
- [ ] App bar: white background, neutral text, same logo height (~32px) if used.
- [ ] Cards/surfaces: white, ~12px radius, subtle shadow.
- [ ] Inputs: ~8px radius, neutral-light border, primary focus.

---

**Document version:** 1.0  
**Last updated:** January 2026  
**Use for:** LOKI Admin (web) and LOKI Mobile (light mode).
