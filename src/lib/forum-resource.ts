export function normalizeForumResourceHref(rawHref: string) {
  if (!rawHref) return null;

  if (rawHref.startsWith("/wiki/") || rawHref.startsWith("/share/")) {
    return rawHref;
  }

  try {
    const url = new URL(rawHref);
    if (url.pathname.startsWith("/wiki/") || url.pathname.startsWith("/share/")) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Extract a human-readable title from a wiki or share link URL.
 * For /share/<token>/<title> URLs, converts the slug to a readable title.
 * Returns null if no title can be extracted.
 */
export function guessTitleFromForumHref(href: string): string | null {
  if (!href) return null;

  let pathname = href;
  try {
    pathname = new URL(href).pathname;
  } catch {
    // href is already a relative path
  }

  // Match /share/<token>/<title> pattern
  const shareMatch = pathname.match(/^\/share\/[^/]+\/(.+)$/);
  if (shareMatch) {
    const slug = shareMatch[1];
    return slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return null;
}

export function extractFirstForumResourceHref(content: string) {
  const markdownLinkRegex = /\[[^\]]*?\]\((.*?)\)/g;

  for (const match of content.matchAll(markdownLinkRegex)) {
    const href = match[1];
    const normalizedHref = normalizeForumResourceHref(href);
    if (normalizedHref) {
      return normalizedHref;
    }
  }

  const htmlLinkRegex = /<a[^>]+href=["'](.*?)["']/gi;
  for (const match of content.matchAll(htmlLinkRegex)) {
    const href = match[1];
    const normalizedHref = normalizeForumResourceHref(href);
    if (normalizedHref) {
      return normalizedHref;
    }
  }

  return null;
}
