import type { Discount, PaymentMethod } from '@borneo/shared';
import { inr } from './ids';

/** Offer windows are relative to seeding time, in days. */
export const OFFER_WINDOW_DAYS = { from: -7, to: 90 };

export type SeedCoupon = {
  code: string;
  name: string;
  discount: Discount;
  minOrderPaise?: number;
  categories?: string[];
};

export type SeedPaymentOffer = {
  key: string;
  name: string;
  banks?: string[];
  minOrderPaise?: number;
  categories?: string[];
  /** Everyone paying this way gets it: allows the effective-price line (D-32). */
  appliesToAll: boolean;
} & (
  | { kind: 'bank'; methods: Exclude<PaymentMethod, 'cod'>[]; discount: Discount }
  | { kind: 'noCostEmi'; tenureMonths: number; annualRateBps: number }
);

/** Coupon shapes per D-40. */
export const coupons: SeedCoupon[] = [
  {
    code: 'WELCOME500',
    name: '₹500 off orders above ₹4,999',
    discount: { kind: 'flat', amountPaise: inr(500) },
    minOrderPaise: inr(4999),
  },
  {
    code: 'AUDIO10',
    name: '10% off audio, up to ₹1,000',
    discount: { kind: 'percent', bps: 1000, maxPaise: inr(1000) },
    categories: ['audio'],
  },
];

export const paymentOffers: SeedPaymentOffer[] = [
  {
    key: 'hdfc-card-10',
    kind: 'bank',
    name: '10% instant discount with HDFC Bank cards',
    methods: ['card', 'emi'],
    banks: ['HDFC'],
    discount: { kind: 'percent', bps: 1000, maxPaise: inr(2000) },
    minOrderPaise: inr(15000),
    appliesToAll: true,
  },
  {
    key: 'icici-upi-750',
    kind: 'bank',
    name: '₹750 off with ICICI Bank UPI',
    methods: ['upi'],
    banks: ['ICICI'],
    discount: { kind: 'flat', amountPaise: inr(750) },
    minOrderPaise: inr(10000),
    appliesToAll: true,
  },
  {
    key: 'phones-no-cost-6',
    kind: 'noCostEmi',
    name: 'No-cost EMI for 6 months on smartphones',
    tenureMonths: 6,
    annualRateBps: 1500,
    banks: ['HDFC', 'ICICI'],
    categories: ['smartphones'],
    minOrderPaise: inr(10000),
    appliesToAll: true,
  },
];

/** Bank EMI plans for "from ₹X/mo" (D-33, D-47). */
export const emiPlans = [
  { bank: 'HDFC', tenureMonths: 3, annualRateBps: 1500, minAmountPaise: inr(3000) },
  { bank: 'HDFC', tenureMonths: 6, annualRateBps: 1500, minAmountPaise: inr(3000) },
  { bank: 'HDFC', tenureMonths: 9, annualRateBps: 1600, minAmountPaise: inr(3000) },
  { bank: 'HDFC', tenureMonths: 12, annualRateBps: 1600, minAmountPaise: inr(3000) },
  { bank: 'ICICI', tenureMonths: 3, annualRateBps: 1500, minAmountPaise: inr(3000) },
  { bank: 'ICICI', tenureMonths: 6, annualRateBps: 1500, minAmountPaise: inr(3000) },
  { bank: 'ICICI', tenureMonths: 9, annualRateBps: 1650, minAmountPaise: inr(3000) },
  { bank: 'ICICI', tenureMonths: 12, annualRateBps: 1650, minAmountPaise: inr(3000) },
  { bank: 'SBI', tenureMonths: 6, annualRateBps: 1450, minAmountPaise: inr(5000) },
  { bank: 'SBI', tenureMonths: 12, annualRateBps: 1450, minAmountPaise: inr(5000) },
];

/** Fixed bundles (D-38); the price must be below the members' total (D-06). */
export const bundles = [
  {
    slug: 'pulse-4-audio-pack',
    name: 'Pulse 4 + Echo Buds 2',
    price: 17499,
    items: [
      { sku: 'BP4-6-128-FOR', qty: 1 },
      { sku: 'EB2-SGE', qty: 1 },
    ],
  },
  {
    slug: 'apex-2-starter-kit',
    name: 'Apex 2 starter kit',
    price: 66999,
    items: [
      { sku: 'BA2-12-256-OBS', qty: 1 },
      { sku: 'SHD-BA2', qty: 1 },
      { sku: 'PWR-67G', qty: 1 },
    ],
  },
];

/** Real cap and real end time (D-140). Times are hours from seeding. */
export const flashSales = [
  {
    key: 'echo-buds-2-live',
    sku: 'EB2-BLK',
    salePrice: 2799,
    startsInHours: -2,
    durationHours: 24,
    cap: 40,
  },
  {
    key: 'pulse-4-upcoming',
    sku: 'BP4-8-256-GRA',
    salePrice: 14999,
    startsInHours: 48,
    durationHours: 6,
    cap: 25,
  },
];

/** Configurable synonyms incl. Hinglish (D-111). */
export const searchSynonyms = [
  { term: 'earbuds', synonyms: ['earphones', 'tws', 'buds', 'in-ear', 'earpods'] },
  { term: 'headphones', synonyms: ['headset', 'over-ear', 'cans'] },
  { term: 'smartphone', synonyms: ['phone', 'mobile', 'fone', 'mobail', 'handset'] },
  { term: 'smartwatch', synonyms: ['watch', 'ghadi', 'smart watch'] },
  { term: 'tv', synonyms: ['television', 'led tv', 'smart tv', 'tivi'] },
  { term: 'charger', synonyms: ['adapter', 'adaptor', 'chargr', 'fast charger'] },
  { term: 'speaker', synonyms: ['bluetooth speaker', 'boombox', 'bass'] },
  { term: 'robot vacuum', synonyms: ['robot', 'vacuum cleaner', 'jhadu pocha', 'mop robot'] },
  { term: 'case', synonyms: ['cover', 'back cover', 'phone cover'] },
];

/** Flash checkout blocks these (D-143). */
export const disposableDomains = [
  '10minutemail.com',
  'getnada.com',
  'guerrillamail.com',
  'mailinator.com',
  'sharklasers.com',
  'temp-mail.org',
  'trashmail.com',
  'yopmail.com',
];
