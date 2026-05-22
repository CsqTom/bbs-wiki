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
