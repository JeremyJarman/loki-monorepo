/**
 * Design tokens build script.
 * Reads platform-agnostic JSON tokens and generates:
 * - build/web/   → Tailwind theme config (theme.extend)
 * - build/flutter/ → Dart theme constants (colors, spacing, radius, typography, breakpoints)
 *
 * Run from design-system root: npx tsx scripts/build-tokens.ts
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const TOKENS_DIR = path.join(ROOT, "tokens");
const BUILD_DIR = path.join(ROOT, "build");
const BUILD_WEB = path.join(BUILD_DIR, "web");
const BUILD_FLUTTER = path.join(BUILD_DIR, "flutter");
// Flutter package consumed by apps/mobile (committed so Flutter builds without Node)
const PACKAGES_FLUTTER = path.join(ROOT, "..", "..", "..", "packages", "loki_design_system", "lib");

function loadJson<T>(file: string): T {
  const raw = fs.readFileSync(path.join(TOKENS_DIR, file), "utf-8");
  return JSON.parse(raw) as T;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// --- Tailwind ---

function tailwindThemeFromTokens() {
  const colors = loadJson<Record<string, unknown>>("colors.json");
  const spacing = loadJson<Record<string, string>>("spacing.json");
  const radius = loadJson<Record<string, string>>("radius.json");
  const typography = loadJson<{
    fontFamily: Record<string, string>;
    fontSize: Record<string, string>;
    fontWeight: Record<string, string>;
    lineHeight: Record<string, string>;
  }>("typography.json");
  const breakpoints = loadJson<Record<string, string>>("breakpoints.json");

  const themeExtend = {
    colors,
    spacing,
    borderRadius: radius,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSize,
    fontWeight: typography.fontWeight,
    lineHeight: typography.lineHeight,
    screens: breakpoints,
  };

  // Quote only keys that are valid JS identifiers (so 2xl, 3xl, 4xl stay quoted)
  const themeJson = JSON.stringify(themeExtend, null, 2);
  const themeJs = themeJson.replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, "$1:");
  return `/** Generated from design-system tokens. Do not edit by hand. */
/** Run: npm run build (from design-system) to regenerate. */

module.exports = {
  theme: {
    extend: ${themeJs},
  },
};
`;
}

// --- Flutter ---

function hexToFlutterColor(hex: string): string {
  const clean = hex.replace(/^#/, "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `0xFF${clean.toUpperCase().padStart(6, "0")}`;
}

function remToLogicalPx(remStr: string): number {
  const rem = parseFloat(remStr.replace("rem", "").trim());
  return Math.round(rem * 16);
}

function pxToDouble(pxStr: string): number {
  return parseFloat(pxStr.replace("px", "").trim());
}

function flattenForFlutter(
  obj: Record<string, unknown>,
  prefix: string,
  valueTransform: (v: unknown) => string
): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const dartKey = prefix + (key === "DEFAULT" ? "" : key.charAt(0).toUpperCase() + key.slice(1));
    if (value !== null && typeof value === "object" && !Array.isArray(value) && typeof (value as object) !== "string") {
      lines.push(...flattenForFlutter(value as Record<string, unknown>, dartKey, valueTransform));
    } else {
      lines.push(`  static const ${dartKey} = ${valueTransform(value)};`);
    }
  }
  return lines;
}

function dartThemeFromTokens(): string {
  const colors = loadJson<Record<string, unknown>>("colors.json");
  const spacing = loadJson<Record<string, string>>("spacing.json");
  const radius = loadJson<Record<string, string>>("radius.json");
  const typography = loadJson<{
    fontFamily: Record<string, string>;
    fontSize: Record<string, string>;
    fontWeight: Record<string, string>;
    lineHeight: Record<string, string>;
  }>("typography.json");
  const breakpoints = loadJson<Record<string, string>>("breakpoints.json");

  const colorLines = flattenForFlutter(colors, "color", (v) => {
    if (typeof v === "string" && v.startsWith("#")) return `Color(${hexToFlutterColor(v)})`;
    return String(v);
  });

  const spacingLines = Object.entries(spacing).map(
    ([k, v]) => `  static const double ${k} = ${remToLogicalPx(v)}.0;`
  );
  const radiusLines = Object.entries(radius).map(
    ([k, v]) => `  static const double radius${k.charAt(0).toUpperCase() + k.slice(1)} = ${remToLogicalPx(v)}.0;`
  );
  const breakpointLines = Object.entries(breakpoints).map(
    ([k, v]) => `  static const double ${k} = ${pxToDouble(v)}.0;`
  );

  return `// Generated from design-system tokens. Do not edit by hand.
// Run: npm run build (from design-system) to regenerate.

import 'package:flutter/material.dart';

/// LOKI design tokens — premium dark theme.
/// Use these when building [ThemeData] or custom widgets.
abstract class LokiTokens {
  LokiTokens._();

  // --- Colors ---
${colorLines.join("\n")}

  // --- Spacing (logical pixels, 16px base) ---
${spacingLines.join("\n")}

  // --- Border radius (logical pixels) ---
${radiusLines.join("\n")}

  // --- Breakpoints (min-width in logical pixels) ---
${breakpointLines.join("\n")}

  // --- Typography (font family names; use with Google Fonts or local assets) ---
  static const String fontFamilyHeading = ${JSON.stringify(typography.fontFamily.heading)};
  static const String fontFamilyBody = ${JSON.stringify(typography.fontFamily.body)};
  static const String fontFamilyMono = ${JSON.stringify(typography.fontFamily.mono)};

  static const Map<String, double> fontSize = ${JSON.stringify(
    Object.fromEntries(
      Object.entries(typography.fontSize).map(([k, v]) => [k, remToLogicalPx(v)])
    ),
    null,
    2
  )};

  static const Map<String, FontWeight> fontWeight = {
    "normal": FontWeight.w400,
    "medium": FontWeight.w500,
    "semibold": FontWeight.w600,
    "bold": FontWeight.w700,
  };

  static const Map<String, double> lineHeight = ${JSON.stringify(
    Object.fromEntries(
      Object.entries(typography.lineHeight).map(([k, v]) => [k, parseFloat(v)])
    ),
    null,
    2
  )};
}
`;
}

// --- Main ---

function main() {
  ensureDir(BUILD_WEB);
  ensureDir(BUILD_FLUTTER);

  const tailwindJs = tailwindThemeFromTokens();
  fs.writeFileSync(path.join(BUILD_WEB, "tailwind.theme.js"), tailwindJs, "utf-8");
  console.log("Generated build/web/tailwind.theme.js");

  const dartTheme = dartThemeFromTokens();
  fs.writeFileSync(path.join(BUILD_FLUTTER, "theme.dart"), dartTheme, "utf-8");
  console.log("Generated build/flutter/theme.dart");

  ensureDir(PACKAGES_FLUTTER);
  fs.writeFileSync(path.join(PACKAGES_FLUTTER, "loki_tokens.dart"), dartTheme, "utf-8");
  console.log("Generated packages/loki_design_system/lib/loki_tokens.dart");
}

main();
