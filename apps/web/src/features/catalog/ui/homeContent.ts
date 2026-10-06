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
    image: photo('photo-1762859731349-c9ff2808b672'),
    wide: true,
  },
];

/** Category tile artwork by slug; categories without one show a plain tile. */
export const CATEGORY_ART: Record<string, string> = {
  smartphones: photo('photo-1784407097298-759eb54e8aeb'),
  audio: photo('photo-1505740106531-4243f3831c78'),
  wearables: photo('photo-1772983069620-43a502c2784f'),
  accessories: photo('photo-1575543419095-0b090628213f'),
  'smart-home': photo('photo-1511842745775-b366af36db2a'),
  tvs: photo('photo-1595935736128-db1f0a261263'),
  'robot-vacuums': photo('photo-1558317374-24793bc9f2fb'),
};
