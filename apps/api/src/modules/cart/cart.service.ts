import {
  addEntry,
  cartAfterOrder,
  cartReady,
  codEligibility,
  combineDeliveries,
  couponCodeSchema,
  itemKey,
  mergeCarts,
  normalizeEntries,
  parseLineKey,
  pickSuggestions,
  policySummary,
  priceCart,
  type CartAddResult,
  type CartEntry,
  type CartLineView,
  type CartMergeRequest,
  type CartQuoteRequest,
  type CartView,
  type CustomerId,
  type DeliveryCheck,
  type LineDelivery,
  type ProductSummary,
  type RelationEdge,
  type SuggestionSurface,
} from '@borneo/shared';
import { AppError, notFound } from '../../errors';
import type { BundleRow, CartProductRow, ItemRow, ListingRow } from '../catalog/index';
import type { OfferBook } from '../offers/index';
import type { StoredCart } from './cart.repository';

export type CartDeps = {
  now: () => number;
  loadOfferBook: (now: number) => Promise<OfferBook>;
  loadItems: (skus: string[], now: number) => Promise<ItemRow[]>;
  loadBundles: (slugs: string[], now: number) => Promise<BundleRow[]>;
  readCart: (customerId: CustomerId) => Promise<StoredCart>;
  /** Runs `change` under a lock on the customer's cart and saves what it returns. */
  changeCart: (
    customerId: CustomerId,
    change: (current: StoredCart) => StoredCart | Promise<StoredCart>,
  ) => Promise<StoredCart>;
  /** Delivery module: estimate for one variant at one pincode (D-50–55). */
  checkDelivery: (sku: string, pincode: string, qty: number) => Promise<DeliveryCheck>;
  loadEdges: (productIds: string[]) => Promise<RelationEdge[]>;
  listBuyable: (productIds: string[]) => Promise<ListingRow[]>;
  summarize: (rows: ListingRow[]) => Promise<ProductSummary[]>;
  soleVariantSkus: (productIds: string[]) => Promise<Map<string, string>>;
};

type Resolved = { entry: CartEntry; row: ItemRow | BundleRow };

const lineMissing = () => notFound('CART_LINE_NOT_FOUND', "That item isn't in your cart.");

const productView = (p: CartProductRow) => ({
  name: p.name,
  slug: p.slug,
  sku: p.sku,
  options: p.options,
  image: p.image,
  returnPolicy: policySummary(p.returnPolicy),
});

const productIdsOf = (row: ItemRow | BundleRow) =>
  'product' in row ? [row.product.productId] : row.members.map((m) => m.productId);

/** The line part of a delivery check (invalid or unknown pincodes are not deliverable). */
const lineDelivery = (check: DeliveryCheck): LineDelivery =>
  check.estimate.status === 'deliverable'
    ? { status: 'deliverable', from: check.estimate.from, to: check.estimate.to }
    : check.estimate.status === 'outOfStockHere'
      ? { status: 'outOfStockHere' }
      : { status: 'notDeliverable' };

/**
 * The cart (D-192–D-199). A browser cart is priced through `quote`; an account cart is stored and
 * changed under a lock. Prices, offers, stock and delivery are worked out on every read from the
 * shared rules: nothing is held or stored (D-56, D-194).
 */
export function createCartService(deps: CartDeps) {
  async function resolve(entries: CartEntry[], now: number): Promise<Resolved[]> {
    const refs = entries.map((e) => parseLineKey(e.key)!);
    const [items, bundles] = await Promise.all([
      deps.loadItems(
        refs.flatMap((r) => (r.kind === 'item' ? [r.sku] : [])),
        now,
      ),
      deps.loadBundles(
        refs.flatMap((r) => (r.kind === 'bundle' ? [r.slug] : [])),
        now,
      ),
    ]);
    const rows = new Map<string, ItemRow | BundleRow>([
      ...items.map((i) => [i.key, i] as const),
      ...bundles.map((b) => [b.key, b] as const),
    ]);
    // A key that names nothing (e.g. an old browser cart) simply drops out.
    return entries.flatMap((entry) => {
      const row = rows.get(entry.key);
      return row ? [{ entry, row }] : [];
    });
  }

  async function suggest(from: string[], exclude: ReadonlySet<string>, surface: SuggestionSurface) {
    const edges = await deps.loadEdges(from);
    const buyable = new Map(
      (await deps.listBuyable([...new Set(edges.map((e) => e.toProductId))])).map((r) => [r.id, r]),
    );
    const picks = pickSuggestions({
      edges: edges.filter((e) => buyable.has(e.toProductId)),
      surface,
      exclude,
    });
    const [summaries, skus] = await Promise.all([
      deps.summarize(picks.map((p) => buyable.get(p.productId)!)),
      deps.soleVariantSkus(picks.map((p) => p.productId)),
    ]);
    const cards = new Map(summaries.map((s) => [s.id, s]));
    return picks.flatMap((p) => {
      const product = cards.get(p.productId);
      const sku = skus.get(p.productId);
      if (!product) return [];
      // One tap to add only when there is nothing to choose and it is in stock (D-199).
      const addKey = sku && product.availability === 'inStock' ? itemKey(sku) : null;
      return [{ product, reason: p.reason, addKey }];
    });
  }

  async function deliveryFor(row: ItemRow | BundleRow, qty: number, pincode: string) {
    const parts =
      'product' in row
        ? [{ sku: row.product.sku, qty }]
        : row.members.map((m) => ({ sku: m.sku, qty: m.qty * qty }));
    return Promise.all(parts.map((p) => deps.checkDelivery(p.sku, pincode, p.qty)));
  }

  async function view(cart: StoredCart, pincode: string | undefined): Promise<CartView> {
    return (await build(cart, pincode, true)).view;
  }

  /** The cart as shown, plus what checkout needs to place it (priced lines, facts, offers). */
  async function build(cart: StoredCart, pincode: string | undefined, withSuggestions: boolean) {
    const now = deps.now();
    const [resolved, book] = await Promise.all([
      resolve(cart.entries, now),
      deps.loadOfferBook(now),
    ]);
    const priced = priceCart({
      entries: resolved.map(({ entry, row }) => ({ ...entry, facts: row.facts })),
      couponCode: cart.couponCode,
      ...book,
      now,
    });
    const payable = (i: number) =>
      priced.lines[i]!.status === 'ok' || priced.lines[i]!.status === 'notEnoughStock';

    const inCart = new Set(resolved.flatMap((r) => productIdsOf(r.row)));
    const [checks, suggestions] = await Promise.all([
      pincode
        ? Promise.all(
            resolved.map(({ entry, row }, i) =>
              payable(i) ? deliveryFor(row, entry.qty, pincode) : Promise.resolve(null),
            ),
          )
        : Promise.resolve(resolved.map(() => null)),
      withSuggestions ? suggest([...inCart], inCart, 'cart') : Promise.resolve([]),
    ]);

    const lines = resolved.map(({ entry, row }, i): CartLineView => {
      const p = priced.lines[i]!;
      const lineChecks = checks[i];
      return {
        key: entry.key,
        kind: 'product' in row ? 'item' : 'bundle',
        qty: entry.qty,
        maxQty: p.maxQty,
        status: p.status,
        name: 'product' in row ? row.product.name : row.name,
        product: 'product' in row ? productView(row.product) : null,
        members:
          'product' in row ? [] : row.members.map((m) => ({ ...productView(m), qty: m.qty })),
        isPreorder: p.isPreorder,
        unitPricePaise: p.unitPricePaise,
        flash: p.flash,
        linePaise: p.linePaise,
        couponDiscountPaise: p.couponDiscountPaise,
        delivery: lineChecks ? combineDeliveries(lineChecks.map(lineDelivery)) : null,
      };
    });

    let delivery: CartView['delivery'] = null;
    let cod: ReturnType<typeof codEligibility> | null = null;
    if (pincode) {
      const all = checks.flatMap((c) => c ?? []);
      // COD: every line's pincode × category, no pre-orders, no live flash sales (D-70, D-71).
      // The order-value cap (D-72) is still open.
      cod = codEligibility({
        lines: all.map((c) => {
          const reasons = c.estimate.status === 'deliverable' ? c.estimate.cod.reasons : [];
          return {
            codAllowedAtPincode:
              c.estimate.status === 'deliverable' && !reasons.includes('PINCODE'),
            isPreorder: reasons.includes('PREORDER'),
            isFlash: reasons.includes('FLASH_SALE'),
          };
        }),
        orderTotalPaise: priced.totalPaise,
      });
      delivery = {
        pincode,
        place: all.find((c) => c.place)?.place ?? null,
        cod: cod.allowed ? { allowed: true, reasons: [] } : cod,
      };
    }

    const shown: CartView = {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotalPaise: priced.subtotalPaise,
      coupon: priced.coupon,
      totalPaise: priced.totalPaise,
      ...(priced.emiFromPaise !== undefined ? { emiFromPaise: priced.emiFromPaise } : {}),
      coupons: priced.coupons,
      paymentOffers: priced.paymentOffers,
      delivery,
      suggestions,
      canCheckout: cartReady(
        priced.canCheckout,
        lines.map((l) => l.delivery),
      ),
    };
    return {
      view: shown,
      pricing: priced,
      book,
      cod,
      entries: resolved.map(({ entry, row }) => ({
        ...entry,
        facts: row.facts,
        ...('members' in row ? { memberSkus: row.members.map((m) => m.sku) } : {}),
      })),
    };
  }

  /** Adding needs something we sell and can supply in that quantity (D-193, D-198). */
  async function checkAdd(entries: CartEntry[], add: CartEntry): Promise<CartEntry[]> {
    const now = deps.now();
    const [found] = await resolve([add], now);
    if (!found) throw notFound('PRODUCT_NOT_FOUND', "We couldn't find that product.");
    const added = addEntry(entries, add);
    if (!added.ok)
      throw new AppError(422, 'CART_FULL', 'Your cart is full. Remove something first.');
    const qty = added.entries.find((e) => e.key === add.key)!.qty;
    const priced = priceCart({
      entries: [{ key: add.key, qty, facts: found.row.facts }],
      coupons: [],
      paymentOffers: [],
      emiPlans: [],
      now,
    });
    const status = priced.lines[0]!.status;
    if (status === 'unavailable') throw new AppError(422, 'NOT_FOR_SALE', "This isn't on sale.");
    if (status === 'outOfStock') throw new AppError(409, 'OUT_OF_STOCK', 'This is out of stock.');
    if (status === 'notEnoughStock')
      throw new AppError(409, 'NOT_ENOUGH_STOCK', "We can't add more of this right now.");
    return added.entries;
  }

  async function addedSummary(entries: CartEntry[], key: string) {
    const now = deps.now();
    const resolved = await resolve(entries, now);
    const added = resolved.find((r) => r.entry.key === key);
    const inCart = new Set(resolved.flatMap((r) => productIdsOf(r.row)));
    return {
      key,
      suggestions: added ? await suggest(productIdsOf(added.row), inCart, 'addToCart') : [],
    };
  }

  /** Applying a coupon that doesn't qualify says why and keeps nothing (D-195). */
  async function checkCoupon(cart: StoredCart, code: string): Promise<string> {
    const now = deps.now();
    const [resolved, book] = await Promise.all([
      resolve(cart.entries, now),
      deps.loadOfferBook(now),
    ]);
    const { coupon } = priceCart({
      entries: resolved.map(({ entry, row }) => ({ ...entry, facts: row.facts })),
      couponCode: code,
      ...book,
      now,
    });
    if (coupon?.status !== 'applied')
      throw new AppError(
        422,
        'COUPON_NOT_APPLICABLE',
        coupon?.reason ?? 'This coupon does not apply.',
      );
    return coupon.code;
  }

  return {
    /** Prices a browser cart (D-192); `add` adds a line first. Returns the clean lines to keep. */
    async quote(
      request: CartQuoteRequest,
    ): Promise<{ cart: CartView; added: CartAddResult['added'] | null }> {
      let entries = normalizeEntries(request.lines);
      if (request.add) entries = await checkAdd(entries, request.add);
      const cart = await view({ entries, couponCode: request.couponCode }, request.pincode);
      return {
        cart,
        added: request.add ? await addedSummary(entries, request.add.key) : null,
      };
    },

    get: async (customerId: CustomerId, pincode?: string) =>
      view(await deps.readCart(customerId), pincode),

    async add(customerId: CustomerId, add: CartEntry, pincode?: string): Promise<CartAddResult> {
      const saved = await deps.changeCart(customerId, async (current) => ({
        ...current,
        entries: await checkAdd(current.entries, add),
      }));
      const [cart, added] = await Promise.all([
        view(saved, pincode),
        addedSummary(saved.entries, add.key),
      ]);
      return { cart, added };
    },

    async setQty(customerId: CustomerId, key: string, qty: number, pincode?: string) {
      const saved = await deps.changeCart(customerId, (current) => {
        if (!current.entries.some((e) => e.key === key)) throw lineMissing();
        return {
          ...current,
          entries: current.entries.map((e) => (e.key === key ? { ...e, qty } : e)),
        };
      });
      return view(saved, pincode);
    },

    async remove(customerId: CustomerId, key: string, pincode?: string) {
      const saved = await deps.changeCart(customerId, (current) => {
        if (!current.entries.some((e) => e.key === key)) throw lineMissing();
        return { ...current, entries: current.entries.filter((e) => e.key !== key) };
      });
      return view(saved, pincode);
    },

    async applyCoupon(customerId: CustomerId, code: string, pincode?: string) {
      const saved = await deps.changeCart(customerId, async (current) => ({
        ...current,
        couponCode: await checkCoupon(current, couponCodeSchema.parse(code)),
      }));
      return view(saved, pincode);
    },

    async removeCoupon(customerId: CustomerId, pincode?: string) {
      const saved = await deps.changeCart(customerId, (current) => ({
        ...current,
        couponCode: undefined,
      }));
      return view(saved, pincode);
    },

    /**
     * The account cart priced for checkout at a pincode, with what placing needs. No
     * suggestions: nothing is cross-sold in the payment step (D-73).
     */
    forCheckout: async (customerId: CustomerId, pincode: string | undefined) =>
      build(await deps.readCart(customerId), pincode, false),

    /** Once an order is confirmed its lines (and the coupon it used) leave the cart (D-207). */
    async removeOrdered(
      customerId: CustomerId,
      ordered: { lines: { key: string; qty: number }[]; couponCode: string | null },
    ): Promise<void> {
      await deps.changeCart(customerId, (current) => cartAfterOrder(current, ordered));
    },

    /** The browser cart joins the account cart at sign-in (D-192). */
    async merge(customerId: CustomerId, browser: CartMergeRequest, pincode?: string) {
      const saved = await deps.changeCart(customerId, (current) =>
        mergeCarts(current, { entries: browser.lines, couponCode: browser.couponCode }),
      );
      return view(saved, pincode);
    },
  };
}

export type CartService = ReturnType<typeof createCartService>;
export type CheckoutCart = Awaited<ReturnType<CartService['forCheckout']>>;
