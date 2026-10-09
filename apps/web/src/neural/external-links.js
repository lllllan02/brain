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
