# LOKI Design System — Prompt for AI / Developers

**Use this as a prompt** when briefing an AI (or developer) that is building the LOKI **web admin** or **mobile app**. Paste the relevant section below into your chat or project brief so the assistant follows the same look and feel.

The full token list and examples live in **STYLE_GUIDE.md** in this repo; the prompt below is the instruction layer that tells the assistant to use that system.

---

## Option A: Short prompt (reference only)

You can give this alone if the assistant can read the repo:

```
When building or styling any part of the LOKI admin (web) or LOKI mobile app, you must follow the design system defined in STYLE_GUIDE.md in this repository. Use it as the single source of truth for colors, fonts, background hue, shadows, borders, radius, and spacing. For web, use the header and layout patterns from Section 2. For mobile (light mode), use the tokens and patterns from Section 3. Do not invent new colors, fonts, or shadow styles; use only the values specified there.
```

---

## Option B: Full prompt (self-contained)

Use this when you cannot attach **STYLE_GUIDE.md** or want the rules embedded in the prompt. Paste the whole block below.

---

### Copy-paste block start

You are building UI for **LOKI** (admin web app and/or mobile app). Follow this design system exactly so the product looks consistent across web and mobile.

**1. Design tokens (mandatory)**  
Use these values everywhere. Do not introduce new colors or fonts.

- **Colors:**  
  Primary `#122220` (brand, primary buttons, links, focus). Primary dark `#0E1A18` (hover). Secondary `#FF3D00` (CTAs, alerts). Neutral `#333333` (primary text, headings, icons). Neutral light `#F5F5F5` (borders, light backgrounds, dividers). Text paragraph `#6F6F6F` (body/secondary text). Background `#FFFFFF` (page and cards in light mode).

- **Fonts:**  
  Headings and brand name: **Crimson Text** (weights 400, 600, 700). Body and UI: **DM Sans** (400, 500, 600, 700). Code/IDs: **Roboto Mono** (400, 500, 600).

- **Background hue (alternating sections):**  
  Soft pink/peach tint: gradient from primary at 5% opacity to secondary at 5% opacity, top-left to bottom-right. Use for section backgrounds only; content cards on top stay white.

- **Shadows:**  
  Cards/panels: `shadow` or `shadow-lg`. Dropdowns/popovers: `shadow-lg`. Modals: `shadow-xl`. Keep elevation consistent per context.

- **Borders & radius:**  
  Borders: `#F5F5F5` (neutral light). Inputs/small buttons: radius 8px. Cards/modals: radius 12px. Focus states: use primary color.

- **Spacing:**  
  Page padding ~16–24px (mobile), more on desktop. Card padding ~24–32px. Consistent gaps between sections (e.g. 24–32px).

**2. Web (admin) — mandatory patterns**  
When building the web admin:

- **Header:** Sticky, full width, white background. Three-column grid: (1) logo + “LOKI” text left, (2) nav links centered on desktop, (3) right slot (e.g. mobile menu button). Logo height 32px. Brand text: Crimson Text, bold, size ~20px, color `#333333`. Nav links: DM Sans (or body font), bold, ~14px, color `#333333`, hover 80% opacity. On mobile, hide center nav and show a hamburger that toggles a vertical list of the same links.
- **Main content:** Max width ~1280px, centered. Use white cards with `rounded-xl`, `shadow-lg`, and a light border (`#F5F5F5`) for content blocks. Use the pink/peach gradient only for selected section wrappers; cards inside stay white.
- **Buttons/inputs:** Primary buttons: primary color background, white text, rounded-lg. Inputs: 2px border neutral light, rounded-lg, focus border primary. Use the font and color tokens above.

**3. Mobile (light mode) — mandatory patterns**  
When building the mobile app (light mode):

- Use the **same** color hex values and font families (Crimson Text, DM Sans, Roboto Mono) as above.
- App bar: white background, primary text/icons `#333333`, same logo if used (height ~32px).
- Use the **same** pink/peach tint for alternating sections (primary 5% → secondary 5% gradient); content surfaces stay white.
- Cards/surfaces: white, radius ~12px, subtle shadow. Inputs: radius ~8px, border `#F5F5F5`, focus primary. Dividers: 1px `#F5F5F5`.
- Do not introduce new colors or typefaces; map platform-specific shadows and radii to the levels described in the design system.

**4. What you must not do**  
Do not invent new brand colors, new fonts, or new shadow/elevation systems. Do not use generic UI defaults (e.g. default blue buttons or system gray) instead of the tokens above. If something is not specified, infer from STYLE_GUIDE.md or ask. Prefer consistency with this system over personal style.

**5. Reference**  
The full specification, including copy-paste examples and checklists, is in **STYLE_GUIDE.md** in this repository. When in doubt, follow that file.

### Copy-paste block end

---

## How to use

| Situation | What to do |
|-----------|------------|
| **AI has access to the repo** | Use Option A and say “see STYLE_GUIDE.md for full details.” |
| **AI cannot read files** | Paste Option B (full prompt) into the chat before or at the start of the task. |
| **Web only** | Paste Option B but omit the “Mobile (light mode)” section (Section 3). |
| **Mobile only** | Paste Option B but omit the “Web (admin)” section (Section 2); keep tokens and Section 3. |
| **New team member** | Share STYLE_GUIDE.md as reference and Option A (or B) as the instruction. |

---

**Version:** 1.0  
**Matches:** STYLE_GUIDE.md  
**Use for:** Briefing AI or developers on LOKI web and mobile styling.
