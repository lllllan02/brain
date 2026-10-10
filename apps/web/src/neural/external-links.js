// Summarize rendered anchors without changing the links in the article.
export function collectExternalLinks(anchors) {
  const links = new Map();
  for (const anchor of anchors) {
    try {
      const url = new URL(anchor.getAttribute('href'));
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) continue;
      const originalHref = url.href;
      // Hash routes identify separate pages; ordinary fragments identify sections.
      if (url.protocol !== 'mailto:' && !/^#(?:\/|!)/.test(url.hash)) url.hash = '';
      const title = anchor.textContent.replace(/\s*↗\s*$/, '').trim();
      const existing = links.get(url.href);
      if (!existing) links.set(url.href, {href: url.href, title: title || url.href});
      // Prefer an explicit article-level label over a section label when available.
      else if (originalHref === url.href && title) existing.title = title;
    } catch { /* Internal references, local attachments and invalid URLs are skipped. */ }
  }
  return [...links.values()];
}

export function externalLink(href) {
  try {
    const url = new URL(href);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    // Use the actual origin, including subdomain and port, without forwarding
    // the article path, query, fragment or URL credentials to the icon request.
    return {href: url.href, host: url.host, iconUrl: `${url.origin}/favicon.ico`};
  } catch { return null; }
}
export function decorateExternalLinks(root, base) {
  for (const anchor of root.querySelectorAll('a[href]')) {
    const link = externalLink(anchor.getAttribute('href'));
    if (!link || anchor.classList.contains('external-site-link')) continue;
    anchor.classList.add('external-site-link');
    const icon = document.createElement('img');
    icon.className = 'external-site-icon';
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    icon.width = icon.height = 14;
    icon.referrerPolicy = 'no-referrer';
    icon.loading = 'lazy';
    icon.decoding = 'async';
    icon.addEventListener('error', () => { icon.src = `${base}site-icons/link.svg`; }, {once: true});
    icon.src = link.iconUrl;
    anchor.prepend(icon);
  }
}
