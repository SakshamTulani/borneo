/** An `<img>`'s sources: `srcSet` only when the host can resize on request. */
export type ImageSource = { src: string; srcSet?: string };

/** Hosts that resize by query string (imgix parameters). Other URLs are used as given. */
const RESIZING_HOSTS = new Set(['images.unsplash.com']);

/**
 * Sized sources for a product photo (D-180). `aspect` is width / height; the host crops to it.
 * The default width is the largest one, for browsers that ignore `srcSet`.
 */
export function imageSource(
  src: string,
  { widths = [400, 800, 1200], aspect }: { widths?: number[]; aspect?: number } = {},
): ImageSource {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return { src };
  }
  if (!RESIZING_HOSTS.has(url.hostname)) return { src };
  const at = (w: number) => {
    const sized = new URL(url);
    sized.searchParams.set('auto', 'format');
    sized.searchParams.set('fit', 'crop');
    sized.searchParams.set('q', '75');
    sized.searchParams.set('w', String(w));
    if (aspect) sized.searchParams.set('h', String(Math.round(w / aspect)));
    return sized.toString();
  };
  return {
    src: at(Math.max(...widths)),
    srcSet: widths.map((w) => `${at(w)} ${w}w`).join(', '),
  };
}
