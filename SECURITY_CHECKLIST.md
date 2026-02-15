# Security Checklist — Before Pushing to GitHub

Use this checklist before pushing the monorepo to GitHub.

## ✅ Protected by .gitignore

The following are excluded from version control:

| Item | Location | Notes |
|------|----------|-------|
| `.env`, `.env.local`, `.env*.local` | Root, apps/admin, apps/frontend, apps/landing | Firebase config, API keys, service account |
| `firebase_options.dart` | apps/mobile/lib/ | Firebase API keys, project ID — run `flutterfire configure` after clone |
| `google-services.json` | apps/mobile/android/ | Android Firebase config |
| `GoogleService-Info.plist` | apps/mobile/ios/ | iOS Firebase config |
| `*.pem`, `secrets.json`, `serviceAccount*.json` | Anywhere | Private keys, credentials |

## ⚠️ Before First Push

1. **Verify no secrets are staged:**
   ```bash
   git status
   git diff --cached
   ```
   Ensure no `.env`, `firebase_options.dart`, or `google-services.json` appear.

2. **Mobile app:** After cloning, each developer must run:
   ```bash
   cd apps/mobile && flutterfire configure
   ```
   This regenerates `lib/firebase_options.dart` locally (never committed).

3. **Admin & Frontend:** Copy `.env.example` to `.env.local` and fill in Firebase config. Never commit `.env.local`.

## 📝 Mailchimp (Landing)

Mailchimp form URL and honeypot field are in env vars (`VITE_MAILCHIMP_FORM_ACTION`, `VITE_MAILCHIMP_HIDDEN_FIELD`). Copy `apps/landing/.env.example` to `.env.local` and fill in. Never commit `.env.local`.
