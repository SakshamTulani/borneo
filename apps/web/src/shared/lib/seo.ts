// Public origin for canonical and Open Graph URLs. Set VITE_SITE_URL in production.
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'http://localhost:5173').replace(/\/$/, '');

/** The one place that builds route head tags (ADR-0008). */
export function pageHead({
  title,
  description,
  path,
  type = 'website',
  noindex = false,
}: {
  title: string;
  description?: string | undefined;
  /** Canonical path, e.g. "/products/pulse-4". One canonical URL per page (ARCHITECTURE §SEO). */
  path?: string;
  type?: 'website' | 'product';
  /** Internal pages (e.g. /design-system) must never be indexed. */
  noindex?: boolean;
}) {
  const fullTitle = title === 'Borneo' ? title : `${title} · Borneo`;
  const url = path === undefined ? undefined : `${SITE_URL}${path}`;
  return {
    meta: [
      { title: fullTitle },
      ...(description ? [{ name: 'description', content: description }] : []),
      ...(noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
      { property: 'og:site_name', content: 'Borneo' },
      { property: 'og:title', content: fullTitle },
      { property: 'og:type', content: type },
      ...(description ? [{ property: 'og:description', content: description }] : []),
      ...(url ? [{ property: 'og:url', content: url }] : []),
    ],
    links: url ? [{ rel: 'canonical', href: url }] : [],
  };
}
