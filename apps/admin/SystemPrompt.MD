# LOKI Venue Enrichment System Prompt

The **full system prompt** used for venue creation is built in code and injected once per request. The user message is only **Venue name** and **Address**.

- **Source:** `lib/venueEnrichmentPrompt.ts` — `getVenueEnrichmentSystemPrompt()`
- **Taxonomy:** `lib/taxonomy.json` (canonical tag lists; original reference: `Taxonomy` in project root)

## What the prompt covers

1. **Role:** Enrichment assistant for LOKI; transform venue name + address into structured data. Accurate, restrained, consistent.

2. **Taxonomy:** Full JSON taxonomy is embedded. The model must use only values from:
   - `cuisine` → primary/secondary cuisine
   - `specialties` → 1–3 specialties
   - All other arrays → combined into `tags` (service_access, food_drink, dietary_options, highlights_experiences, space_amenities, accessibility, connectivity_utilities, atmosphere, crowd_inclusivity, events_timing, payments)

3. **Output fields (single JSON):**
   - `cuisine` — primary, secondary (or null)
   - `specialties` — array
   - `tags` — array (taxonomy values only)
   - `summary` — short editorial summary (3–5 items, "Item · Item · Item")
   - **Opening hours** — `openingHours`: `monday`…`sunday`, each an array of `{ "open": "HH:mm", "close": "HH:mm" }` (24h); empty array if closed.
   - **Coordinates** — `latitude`, `longitude` (decimal WGS84); null if unknown.
   - `introduction` — brief paragraph, no emojis/hype.
   - `designAndAtmosphere` — interior, ambiance, notable features.
   - `offeringsAndMenu` — primary offerings, culinary/beverage focus, dietary options.
   - `publicOpinionHighlights` — typical positive sentiments and considerations; short; never null.
   - `satisfactionScore` — 0–10; never null.

4. **Deduplication:** No repeating cuisine/specialty as tags; prefer experience over logistics.

5. **Writing style:** No emojis, no marketing, no call-to-actions; direct, factual paragraphs.

6. **Return format:** Strict JSON only; no markdown or extra text.

## Usage

- **AI test page:** `app/ai-test/page.tsx` — uses `getVenueEnrichmentSystemPrompt()` as the system message and sends only `Venue name: …` and `Address: …` as the user message. The parsed response is used to create the venue (opening hours, location, tags, introduction, designAndAtmosphere, offeringsAndMenu, publicOpinionHighlights, satisfactionScore).
