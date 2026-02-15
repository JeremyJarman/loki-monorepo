/**
 * Venue handle rules:
 * Allowed: lowercase a-z, numbers 0-9, hyphen -
 * Not allowed: spaces, underscores, uppercase, emojis, accents, punctuation, leading/trailing -, consecutive --
 * Length: 3-40 characters
 */

const HANDLE_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateHandle(handle: string): { valid: boolean; error?: string } {
  const trimmed = handle.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Handle must be at least 3 characters' };
  }
  if (trimmed.length > 40) {
    return { valid: false, error: 'Handle must be at most 40 characters' };
  }
  if (/[\s_]/.test(trimmed)) {
    return { valid: false, error: 'Spaces and underscores are not allowed' };
  }
  if (/[A-Z]/.test(trimmed)) {
    return { valid: false, error: 'Uppercase letters are not allowed' };
  }
  if (/[^a-z0-9-]/.test(trimmed)) {
    return { valid: false, error: 'Only lowercase letters, numbers, and hyphens are allowed' };
  }
  if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
    return { valid: false, error: 'Handle cannot start or end with a hyphen' };
  }
  if (/--/.test(trimmed)) {
    return { valid: false, error: 'Consecutive hyphens are not allowed' };
  }
  if (!HANDLE_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid handle format' };
  }
  return { valid: true };
}

/**
 * Generate a URL-safe handle from venue name.
 * Lowercase, replace spaces/special chars with single hyphen, trim hyphens, limit length.
 */
export function generateHandleFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')   // keep only letters, numbers, spaces, hyphens
    .replace(/\s+/g, '-')           // spaces to single hyphen
    .replace(/-+/g, '-')             // collapse consecutive hyphens
    .replace(/^-|-$/g, '')           // trim leading/trailing hyphens
    .slice(0, 40);
}
