// Static demo props for the design-system page. Not real products, prices or offers.
// No business logic: savings, eligibility and delivery results are hand-written examples.
import type { DeliveryState } from '@/shared/ui/commerce/DeliveryChecker';
import type { PriceBlockProps } from '@/shared/ui/commerce/PriceBlock';
import type { ProductCardProps } from '@/shared/ui/commerce/ProductCard';
import type { SpecGroup } from '@/shared/ui/commerce/SpecTable';
import type { TimelineStep } from '@/shared/ui/commerce/OrderTimeline';
import type { VariantOption } from '@/shared/ui/commerce/VariantSelector';

export const demoPrices: { state: string; props: PriceBlockProps }[] = [
  { state: 'Plain price', props: { sellingPaise: 1_299_900, size: 'lg' } },
  {
    state: 'MRP + savings + EMI',
    props: {
      sellingPaise: 2_499_900,
      mrpPaise: 2_999_900,
      savings: { paise: 500_000, percent: 17 },
      emiFromPaise: 208_325,
      size: 'lg',
    },
  },
  {
    state: 'With effective price (offer applies to everyone paying that way)',
    props: {
      sellingPaise: 2_499_900,
      mrpPaise: 2_999_900,
      savings: { paise: 500_000, percent: 17 },
      effective: { paise: 2_349_900, offerName: 'Demo Bank credit card offer' },
      emiFromPaise: 208_325,
      size: 'lg',
    },
  },
  { state: 'Unavailable', props: { sellingPaise: 2_499_900, unavailable: true } },
];

const demoCard = {
  href: '#demo-product',
  familyLabel: 'Demo Pulse · Pro',
  rating: { value: 4.4, count: 52 },
  price: {
    sellingPaise: 3_499_900,
    mrpPaise: 3_999_900,
    savings: { paise: 500_000, percent: 12 },
    emiFromPaise: 291_658,
  },
} satisfies Partial<ProductCardProps>;

export const demoCards: { state: string; props: ProductCardProps }[] = [
  {
    state: 'In stock',
    props: {
      ...demoCard,
      name: 'Demo Pulse 5 Pro',
      availability: 'inStock',
      badges: [{ kind: 'inStock' }, { kind: 'newLaunch' }],
    },
  },
  {
    state: 'Flash sale, real low stock',
    props: {
      ...demoCard,
      name: 'Demo Pods Air',
      availability: 'inStock',
      badges: [{ kind: 'flashSale' }, { kind: 'lowStock', count: 3 }],
    },
  },
  {
    state: 'Pre-order, no reviews yet',
    props: {
      ...demoCard,
      name: 'Demo Pulse 6',
      rating: { count: 0 },
      availability: 'preorder',
      badges: [{ kind: 'preorder' }],
    },
  },
  {
    state: 'Out of stock (Watch)',
    props: {
      ...demoCard,
      name: 'Demo Home Hub',
      availability: 'outOfStock',
      badges: [{ kind: 'outOfStock' }, { kind: 'worksWith', ecosystem: 'Alexa' }],
    },
  },
];

export const demoColours: VariantOption[] = [
  { value: 'forest', label: 'Forest', swatch: '#1f4d3a', available: true },
  { value: 'sand', label: 'Sand', swatch: '#d9c8a9', available: true },
  { value: 'graphite', label: 'Graphite', swatch: '#3a3a3c', available: false },
];

export const demoStorage: VariantOption[] = [
  { value: '128', label: '128 GB', available: true },
  { value: '256', label: '256 GB', available: true },
  { value: '512', label: '512 GB', available: false },
];

export const demoDelivery: { state: string; pincode: string; result: DeliveryState }[] = [
  { state: 'Idle', pincode: '', result: { status: 'idle' } },
  { state: 'Checking', pincode: '560001', result: { status: 'checking' } },
  {
    state: 'Deliverable, COD available',
    pincode: '560001',
    result: {
      status: 'deliverable',
      from: '2026-10-09T06:00:00Z',
      to: '2026-10-11T06:00:00Z',
      cod: true,
    },
  },
  {
    state: 'Deliverable, no COD',
    pincode: '793001',
    result: {
      status: 'deliverable',
      from: '2026-10-12T06:00:00Z',
      to: '2026-10-15T06:00:00Z',
      cod: false,
    },
  },
  { state: 'Not deliverable', pincode: '744101', result: { status: 'notDeliverable' } },
  { state: 'Out of stock here', pincode: '110001', result: { status: 'outOfStockHere' } },
  {
    state: 'Invalid pincode',
    pincode: '5600',
    result: { status: 'invalid', message: 'Enter a 6-digit pincode' },
  },
];

/** A real, fixed deadline: 31 Dec 2026, 11:59:59 pm IST. It never resets. */
export const demoDeadline = '2026-12-31T18:29:59Z';
const end = Date.parse(demoDeadline);
export const demoCountdownFrozen: { state: string; now: number; startsAt?: string }[] = [
  {
    state: 'Upcoming (frozen clock)',
    startsAt: '2026-12-31T12:30:00Z',
    now: Date.parse('2026-12-31T10:00:00Z'),
  },
  { state: 'Live (frozen clock)', now: end - 2 * 3600_000 - 14 * 60_000 },
  { state: 'Urgent, under a minute (frozen clock)', now: end - 45_000 },
  { state: 'Ended (frozen clock)', now: end + 1 },
];

export const demoSpecs: SpecGroup[] = [
  {
    title: 'Display',
    rows: [
      { label: 'Size', value: '6.7 in' },
      { label: 'Refresh rate', value: '120 Hz' },
    ],
  },
  {
    title: 'Battery',
    rows: [{ label: 'Capacity', value: '5000 mAh' }, { label: 'Wireless charging' }],
  },
];

export const demoTimeline: TimelineStep[] = [
  { label: 'Order placed', at: '6 Oct, 10:12 am', status: 'done' },
  { label: 'Confirmed', at: '6 Oct, 10:13 am', status: 'done' },
  { label: 'Packed', at: '7 Oct, 9:02 am', status: 'done' },
  { label: 'Shipped', at: '7 Oct, 6:40 pm', status: 'current' },
  { label: 'Out for delivery', status: 'upcoming' },
  { label: 'Delivered', status: 'upcoming' },
];
