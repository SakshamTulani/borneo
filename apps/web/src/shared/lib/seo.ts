/** The one place that builds route head tags (ADR-0008). */
export function pageHead({
  title,
  description,
  noindex = false,
}: {
  title: string;
  description?: string;
  /** Internal pages (e.g. /design-system) must never be indexed. */
  noindex?: boolean;
}) {
  return {
    meta: [
      { title: title === 'Borneo' ? title : `${title} · Borneo` },
      ...(description ? [{ name: 'description', content: description }] : []),
      ...(noindex ? [{ name: 'robots', content: 'noindex, nofollow' }] : []),
    ],
  };
}
