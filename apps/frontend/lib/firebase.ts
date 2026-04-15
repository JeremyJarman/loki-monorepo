import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Only literal `process.env.NEXT_PUBLIC_*` reads are inlined for the browser; dynamic
// `process.env[name]` stays empty on the client and falsely triggers "missing" errors.
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '';
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '';
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '';
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '';
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '';
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '';

const missingVars = [
  !apiKey && 'NEXT_PUBLIC_FIREBASE_API_KEY',
  !authDomain && 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  !projectId && 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  !storageBucket && 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  !messagingSenderId && 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  !appId && 'NEXT_PUBLIC_FIREBASE_APP_ID',
].filter((x): x is string => Boolean(x));

if (missingVars.length > 0) {
  const msg = `Missing Firebase env: ${missingVars.join(', ')}. Locally: apps/frontend/.env.local. On Vercel: Project → Settings → Environment Variables (all keys for Production).`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg);
  }
  console.warn('Firebase config:', msg);
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
