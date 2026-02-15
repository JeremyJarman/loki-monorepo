# Packages

Shared code used by apps.

| Package           | Purpose                                      |
|-------------------|----------------------------------------------|
| **@loki/shared**  | Types (Venue, Experience, etc.) + handleUtils |
| **@loki/design-system** | Design tokens → Tailwind + Flutter (optional; copy from loki-admin `design-system/`) |

After adding **design-system**, add to root `package.json` scripts:
`"build:tokens": "npm run build -w packages/design-system"`
