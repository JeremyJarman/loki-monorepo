import * as admin from 'firebase-admin';

let defaultApp: admin.app.App | null = null;

/**
 * Get Firebase Admin app. Uses FIREBASE_SERVICE_ACCOUNT_KEY (JSON string) from env.
 * In Firebase Console: Project settings → Service accounts → Generate new private key.
 */
function getAdminApp(): admin.app.App {
  if (defaultApp) return defaultApp;
  // Namespaced SDK exposes `apps` (not getApps); webpack interop breaks on getApps().
  const existingApps = admin.apps;
  if (existingApps.length > 0) {
    defaultApp = existingApps[0]!;
    return defaultApp;
  }
  let key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? '';
  key = key.trim();
  if (!key) {
    throw new Error(
      'Missing FIREBASE_SERVICE_ACCOUNT_KEY. Add the service account JSON string to .env.local (from Firebase Console → Project settings → Service accounts → Generate new private key).'
    );
  }
  // .env values don't span lines: use a single line of JSON (minified, no newlines)
  if (key === '{' || (key.startsWith('{') && !key.includes('"type"'))) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY must be the full JSON on a single line. Put the whole service account JSON on one line in .env.local (no line breaks).'
    );
  }
  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(key) as admin.ServiceAccount;
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is invalid JSON. Use the full key on a single line with double quotes (e.g. {"type":"service_account",...}).'
    );
  }
  defaultApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return defaultApp;
}

export function getAdminAuth() {
  return getAdminApp().auth();
}

export function getAdminFirestore() {
  return getAdminApp().firestore();
}
