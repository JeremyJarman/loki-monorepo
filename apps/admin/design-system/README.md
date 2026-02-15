# @loki/design-system

Platform-agnostic design tokens for LOKI, used across the **landing page**, **admin dashboard** (Next.js + Tailwind), and **mobile app** (Flutter). Tokens are values only; the build script generates framework-specific output.

## Purpose

- **Single source of truth** for colors, spacing, radius, typography, and breakpoints.
- **Platform-agnostic** JSON tokens — no Tailwind or Flutter specifics in the token files.
- **Generated outputs** for web (Tailwind theme) and Flutter (Dart theme constants).

## Folder structure

```
design-system/
  tokens/           ← Edit these (platform-agnostic values only)
    colors.json
    spacing.json
    radius.json
    typography.json
    breakpoints.json
  build/            ← Generated; do not edit
    web/            ← Tailwind theme config
    flutter/        ← Dart theme constants
  scripts/
    build-tokens.ts ← Generates web + Flutter from tokens
  README.md
  package.json
```

## How to use

### Web (Next.js + Tailwind)

1. From the design-system folder: `npm install` then `npm run build`.
2. Copy or reference `build/web/tailwind.theme.js` in your app.
3. In your Tailwind config, extend the theme:

```js
// tailwind.config.js
const lokiTheme = require('@loki/design-system/build/web/tailwind.theme.js');

module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    ...lokiTheme.theme,
    extend: {
      ...lokiTheme.theme.extend,
    },
  },
};
```

Or merge manually: `theme: { extend: { ...require('.../tailwind.theme.js').theme.extend } }`.

4. Use classes: `bg-primary`, `text-text-primary`, `rounded-md`, `p-md`, `font-heading`, etc. (exact names depend on your token keys).

### Flutter

1. From the design-system folder: `npm run build`.
2. Copy `build/flutter/theme.dart` into your Flutter project (e.g. `lib/theme/loki_tokens.dart`).
3. Add the dependency in `pubspec.yaml` if you use a local path or package.
4. In your app, import and use the constants when building `ThemeData`:

```dart
import 'package:your_app/theme/loki_tokens.dart';

ThemeData(
  colorScheme: ColorScheme.dark(
    primary: LokiTokens.colorPrimary,
    secondary: LokiTokens.colorSecondary,
    surface: LokiTokens.colorBackground,
    onSurface: LokiTokens.colorTextPrimary,
    error: LokiTokens.colorError,
  ),
  fontFamily: LokiTokens.fontFamilyBody,
  // Use LokiTokens.xs, LokiTokens.radiusMd, etc. for padding and border radius
);
```

Spacing and radius are in logical pixels (16px base for rem). Color constants are already `Color` instances (e.g. `LokiTokens.colorPrimary`).

## How to add or change tokens

1. **Edit only the JSON files in `tokens/`.** Keep values platform-agnostic (hex colors, rem/px strings, font names, numeric weights).
2. **Colors** (`tokens/colors.json`): Add or change keys; nested keys (e.g. `primary.hover`) become Tailwind classes like `primary-hover` and Flutter constants like `colorPrimaryHover`.
3. **Spacing** (`tokens/spacing.json`): Use rem (e.g. `"md": "1rem"`). The script converts to Tailwind spacing and Flutter logical pixels (16px base).
4. **Radius** (`tokens/radius.json`): Same idea — rem or px; script maps to Tailwind `borderRadius` and Flutter doubles.
5. **Typography** (`tokens/typography.json`): `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`. Font sizes in rem become Flutter logical pixels.
6. **Breakpoints** (`tokens/breakpoints.json`): Min-width in px; used for Tailwind `screens` and Flutter breakpoint constants.
7. Run **`npm run build`** from the design-system root to regenerate `build/web/` and `build/flutter/`.
8. Update your Tailwind config or Flutter theme usage if you added new keys.

## Example theme (LOKI premium dark)

The default tokens ship with example values for a **premium dark theme**: deep backgrounds (`#0f0e0c`), warm gold primary (`#c9a962`), amber accent, and clear text/error/success. Replace with your own values while keeping the same structure so the build script and docs stay valid.

## Monorepo

This package is intended to live in a monorepo (e.g. `packages/design-system`). Web apps can depend on it with `"@loki/design-system": "workspace:*"` and require the generated Tailwind file; Flutter can copy the generated Dart file or depend on a shared package that exports it.
