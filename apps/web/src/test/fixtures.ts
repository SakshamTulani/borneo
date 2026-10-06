import type { ProductDetail, ProductSummary, ProductVariant } from '@borneo/shared';

// Test fixtures shaped like API responses. Values are examples, not rule outputs.

export const summaryFixture = (over: Partial<ProductSummary> = {}): ProductSummary => ({
  id: 'p-buds',
  slug: 'echo-buds-2',
  name: 'Echo Buds 2',
  categorySlug: 'audio',
  lineName: 'Echo Buds',
  tier: 'value',
  status: 'live',
  availability: 'inStock',
  price: {
    sellingPaise: 349_900,
    priceSource: 'regular',
    mrpPaise: 499_900,
    savings: { paise: 150_000, percent: 30 },
  },
  flash: null,
  rating: { average: null, count: 0 },
  image: { src: 'https://images.example.com/echo-buds-2', alt: 'Echo Buds 2' },
  ...over,
});

export const variantFixture = (over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: 'v1',
  sku: 'BP4-6-128-FOR',
  options: { colour: 'Forest', storage: '6 GB + 128 GB' },
  availability: 'inStock',
  price: {
    sellingPaise: 1_499_900,
    priceSource: 'regular',
    mrpPaise: 1_699_900,
    savings: { paise: 200_000, percent: 11 },
    emiFromPaise: 70_000,
  },
  flash: null,
  offers: [
    {
      id: 'o1',
      kind: 'bank',
      name: '10% off with Demo Bank cards',
      validTo: Date.UTC(2026, 9, 31),
      status: 'available',
    },
    {
      id: 'o2',
      kind: 'coupon',
      name: '₹500 off',
      code: 'WELCOME500',
      minOrderPaise: 499_900,
      validTo: Date.UTC(2026, 9, 31),
      status: 'available',
    },
  ],
  ...over,
});

export const productFixture = (over: Partial<ProductDetail> = {}): ProductDetail => ({
  id: 'p-pulse-4',
  slug: 'pulse-4',
  name: 'Borneo Pulse 4',
  modelNumber: 'BP4-2025',
  lineName: 'Borneo Pulse',
  tier: 'value',
  status: 'live',
  category: { slug: 'smartphones', name: 'Smartphones' },
  images: [
    { src: 'https://images.example.com/pulse-4-front', alt: 'Borneo Pulse 4' },
    { src: 'https://images.example.com/pulse-4-back', alt: 'Borneo Pulse 4, another view' },
  ],
  explainer: 'A 120 Hz screen and a two-day battery.',
  whoFor: 'First smartphone buyers.',
  notFor: 'Mobile gamers.',
  dispatch: null,
  optionKeys: ['colour', 'storage'],
  variants: [
    variantFixture(),
    variantFixture({
      id: 'v2',
      sku: 'BP4-6-128-GRA',
      options: { colour: 'Graphite', storage: '6 GB + 128 GB' },
      availability: 'outOfStock',
    }),
    variantFixture({
      id: 'v3',
      sku: 'BP4-8-256-FOR',
      options: { colour: 'Forest', storage: '8 GB + 256 GB' },
    }),
  ],
  specs: [
    { title: 'Display', rows: [{ label: 'Display', value: '6.7 in' }, { label: 'Refresh rate' }] },
  ],
  compatibility: [{ key: 'connector', text: 'Connector: USB-C' }],
  returnPolicy:
    'Replacement within 7 days of delivery if it arrives damaged or defective. No returns for change of mind.',
  faqs: [{ question: 'Is there a charger in the box?', answer: 'No.' }],
  rating: { average: null, count: 0 },
  suggestions: [
    {
      product: summaryFixture({
        id: 'p-case',
        slug: 'shield-pulse-4',
        name: 'Shield case for Pulse 4',
        categorySlug: 'accessories',
        lineName: 'Borneo Shield',
      }),
      reason: 'Fits your Borneo Pulse 4',
    },
  ],
  successor: null,
  ...over,
});
