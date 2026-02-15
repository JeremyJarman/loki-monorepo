import type { NextConfig } from "next";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Resolve admin package root (apps/admin) so we can load .env.local regardless of cwd
let adminRoot: string;
try {
  adminRoot = path.dirname(require.resolve("loki-admin/package.json"));
} catch {
  adminRoot = path.join(process.cwd(), "apps", "admin");
}

const configDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const candidates = [
    path.join(adminRoot, ".env.local"),
    path.resolve(configDir, ".env.local"),
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), "apps", "admin", ".env.local"),
  ];
  for (const filePath of candidates) {
    const resolved = path.resolve(filePath);
    if (fs.existsSync(resolved)) {
      const content = fs.readFileSync(resolved, "utf8");
      let count = 0;
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = value;
            count++;
          }
        }
      }
      if (process.env.NODE_ENV === "development" && count > 0) {
        console.log("[Admin] Loaded .env.local from:", resolved, `(${count} vars)`);
      }
      return;
    }
  }
  if (process.env.NODE_ENV === "development") {
    console.warn("[Admin] No .env.local found. Tried:", candidates.map((p) => path.resolve(p)));
  }
}
loadEnvLocal();

const nextConfig: NextConfig = {
  // Use --webpack in dev/build if Turbopack hangs (e.g. in monorepos); see package.json "dev" script
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
};

export default nextConfig;
