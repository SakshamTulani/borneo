import type {
  CheckoutView,
  OrderView,
  CartLineView,
  CartView,
  ProductDetail,
  ProductSummary,
  ProductVariant,
} from '@borneo/shared';

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
  bundles: [],
  reviews: { counts: [0, 0, 0, 0, 0], page: { items: [], nextCursor: null } },
  ...over,
});

const policy = {
  phone:
    'Replacement within 7 days of delivery if it arrives damaged or defective. No returns for change of mind.',
  audio:
    'Return within 7 days of delivery for any reason. Replacement if it arrives damaged or defective.',
};

export const cartLineFixture = (over: Partial<CartLineView> = {}): CartLineView => ({
  key: 'item:BP4-6-128-FOR',
  kind: 'item',
  qty: 1,
  maxQty: 5,
  status: 'ok',
  name: 'Borneo Pulse 4',
  product: {
    name: 'Borneo Pulse 4',
    slug: 'pulse-4',
    sku: 'BP4-6-128-FOR',
    options: { colour: 'Forest', storage: '6 GB + 128 GB' },
    image: { src: 'https://images.example.com/pulse-4-front', alt: 'Borneo Pulse 4' },
    returnPolicy: policy.phone,
  },
  members: [],
  isPreorder: false,
  unitPricePaise: 1_499_900,
  flash: null,
  linePaise: 1_499_900,
  couponDiscountPaise: 0,
  delivery: null,
  ...over,
});

export const budsLineFixture = (over: Partial<CartLineView> = {}): CartLineView =>
  cartLineFixture({
    key: 'item:EB2-BLK',
    name: 'Echo Buds 2',
    product: {
      name: 'Echo Buds 2',
      slug: 'echo-buds-2',
      sku: 'EB2-BLK',
      options: { colour: 'Black' },
      image: null,
      returnPolicy: policy.audio,
    },
    unitPricePaise: 349_900,
    linePaise: 349_900,
    ...over,
  });

export const cartFixture = (over: Partial<CartView> = {}): CartView => {
  const lines = over.lines ?? [cartLineFixture()];
  const subtotal = lines.reduce((n, l) => n + l.linePaise, 0);
  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotalPaise: subtotal,
    coupon: null,
    totalPaise: subtotal,
    emiFromPaise: 70_000,
    coupons: [
      {
        code: 'WELCOME500',
        name: '₹500 off orders above ₹4,999',
        validTo: Date.UTC(2026, 11, 31),
        savingPaise: 50_000,
        reason: null,
      },
    ],
    paymentOffers: [
      {
        id: 'po1',
        kind: 'bank',
        name: '10% instant discount with HDFC Bank cards',
        validTo: Date.UTC(2026, 11, 31),
        savingPaise: null,
        reason: 'On orders of ₹15,000 or more.',
      },
    ],
    delivery: null,
    suggestions: [],
    canCheckout: true,
    ...over,
  };
};

/** `GET /me/checkout` at the default address with nothing chosen. */
export const checkoutFixture = (over: Partial<CheckoutView> = {}): CheckoutView => ({
  cart: cartFixture({
    lines: [
      cartLineFixture({
        delivery: { status: 'deliverable', from: '2026-10-08', to: '2026-10-09' },
      }),
    ],
    count: 1,
    subtotalPaise: 2_499_900,
    totalPaise: 2_499_900,
    coupons: [],
    paymentOffers: [],
  }),
  addressId: 'a1',
  methods: [
    { method: 'upi', allowed: true, reasons: [] },
    { method: 'card', allowed: true, reasons: [] },
    { method: 'emi', allowed: true, reasons: [] },
    { method: 'cod', allowed: false, reasons: ['FLASH_SALE'] },
  ],
  banks: ['HDFC'],
  emiPlans: [
    {
      bank: 'HDFC',
      tenureMonths: 6,
      annualRateBps: 1500,
      monthlyPaise: 435_100,
      noCostOfferId: 'po-nocost',
    },
  ],
  paymentOffers: [
    {
      id: 'po-hdfc',
      kind: 'bank',
      name: '10% off with HDFC cards',
      validTo: Date.UTC(2026, 11, 31),
      methods: ['card'],
      banks: ['HDFC'],
      tenureMonths: null,
      savingPaise: 150_000,
      reason: null,
    },
  ],
  totals: {
    subtotalPaise: 2_499_900,
    couponDiscountPaise: 0,
    paymentDiscountPaise: 0,
    totalPaise: 2_499_900,
    emiMonthlyPaise: null,
  },
  paymentOfferReason: null,
  blocks: ['NO_PAYMENT_METHOD'],
  canPlace: false,
  ...over,
});

/** An order waiting for payment with its 5-minute hold (D-56). */
export const orderFixture = (over: Partial<OrderView> = {}): OrderView => ({
  id: '0b8f7f8e-1f7a-4d2f-9a0e-5d1c2b3a4f50',
  number: 'BN-000042',
  status: 'pending_payment',
  placedAt: Date.UTC(2026, 9, 6, 6, 30),
  address: {
    name: 'Asha Rao',
    phone: '9876543210',
    line1: '12, 4th Cross',
    line2: null,
    landmark: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
  },
  items: [
    {
      id: '5a6b7c8d-0000-4000-8000-000000000001',
      sku: 'BP4-6-128-FOR',
      name: 'Borneo Pulse 4',
      slug: 'borneo-pulse-4',
      options: { colour: 'Forest' },
      qty: 1,
      mrpPaise: 2_799_900,
      unitPricePaise: 2_499_900,
      discountPaise: 0,
      bundleName: null,
      isFlash: false,
      isPreorder: false,
      image: null,
      returnWindowEndsAt: null,
      returnRequest: null,
      returnOptions: [],
    },
  ],
  subtotalPaise: 2_499_900,
  couponDiscountPaise: 0,
  couponCode: null,
  paymentDiscountPaise: 0,
  paymentOfferName: null,
  totalPaise: 2_499_900,
  payment: {
    method: 'upi',
    bank: null,
    tenureMonths: null,
    attemptId: '1c2d3e4f-0000-4000-8000-000000000001',
  },
  holdExpiresAt: Date.UTC(2026, 9, 6, 6, 35),
  eta: { from: '2026-10-08', to: '2026-10-09' },
  isPreorder: false,
  invoiceNumber: null,
  notice: null,
  canCancel: true,
  tracking: {
    steps: [
      { step: 'placed', at: Date.UTC(2026, 9, 6, 6, 30), state: 'done' },
      { step: 'confirmed', at: null, state: 'current' },
      { step: 'packed', at: null, state: 'upcoming' },
      { step: 'shipped', at: null, state: 'upcoming' },
      { step: 'outForDelivery', at: null, state: 'upcoming' },
      { step: 'delivered', at: null, state: 'upcoming' },
    ],
    courier: null,
    trackingNo: null,
  },
  deliveredAt: null,
  refunds: [],
  demoNextStep: null,
  ...over,
});
