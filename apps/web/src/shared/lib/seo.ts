/** The one place that builds route head tags (ADR-0008). */
export function pageHead({ title, description }: { title: string; description?: string }) {
  return {
    meta: [
      { title: title === 'Borneo' ? title : `${title} · Borneo` },
      ...(description ? [{ name: 'description', content: description }] : []),
    ],
  };
}
