import {
  bundleKey,
  canBuyFlash,
  cancelOutcome,
  cancelText,
  checkout,
  combineDeliveries,
  formatInr,
  invoiceNumber,
  isIntraState,
  itemKey,
  liveFlashSale,
  nextDemoReturnStatus,
  nextDemoStep,
  orderLines,
  orderNoticeText,
  orderNumber,
  resolvePaidOrder,
  returnOptions,
  returnWindowEndsAt,
  startHold,
  statusAfterStep,
  trackingTimeline,
  TRACKING_LABELS,
  warehousesBySpeed,
  type AddressSnapshot,
  type CheckoutQuery,
  type CheckoutView,
  type CustomerId,
  type DeliveryLane,
  type MockPaymentRequest,
  type NotificationKind,
  type OrderPage,
  type OrderView,
  type PlaceOrderRequest,
  type ProductImage,
  type ReturnRequestView,
  type TrackingEvent,
} from '@borneo/shared';
import type { CourierTracking } from '../../adapters/courier/index';
import type { NotificationAdapter } from '../../adapters/notifications/index';
import type { PaymentGateway } from '../../adapters/payments/index';
import type { InvoiceDocument } from '../../documents/invoice';
import { AppError, notFound } from '../../errors';
import type { AddressRow } from '../addresses/index';
import type { CheckoutCart } from '../cart/index';
import type { OrderFactsRow } from '../catalog/index';
import type {
  CancelDecision,
  NewOrder,
  OrderRecord,
  PlaceResult,
  SettleDecision,
  TrackingStepName,
} from './orders.repository';
import { orderCursor, readOrderCursor } from './orders.schema';

/** Background work the orders service asks for (pg-boss in the app, ADR-0004). */
export type OrderJobs = {
  /** Ends the hold when it runs out, even if nobody looks at the order again (D-57). */
  holdExpiry(job: { customerId: CustomerId; orderId: string }, at: number): Promise<void>;
  /** Demo: the mock gateway's success arriving late (D-59, D-213). */
  latePayment(
    job: { customerId: CustomerId; orderId: string; attemptId: string },
    at: number,
  ): Promise<void>;
};

/** Mock "late success" arrives this long after the hold ends (D-213). */
export const LATE_PAYMENT_DELAY_MS = 10_000;

export type OrdersDeps = {
  now: () => number;
  demoMode: boolean;
  forCheckout: (customerId: CustomerId, pincode: string | undefined) => Promise<CheckoutCart>;
  removeOrdered: (
    customerId: CustomerId,
    ordered: { lines: { key: string; qty: number }[]; couponCode: string | null },
  ) => Promise<void>;
  listAddresses: (customerId: CustomerId) => Promise<AddressRow[]>;
  listLanes: () => Promise<DeliveryLane[]>;
  loadOrderFacts: (skus: string[]) => Promise<OrderFactsRow[]>;
  loadDisposableDomains: () => Promise<Set<string>>;
  countFlashPurchases: (customerId: CustomerId, saleIds: string[]) => Promise<Map<string, number>>;
  findCustomerEmail: (customerId: CustomerId) => Promise<string | undefined>;
  findOrderIdByKey: (customerId: CustomerId, key: string) => Promise<string | undefined>;
  placeOrder: (customerId: CustomerId, order: NewOrder) => Promise<PlaceResult>;
  findOrder: (customerId: CustomerId, orderId: string) => Promise<OrderRecord | undefined>;
  expireHold: (customerId: CustomerId, orderId: string, now: number) => Promise<boolean>;
  settlePayment: (
    customerId: CustomerId,
    input: {
      orderId: string;
      attemptId: string;
      warehouses: Map<string, string[]>;
      decide: SettleDecision;
      at: number;
    },
  ) => Promise<'confirmed' | 'confirmedLate' | 'refunded' | 'refundedCancelled' | 'unchanged'>;
  failAttempt: (customerId: CustomerId, orderId: string, attemptId: string) => Promise<boolean>;
  startAttempt: (customerId: CustomerId, orderId: string, now: number) => Promise<string | null>;
  setGatewayRef: (
    customerId: CustomerId,
    orderId: string,
    attemptId: string,
    ref: string,
  ) => Promise<void>;
  issueInvoice: (
    customerId: CustomerId,
    orderId: string,
    number: (seq: number) => string,
    now: number,
  ) => Promise<void>;
  listOrders: (
    customerId: CustomerId,
    page: { limit: number; after?: { placedAt: Date; id: string } },
  ) => Promise<{ rows: OrderListRow[]; hasMore: boolean }>;
  cancelOrder: (
    customerId: CustomerId,
    orderId: string,
    decide: CancelDecision,
    now: number,
  ) => Promise<{ refundPaise: number } | null>;
  advanceOrder: (
    customerId: CustomerId,
    input: {
      orderId: string;
      from: OrderView['status'];
      step: TrackingStepName;
      status: OrderView['status'];
      at: number;
      courier: { name: string; trackingNo: string };
      returnWindowEndsAt: number;
    },
  ) => Promise<boolean>;
  loadImages: (productIds: string[]) => Promise<Map<string, ProductImage[]>>;
  gateway: PaymentGateway;
  courier: CourierTracking;
  jobs: OrderJobs;
  notifications: NotificationAdapter;
  renderInvoice: (doc: InvoiceDocument) => Uint8Array;
  log: { warn(obj: object, msg: string): void };
};

/** A row of the account's order list (repository shape). */
export type OrderListRow = {
  order: OrderRecord['order'];
  itemCount: number;
  items: { orderId: string; productId: string; name: string }[];
};

type ReturnRow = OrderRecord['returns'][number];

/** A return request as the customer sees it (D-86, D-219). */
function returnView(
  r: ReturnRow,
  context: { orderId: string; orderNumber: string; productName: string },
  refundPaise: number | null,
  demoMode: boolean,
): ReturnRequestView {
  return {
    id: r.id,
    orderId: context.orderId,
    orderNumber: context.orderNumber,
    orderItemId: r.orderItemId,
    productName: context.productName,
    kind: r.kind,
    reason: r.reason,
    details: r.details,
    photoCount: r.photoKeys.length,
    status: r.status,
    refundPaise,
    createdAt: r.createdAt.getTime(),
    updatedAt: r.updatedAt.getTime(),
    demoNextStatus: demoMode ? nextDemoReturnStatus(r.status) : null,
  };
}

const orderMissing = () => notFound('ORDER_NOT_FOUND', "We couldn't find that order.");

const snapshot = (a: AddressRow): AddressSnapshot => ({
  name: a.name,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2,
  landmark: a.landmark,
  city: a.city,
  state: a.state,
  pincode: a.pincode,
});

const BLOCK_ERRORS: Partial<Record<CheckoutView['blocks'][number], [number, string, string]>> = {
  CART_EMPTY: [422, 'CART_EMPTY', 'Your cart is empty.'],
  LINES_NEED_ATTENTION: [409, 'CART_NEEDS_ATTENTION', 'Some items in your cart need attention.'],
  NOT_DELIVERABLE: [422, 'NOT_DELIVERABLE', "Some items can't be delivered to this address."],
  PAYMENT_NOT_ALLOWED: [
    422,
    'PAYMENT_METHOD_NOT_ALLOWED',
    "This payment method isn't available for this order.",
  ],
  EMI_PLAN_NEEDED: [422, 'EMI_PLAN_NEEDED', 'Choose an EMI plan.'],
  PAYMENT_OFFER_NOT_APPLICABLE: [422, 'OFFER_NOT_STACKABLE', "The payment offer doesn't apply."],
};

const CONFLICTS: Record<string, string> = {
  OUT_OF_STOCK: 'Some items just sold out. Check your cart.',
  FLASH_SOLD_OUT: 'The flash sale just sold out. Check your cart.',
  FLASH_LIMIT_REACHED: 'You have already bought this flash sale item (limit 1).',
};

const FLASH_BLOCKS: Record<string, string> = {
  LIMIT_REACHED: 'You have already bought this flash sale item (limit 1).',
  QTY_OVER_LIMIT: 'Flash sale items are limited to 1 per customer.',
  DISPOSABLE_EMAIL: "Flash sales can't be bought with a disposable email address.",
  SOLD_OUT: 'The flash sale has sold out.',
  ENDED: 'The flash sale has ended.',
  NOT_STARTED: "The flash sale hasn't started.",
};

const METHOD_NAMES = { upi: 'UPI', card: 'Card', emi: 'EMI', cod: 'Cash on delivery' } as const;

/**
 * Checkout and orders (D-55–D-59, D-70–D-73, D-201–D-213). Checkout prices the account cart at an
 * address with the payment the customer chose. Placing rechecks everything, reserves stock and
 * either holds it for 5 minutes while the customer pays (prepaid) or allocates it (COD).
 */
export function createOrdersService(deps: OrdersDeps) {
  async function addressFor(customerId: CustomerId, id: string | undefined) {
    const all = await deps.listAddresses(customerId);
    return id ? all.find((a) => a.id === id) : (all.find((a) => a.isDefault) ?? all[0]);
  }

  async function quote(
    customerId: CustomerId,
    address: AddressRow | undefined,
    query: CheckoutQuery,
  ) {
    const cart = await deps.forCheckout(customerId, address?.pincode);
    const result = checkout({
      pricing: cart.pricing,
      deliveries: address ? cart.view.lines.map((l) => l.delivery) : null,
      cod: address ? cart.cod : null,
      choice: {
        ...(query.method ? { method: query.method } : {}),
        ...(query.bank ? { bank: query.bank } : {}),
        ...(query.tenureMonths ? { tenureMonths: query.tenureMonths } : {}),
        ...(query.paymentOfferId ? { paymentOfferId: query.paymentOfferId } : {}),
      },
      ...cart.book,
      now: deps.now(),
    });
    return { cart, result };
  }

  async function notify(
    customerId: CustomerId,
    kind: NotificationKind,
    title: string,
    body: string,
  ) {
    const email = await deps.findCustomerEmail(customerId);
    if (email) await deps.notifications.send({ customerId, email, kind, title, body });
  }

  /** Lazily ends a hold that ran out, in case its job hasn't run yet (D-57). */
  async function expireIfDue(customerId: CustomerId, orderId: string) {
    if (await deps.expireHold(customerId, orderId, deps.now())) {
      const order = await deps.findOrder(customerId, orderId);
      if (order)
        await notify(
          customerId,
          'order_cancelled',
          `Order ${order.order.number} cancelled`,
          orderNoticeText('HOLD_EXPIRED', order.order.totalPaise),
        );
    }
  }

  /**
   * After the order is confirmed (D-102, D-207): invoice for in-stock orders, cart clean-up and the
   * message. The order already stands, so each step is best effort: a failure is logged, never
   * turned into an error for a placed order (a retry would place it twice).
   */
  async function afterConfirmed(customerId: CustomerId, orderId: string) {
    const record = await deps.findOrder(customerId, orderId);
    if (!record) return;
    const { order } = record;
    const steps: [string, () => Promise<void>][] = [
      [
        'invoice',
        async () => {
          if (!order.isPreorder)
            await deps.issueInvoice(
              customerId,
              orderId,
              (seq) => invoiceNumber(seq, deps.now()),
              deps.now(),
            );
        },
      ],
      [
        'cart',
        () =>
          deps.removeOrdered(customerId, {
            lines: record.items.map(({ item, bundleSlug }) =>
              bundleSlug
                ? { key: bundleKey(bundleSlug), qty: 1 }
                : { key: itemKey(item.sku), qty: item.qty },
            ),
            couponCode: record.couponCode,
          }),
      ],
      [
        'message',
        () =>
          notify(
            customerId,
            'order_confirmed',
            `Order ${order.number} confirmed`,
            `Thank you. Your order of ${formatInr(order.totalPaise)} is confirmed.` +
              (order.etaFrom && order.etaTo
                ? ` Estimated delivery ${order.etaFrom} to ${order.etaTo}.`
                : ''),
          ),
      ],
    ];
    for (const [step, run] of steps) {
      try {
        await run();
      } catch (error) {
        deps.log.warn({ orderId, step, error: String(error) }, 'after-confirmation step failed');
      }
    }
  }

  async function openSession(customerId: CustomerId, orderId: string, attemptId: string) {
    const record = (await deps.findOrder(customerId, orderId))!;
    const { order } = record;
    if (order.paymentMethod === 'cod') return;
    const attempt = record.attempts.find((a) => a.id === attemptId)!;
    const { gatewayRef } = await deps.gateway.startSession({
      attemptId,
      orderNumber: order.number,
      amountPaise: order.totalPaise,
      method: order.paymentMethod,
      expiresAt: attempt.expiresAt.getTime(),
    });
    await deps.setGatewayRef(customerId, orderId, attemptId, gatewayRef);
  }

  /** Steps recorded, plus the placing and delivery times orders from before tracking carry. */
  function eventsOf(record: OrderRecord): TrackingEvent[] {
    const events: TrackingEvent[] = record.events.map((e) => ({
      step: e.step,
      at: e.at.getTime(),
    }));
    const has = (step: TrackingEvent['step']) => events.some((e) => e.step === step);
    if (!has('placed')) events.unshift({ step: 'placed', at: record.order.placedAt.getTime() });
    if (record.order.deliveredAt && !has('delivered'))
      events.push({ step: 'delivered', at: record.order.deliveredAt.getTime() });
    return events;
  }

  async function toView(record: OrderRecord): Promise<OrderView> {
    const { order } = record;
    const now = deps.now();
    const active = record.holds.find((h) => h.status === 'active');
    const open = record.attempts.find((a) => a.status === 'started');
    const images = await deps.loadImages([...new Set(record.items.map((i) => i.productId))]);
    const events = eventsOf(record);
    const deliveredAt = order.deliveredAt?.getTime();
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      placedAt: order.placedAt.getTime(),
      address: order.address as AddressSnapshot,
      items: record.items.map(({ item, productId, slug, options, bundleName, isPreorder }) => {
        const requests = record.returns.filter((r) => r.orderItemId === item.id);
        const current = requests.find((r) => r.status !== 'rejected') ?? requests[0] ?? null;
        const refunded = current
          ? record.refunds.find((f) => f.returnRequestId === current.id)
          : undefined;
        return {
          id: item.id,
          sku: item.sku,
          name: item.productName,
          slug,
          options,
          qty: item.qty,
          mrpPaise: item.mrpPaise,
          unitPricePaise: item.unitPricePaise,
          discountPaise: item.discountPaise,
          bundleName,
          isFlash: item.flashSaleId !== null,
          isPreorder,
          image: images.get(productId)?.[0] ?? null,
          returnWindowEndsAt: item.returnWindowEndsAt?.getTime() ?? null,
          returnRequest: current
            ? returnView(
                current,
                { orderId: order.id, orderNumber: order.number, productName: item.productName },
                refunded?.amountPaise ?? null,
                deps.demoMode,
              )
            : null,
          returnOptions:
            order.status === 'delivered'
              ? returnOptions({
                  policy: item.returnPolicy,
                  deliveredAt,
                  now,
                  hasOpenRequest: requests.some((r) => r.status !== 'rejected'),
                })
              : [],
        };
      }),
      subtotalPaise: order.subtotalPaise,
      couponDiscountPaise: order.couponDiscountPaise,
      couponCode: record.couponCode,
      paymentDiscountPaise: order.paymentDiscountPaise,
      paymentOfferName: record.paymentOfferName,
      totalPaise: order.totalPaise,
      payment: {
        method: order.paymentMethod,
        bank: order.paymentBank,
        tenureMonths: order.emiTenureMonths,
        attemptId: order.status === 'pending_payment' ? (open?.id ?? null) : null,
      },
      holdExpiresAt:
        order.status === 'pending_payment' && active ? active.expiresAt.getTime() : null,
      eta: order.etaFrom && order.etaTo ? { from: order.etaFrom, to: order.etaTo } : null,
      isPreorder: order.isPreorder,
      invoiceNumber: record.invoice?.number ?? null,
      notice: order.notice,
      canCancel: cancelOutcome({
        status: order.status,
        prepaid: order.paymentMethod !== 'cod',
        totalPaise: order.totalPaise,
      }).ok,
      tracking: {
        steps: trackingTimeline(order.status, events),
        courier: record.shipment?.courier ?? null,
        trackingNo: record.shipment?.trackingNo ?? null,
      },
      deliveredAt: deliveredAt ?? null,
      refunds: record.refunds.map((f) => ({
        amountPaise: f.amountPaise,
        status: f.status,
        reason: f.reason,
        at: f.createdAt.getTime(),
      })),
      demoNextStep:
        deps.demoMode && deps.courier.available ? nextDemoStep(order.status, events) : null,
    };
  }

  async function view(customerId: CustomerId, orderId: string): Promise<OrderView> {
    const record = await deps.findOrder(customerId, orderId);
    if (!record) throw orderMissing();
    return toView(record);
  }

  /**
   * A gateway success (D-59, D-212), settled in one transaction: within a running hold the order
   * is confirmed; otherwise the items are reserved again if free, else the payment is refunded.
   */
  async function paymentSucceeded(customerId: CustomerId, orderId: string, attemptId: string) {
    const record = await deps.findOrder(customerId, orderId);
    if (!record) return;
    const lanes = await deps.listLanes();
    const pincode = (record.order.address as AddressSnapshot).pincode;
    const order = warehousesBySpeed(pincode, lanes).map((w) => w.warehouseId);
    const paidAt = deps.now();
    const outcome = await deps.settlePayment(customerId, {
      orderId,
      attemptId,
      warehouses: new Map(record.items.map(({ item }) => [item.id, order])),
      decide: (facts) =>
        resolvePaidOrder({ ...facts, paidAt }).outcome === 'refund' ? 'refund' : 'confirm',
      at: paidAt,
    });
    if (outcome === 'confirmed' || outcome === 'confirmedLate')
      return afterConfirmed(customerId, orderId);
    if (outcome === 'refundedCancelled') {
      try {
        await notify(
          customerId,
          'order_refunded',
          `Order ${record.order.number} refunded`,
          `Your payment arrived after you cancelled the order, so we refunded the full ${formatInr(record.order.totalPaise)} automatically.`,
        );
      } catch (error) {
        deps.log.warn({ orderId, error: String(error) }, 'refund message failed');
      }
    }
    if (outcome === 'refunded') {
      try {
        await notify(
          customerId,
          'order_refunded',
          `Order ${record.order.number} refunded`,
          orderNoticeText('REFUNDED_AFTER_EXPIRY', record.order.totalPaise),
        );
      } catch (error) {
        deps.log.warn({ orderId, error: String(error) }, 'refund message failed');
      }
    }
  }

  return {
    /** `GET /me/checkout`: the cart at an address (the default when none is given) (D-55, D-201). */
    async checkout(customerId: CustomerId, query: CheckoutQuery): Promise<CheckoutView> {
      const address = await addressFor(customerId, query.addressId);
      if (query.addressId && !address)
        throw notFound('ADDRESS_NOT_FOUND', "We couldn't find that address.");
      const { cart, result } = await quote(customerId, address, query);
      return {
        cart: cart.view,
        addressId: address?.id ?? null,
        methods: result.methods,
        banks: result.banks,
        emiPlans: result.emiPlans,
        paymentOffers: result.paymentOffers,
        totals: result.totals,
        paymentOfferReason: result.paymentOfferReason,
        blocks: result.blocks,
        canPlace: result.canPlace,
      };
    },

    /**
     * Places the order (D-201–D-205). Everything is rechecked against the cart now; a different
     * total than the customer saw refuses it with the new total. The same key returns the same order.
     */
    async place(
      customerId: CustomerId,
      key: string,
      request: PlaceOrderRequest,
    ): Promise<OrderView> {
      const existing = await deps.findOrderIdByKey(customerId, key);
      if (existing) return view(customerId, existing);

      const address = await addressFor(customerId, request.addressId);
      if (!address) throw notFound('ADDRESS_NOT_FOUND', "We couldn't find that address.");
      const choice = {
        method: request.payment.method,
        ...(request.payment.bank ? { bank: request.payment.bank } : {}),
        ...(request.payment.tenureMonths ? { tenureMonths: request.payment.tenureMonths } : {}),
        ...(request.paymentOfferId ? { paymentOfferId: request.paymentOfferId } : {}),
      };
      const { cart, result } = await quote(customerId, address, choice);
      const block = result.blocks.find((b) => BLOCK_ERRORS[b]);
      if (block) {
        const [status, code, message] = BLOCK_ERRORS[block]!;
        throw new AppError(status, code, result.paymentOfferReason ?? message, {
          blocks: result.blocks,
        });
      }
      if (!result.canPlace)
        throw new AppError(422, 'CHECKOUT_BLOCKED', "This order can't be placed yet.", {
          blocks: result.blocks,
        });
      if (result.totals.totalPaise !== request.expectedTotalPaise)
        throw new AppError(409, 'PRICE_CHANGED', 'Prices or offers changed. Check the new total.', {
          totalPaise: result.totals.totalPaise,
        });
      const prepaid = request.payment.method !== 'cod';
      if (prepaid && !deps.gateway.available)
        throw new AppError(503, 'PAYMENT_UNAVAILABLE', "Online payment isn't available right now.");

      const now = deps.now();
      // Flash sales: one per customer, no disposable emails (D-142, D-143).
      const sales = cart.entries.flatMap((e) =>
        e.facts.kind === 'item' ? (liveFlashSale(e.facts, now) ?? []) : [],
      );
      if (sales.length) {
        const [email, domains, bought] = await Promise.all([
          deps.findCustomerEmail(customerId),
          deps.loadDisposableDomains(),
          deps.countFlashPurchases(
            customerId,
            sales.map((s) => s.id),
          ),
        ]);
        for (const sale of sales) {
          const check = canBuyFlash({
            sale,
            now,
            qty: 1,
            alreadyBought: bought.get(sale.id) ?? 0,
            email: email ?? '',
            disposableDomains: domains,
          });
          if (!check.ok)
            throw new AppError(409, `FLASH_${check.reason}`, FLASH_BLOCKS[check.reason]!);
        }
      }

      const lines = orderLines({ entries: cart.entries, order: result.order, now });
      const [facts, lanes] = await Promise.all([
        deps.loadOrderFacts(lines.map((l) => l.sku)),
        deps.listLanes(),
      ]);
      const bySku = new Map(facts.map((f) => [f.sku, f]));
      const warehouses = warehousesBySpeed(address.pincode, lanes).map((w) => w.warehouseId);
      const preorderKeys = new Set(cart.view.lines.filter((l) => l.isPreorder).map((l) => l.key));
      const eta = combineDeliveries(cart.view.lines.map((l) => l.delivery!));
      const hold = prepaid
        ? { kind: 'hold' as const, expiresAt: new Date(startHold(now).expiresAt) }
        : { kind: 'allocate' as const };

      const placed = await deps.placeOrder(customerId, {
        idempotencyKey: key,
        number: orderNumber,
        address: snapshot(address),
        subtotalPaise: result.order.subtotalPaise,
        couponDiscountPaise: result.order.coupon?.discountPaise ?? 0,
        paymentDiscountPaise: result.order.paymentOffer?.discountPaise ?? 0,
        totalPaise: result.order.totalPaise,
        couponOfferId: result.order.coupon?.id ?? null,
        paymentOfferId: result.order.paymentOffer?.id ?? null,
        paymentMethod: request.payment.method,
        paymentBank: request.payment.method === 'cod' ? null : (request.payment.bank ?? null),
        emiTenureMonths:
          request.payment.method === 'emi' ? (request.payment.tenureMonths ?? null) : null,
        isPreorder: preorderKeys.size > 0,
        etaFrom: eta.status === 'deliverable' ? eta.from : null,
        etaTo: eta.status === 'deliverable' ? eta.to : null,
        hold,
        now: new Date(now),
        items: lines.map((l) => {
          const f = bySku.get(l.sku)!;
          return {
            sku: l.sku,
            variantId: f.variantId,
            productName: f.productName,
            returnPolicy: f.returnPolicy,
            qty: l.qty,
            mrpPaise: f.mrpPaise,
            unitPricePaise: l.unitPricePaise,
            discountPaise: l.discountPaise,
            hsnCode: f.hsnCode,
            gstRateBps: f.gstRateBps,
            bundleSlug: l.bundleKey ? l.bundleKey.slice('bundle:'.length) : null,
            flashSaleId: l.flashSaleId,
            isPreorder: preorderKeys.has(l.key),
            warehouses,
            returnWindowEndsAt: null,
          };
        }),
      });
      if (placed.status === 'conflict')
        throw new AppError(409, placed.code, CONFLICTS[placed.code]!);
      if (placed.status === 'existing') return view(customerId, placed.orderId);

      if (placed.attemptId && hold.kind === 'hold') {
        // The order stands: its hold must end even if the gateway call fails (D-206).
        await deps.jobs.holdExpiry(
          { customerId, orderId: placed.orderId },
          hold.expiresAt.getTime(),
        );
        try {
          await openSession(customerId, placed.orderId, placed.attemptId);
        } catch (error) {
          deps.log.warn(
            { orderId: placed.orderId, error: String(error) },
            'gateway session failed',
          );
        }
      } else {
        await afterConfirmed(customerId, placed.orderId);
      }
      return view(customerId, placed.orderId);
    },

    /** `GET /me/orders/:id`. A hold that ran out ends here if its job hasn't run (D-57). */
    async get(customerId: CustomerId, orderId: string): Promise<OrderView> {
      await expireIfDue(customerId, orderId);
      return view(customerId, orderId);
    },

    /** Another try within the same hold, which never gets longer (D-56, D-204). */
    async retryPayment(customerId: CustomerId, orderId: string): Promise<OrderView> {
      await expireIfDue(customerId, orderId);
      if (!(await deps.findOrder(customerId, orderId))) throw orderMissing();
      const attemptId = await deps.startAttempt(customerId, orderId, deps.now());
      if (attemptId) await openSession(customerId, orderId, attemptId);
      return view(customerId, orderId);
    },

    paymentSucceeded,

    /** The job at the end of a hold (D-57). */
    expire: (customerId: CustomerId, orderId: string) => expireIfDue(customerId, orderId),

    /** Demo only: what the customer does on the mock gateway page (D-213). */
    async mockPay(
      customerId: CustomerId,
      orderId: string,
      attemptId: string,
      request: MockPaymentRequest,
    ): Promise<OrderView> {
      if (!deps.demoMode) throw notFound('NOT_FOUND', 'Not found');
      await expireIfDue(customerId, orderId);
      const record = await deps.findOrder(customerId, orderId);
      const attempt = record?.attempts.find((a) => a.id === attemptId);
      if (!record || !attempt)
        throw notFound('PAYMENT_NOT_FOUND', "We couldn't find that payment.");
      if (attempt.status !== 'started')
        throw new AppError(409, 'PAYMENT_CLOSED', 'This payment has already ended.');
      if (request.result === 'success') await paymentSucceeded(customerId, orderId, attemptId);
      else if (request.result === 'failure') await deps.failAttempt(customerId, orderId, attemptId);
      else
        await deps.jobs.latePayment(
          { customerId, orderId, attemptId },
          attempt.expiresAt.getTime() + LATE_PAYMENT_DELAY_MS,
        );
      return view(customerId, orderId);
    },

    /** `GET /me/orders`: newest first (keyset pages). */
    async list(
      customerId: CustomerId,
      query: { cursor?: string | undefined; limit: number },
    ): Promise<OrderPage> {
      const after = query.cursor ? readOrderCursor(query.cursor) : undefined;
      if (query.cursor && !after)
        throw new AppError(400, 'INVALID_CURSOR', 'That page link is no longer valid.');
      const { rows, hasMore } = await deps.listOrders(customerId, {
        limit: query.limit,
        ...(after ? { after } : {}),
      });
      const images = await deps.loadImages([
        ...new Set(rows.flatMap((r) => r.items.slice(0, 3).map((i) => i.productId))),
      ]);
      const last = rows.at(-1);
      return {
        items: rows.map(({ order, itemCount, items }) => ({
          id: order.id,
          number: order.number,
          status: order.status,
          placedAt: order.placedAt.getTime(),
          totalPaise: order.totalPaise,
          itemCount,
          items: items.slice(0, 3).map((i) => ({
            name: i.name,
            image: images.get(i.productId)?.[0] ?? null,
          })),
          eta: order.etaFrom && order.etaTo ? { from: order.etaFrom, to: order.etaTo } : null,
          deliveredAt: order.deliveredAt?.getTime() ?? null,
        })),
        nextCursor: hasMore && last ? orderCursor(last.order.placedAt, last.order.id) : null,
      };
    },

    /**
     * Cancels the order before it ships (D-149, D-216): reservations go back, a paid order is
     * refunded in full (mock refund in demo) and the customer is told on the page and in the inbox.
     */
    async cancel(customerId: CustomerId, orderId: string): Promise<OrderView> {
      await expireIfDue(customerId, orderId);
      const record = await deps.findOrder(customerId, orderId);
      if (!record) throw orderMissing();
      const done = await deps.cancelOrder(customerId, orderId, cancelOutcome, deps.now());
      if (!done)
        throw new AppError(
          409,
          'CANNOT_CANCEL',
          'This order can no longer be cancelled. Once it has shipped you can ask for a return after delivery.',
        );
      try {
        await notify(
          customerId,
          'order_cancelled',
          `Order ${record.order.number} cancelled`,
          cancelText(done.refundPaise, record.order.paymentMethod !== 'cod'),
        );
      } catch (error) {
        deps.log.warn({ orderId, error: String(error) }, 'cancel message failed');
      }
      return view(customerId, orderId);
    },

    /**
     * Demo courier (D-215): moves the order one tracking step, as a courier feed would. Shipping
     * books the consignment; shipping and delivery are also sent to the inbox.
     */
    async demoAdvance(customerId: CustomerId, orderId: string): Promise<OrderView> {
      if (!deps.demoMode || !deps.courier.available) throw notFound('NOT_FOUND', 'Not found');
      const record = await deps.findOrder(customerId, orderId);
      if (!record) throw orderMissing();
      const { order } = record;
      const step = nextDemoStep(order.status, eventsOf(record));
      if (!step)
        throw new AppError(409, 'NOTHING_TO_ADVANCE', 'This order has no next delivery step.');
      const at = deps.now();
      const moved = await deps.advanceOrder(customerId, {
        orderId,
        from: order.status,
        step,
        status: statusAfterStep(step, order.status),
        at,
        courier: deps.courier.book({ orderId, orderNumber: order.number }),
        returnWindowEndsAt: returnWindowEndsAt(at),
      });
      if (moved && (step === 'shipped' || step === 'delivered')) {
        try {
          await notify(
            customerId,
            step === 'shipped' ? 'order_shipped' : 'order_delivered',
            `Order ${order.number}: ${TRACKING_LABELS[step].toLowerCase()}`,
            step === 'shipped'
              ? 'Your order is on its way. Track it in your account.'
              : 'Your order was delivered. Returns and replacements are open for 7 days, and you can review what you bought in your account.',
          );
        } catch (error) {
          deps.log.warn({ orderId, error: String(error) }, 'tracking message failed');
        }
      }
      return view(customerId, orderId);
    },

    /** The GST invoice as a PDF, rendered from the order's snapshots (D-102, D-173, D-210). */
    async invoicePdf(customerId: CustomerId, orderId: string) {
      const record = await deps.findOrder(customerId, orderId);
      if (!record) throw orderMissing();
      const inv = record.invoice;
      if (!inv) throw notFound('INVOICE_NOT_FOUND', 'This order has no invoice yet.');
      const { order } = record;
      const shipped = record.items.find((i) => i.warehouseName);
      const doc: InvoiceDocument = {
        number: inv.number,
        issuedAt: inv.issuedAt.getTime(),
        orderNumber: order.number,
        placedAt: order.placedAt.getTime(),
        supplier: {
          name: 'Borneo',
          warehouse: [
            ...new Set(
              record.items.flatMap((i) =>
                i.warehouseName ? [`${i.warehouseName}, ${i.warehouseState}`] : [],
              ),
            ),
          ].join('; '),
          state: inv.supplierState,
          gstin: shipped?.warehouseGstin ?? null,
        },
        buyer: order.address as AddressSnapshot,
        placeOfSupply: inv.placeOfSupply,
        lines: record.items.map(({ item, warehouseState }) => ({
          // Each line is taxed by where it ships from (D-209).
          intraState: isIntraState(warehouseState ?? inv.supplierState, inv.placeOfSupply),
          name: item.productName,
          sku: item.sku,
          hsnCode: item.hsnCode,
          qty: item.qty,
          unitPricePaise: item.unitPricePaise,
          discountPaise: item.discountPaise,
          gstRateBps: item.gstRateBps,
        })),
        paymentMethod:
          METHOD_NAMES[order.paymentMethod] + (order.paymentBank ? ` (${order.paymentBank})` : ''),
        demo: deps.demoMode,
        cancelled: order.status === 'cancelled' || order.status === 'refunded',
      };
      return { filename: `${inv.number}.pdf`, pdf: deps.renderInvoice(doc) };
    },
  };
}

export type OrdersService = ReturnType<typeof createOrdersService>;
