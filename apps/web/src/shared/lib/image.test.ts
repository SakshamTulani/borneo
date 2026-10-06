import { describe, expect, it } from 'vitest';
import { imageSource } from './image';

describe('imageSource (D-180)', () => {
  it('D-180: resizing hosts get a cropped srcSet and the largest width as src', () => {
    const s = imageSource('https://images.unsplash.com/photo-1', { widths: [400, 800], aspect: 1 });
    expect(s.src).toBe('https://images.unsplash.com/photo-1?auto=format&fit=crop&q=75&w=800&h=800');
    expect(s.srcSet).toBe(
      'https://images.unsplash.com/photo-1?auto=format&fit=crop&q=75&w=400&h=400 400w, ' +
        'https://images.unsplash.com/photo-1?auto=format&fit=crop&q=75&w=800&h=800 800w',
    );
  });

  it('D-180: other hosts and invalid URLs are used as given', () => {
    expect(imageSource('https://cdn.example.com/a.jpg')).toEqual({
      src: 'https://cdn.example.com/a.jpg',
    });
    expect(imageSource('not a url')).toEqual({ src: 'not a url' });
  });
});
