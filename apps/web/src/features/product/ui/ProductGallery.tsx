import { ImageIcon } from 'lucide-react';
import { useState } from 'react';
import { imageSource } from '@/shared/lib/image';
import { cn } from '@/shared/lib/utils';
import type { ProductDetail } from '../model';

/** Lead photo plus thumbnails (D-14, D-180). Placeholder when the product has no photos yet. */
export function ProductGallery({ images }: { images: ProductDetail['images'] }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];

  if (!current)
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-surface">
        <ImageIcon className="size-16 text-line-strong" strokeWidth={1.25} aria-hidden />
      </div>
    );

  const main = imageSource(current.src, { aspect: 1, widths: [600, 900, 1400] });
  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-xl bg-muted">
        <img
          key={current.src}
          src={main.src}
          {...(main.srcSet
            ? { srcSet: main.srcSet, sizes: '(min-width: 1024px) 50vw, 100vw' }
            : {})}
          alt={current.alt}
          fetchPriority="high"
          className="size-full object-cover"
        />
      </div>
      {images.length > 1 ? (
        <ul className="flex gap-2" aria-label="Product photos">
          {images.map((image, i) => {
            const thumb = imageSource(image.src, { aspect: 1, widths: [160] });
            const selected = image === current;
            return (
              <li key={image.src}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1} of ${images.length}`}
                  aria-pressed={selected}
                  className={cn(
                    'block size-16 overflow-hidden rounded-md bg-muted outline-none ring-offset-2 ring-offset-canvas transition focus-visible:ring-2 focus-visible:ring-brand sm:size-20',
                    selected ? 'ring-2 ring-ink' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <img src={thumb.src} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
