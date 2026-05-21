/**
 * Generate a URL-safe ASCII slug from any input string.
 * Non-ASCII characters are replaced with a short random suffix to avoid collisions.
 */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!base) {
    return Math.random().toString(36).slice(2, 10);
  }

  // If input had non-ASCII characters, append a short random suffix to ensure uniqueness
  const hasNonAscii = /[^a-zA-Z0-9\s-]/.test(input);
  if (hasNonAscii) {
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
  }

  return base;
}
