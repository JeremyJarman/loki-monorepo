# Apps

Copy your applications here. Each app must have its own `package.json`.

| Folder    | Source           | Notes                    |
|-----------|------------------|--------------------------|
| **admin** | loki-admin       | Next.js admin dashboard  |
| **landing** | loki-landing   | Next.js landing page     |
| **web**   | — | *(future React consumer web app; for now web = Flutter from apps/mobile)* |
| **mobile**| LOKI repo        | Flutter app (web build: `flutter run -d chrome` / `flutter build web`) |

After copying:

1. Remove `node_modules`, `.next`, `.git` from the copied folder (don’t copy those).
2. From monorepo root run: `npm install`
3. In **admin**, add `"@loki/shared": "workspace:*"` to `package.json` and switch imports from `@/lib/types` and `@/lib/handleUtils` to `@loki/shared`.
