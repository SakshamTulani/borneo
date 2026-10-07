// Home and category artwork (D-180): hosted sample photos until Borneo photography exists.
// Each banner names a category slug and is shown only while that category exists.

const photo = (id: string) => `https://images.unsplash.com/${id}`;

export type HomeBanner = {
  key: string;
  categorySlug: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  image: string;
  /** Spans the full row; text always sits on a dark scrim (on-tile colours). */
  wide?: boolean;
};

export const HOME_BANNERS: HomeBanner[] = [
  {
    key: 'audio',
    categorySlug: 'audio',
    eyebrow: 'Audio',
    title: 'Hear more. Carry less.',
    body: 'Earbuds, headphones and speakers.',
    cta: 'Shop audio',
    image: photo('photo-1599669454699-248893623440'),
  },
  {
    key: 'tvs',
    categorySlug: 'tvs',
    eyebrow: 'Borneo Vista',
    title: 'Your living room, upgraded.',
    body: 'TVs from 43 to 65 inches.',
    cta: 'Shop TVs',
    image: photo('photo-1593784991251-92ded75ea290'),
  },
  {
    key: 'sweep',
    categorySlug: 'robot-vacuums',
    eyebrow: 'Borneo Sweep',
    title: 'Floors done before you get home.',
    body: 'Robot vacuums for every kind of floor.',
    cta: 'Shop robot vacuums',
    image: photo('photo-1762501748150-7fd88647fc2c'),
    wide: true,
  },
];

/** Category tile artwork by slug; categories without one show a plain tile. */
// One light studio set, reused from the category's product photos (D-180).
export const CATEGORY_ART: Record<string, string> = {
  smartphones: photo('photo-1695973056909-67189edc1c9e'),
  audio: photo('photo-1583394838336-acd977736f90'),
  wearables: photo('photo-1660844817855-3ecc7ef21f12'),
  accessories: photo('photo-1709236709044-159f627b7971'),
  'smart-home': photo('photo-1730967844913-29eb5cae5f34'),
  tvs: photo('photo-1697457643599-77b5d074121f'),
  'robot-vacuums': photo('photo-1558317374-067fb5f30001'),
};
