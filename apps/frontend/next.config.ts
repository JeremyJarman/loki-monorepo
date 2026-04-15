import type { NextConfig } from "next";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const configDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// Load .env.local from this app's directory (works regardless of cwd / Turbopack)
function loadEnvLocal() {
  const candidates = [
    path.resolve(configDir, ".env.local"),
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), "apps", "frontend", ".env.local"),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) process.env[key] = value;
        }
      }
      return;
    }
  }
}
loadEnvLocal();

/** NEXT_PUBLIC_* is inlined at build time; missing values on Vercel = broken client bundle. */
const REQUIRED_PUBLIC_FIREBASE = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;
if (process.env.VERCEL) {
  const missing = REQUIRED_PUBLIC_FIREBASE.filter((k) => !process.env[k]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Vercel build: set these in Project → Settings → Environment Variables, enable them for this deployment type (Production vs Preview), then redeploy: ${missing.join(", ")}`
    );
  }
}

// Do not list NEXT_PUBLIC_* in `env` here: that snapshots values when this file loads.
// Next inlines process.env.NEXT_PUBLIC_* during compilation; a premature undefined would
// ship empty strings to the browser on Vercel.
const nextConfig: NextConfig = {};

export default nextConfig;
