# loki_design_system (Flutter)

LOKI design tokens for Flutter — colors, spacing, radius, typography. Shared with the admin (Next.js) and landing apps.

- **Source of truth:** `apps/admin/design-system/tokens/*.json`
- **Generated file:** `lib/loki_tokens.dart` (by the design-system build script)

## Usage

In `apps/mobile/pubspec.yaml`:

```yaml
dependencies:
  loki_design_system:
    path: ../../packages/loki_design_system
```

In Dart:

```dart
import 'package:loki_design_system/loki_tokens.dart';

// Use tokens when building ThemeData or widgets
ThemeData(
  primaryColor: LokiTokens.colorPrimary,
  scaffoldBackgroundColor: LokiTokens.colorBackground,
);
```

## Regenerating tokens

When you change tokens in `apps/admin/design-system/tokens/`:

1. From design-system: `cd apps/admin/design-system && npm run build`
2. Or from monorepo root: `npm run build:tokens` (if added to root package.json)

This overwrites `lib/loki_tokens.dart` and (if present) `build/flutter/theme.dart`.
