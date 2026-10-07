import { randomUUID } from 'node:crypto';
import {
  canRequestReturn,
  formatInr,
  linePaidPaise,
  nextDemoReturnStatus,
  photoProblem,
  photoType,
  RETURN_PHOTO_MAX,
  returnRefundPaise,
  type CustomerId,
  type NotificationKind,
  type ReturnRequestInput,
  type ReturnRequestView,
} from '@borneo/shared';
import type { NotificationAdapter } from '../../adapters/notifications/index';
import { readTimeCursor, timeCursor } from '../../cursor';
import { AppError, notFound } from '../../errors';
import type { NewReturnRequest, ReturnRecord } from './returns.repository';

type Target = {
  item: {
    id: string;
    productName: string;
    returnPolicy: 'return' | 'replacementOnly';
    unitPricePaise: number;
    qty: number;
    discountPaise: number;
  };
  orderNumber: string;
  status: string;
  deliveredAt: Date | null;
  paymentMethod: string;
  hasOpenRequest: boolean;
};

export type ReturnsDeps = {
  now: () => number;
  demoMode: boolean;
  findTarget: (
    customerId: CustomerId,
    orderId: string,
    orderItemId: string,
  ) => Promise<Target | undefined>;
  create: (customerId: CustomerId, input: NewReturnRequest) => Promise<string | null>;
  list: (
    customerId: CustomerId,
    page: { limit: number; after?: { at: Date; id: string } },
  ) => Promise<ReturnRecord[]>;
  find: (customerId: CustomerId, id: string) => Promise<ReturnRecord | undefined>;
  findPhoto: (
    customerId: CustomerId,
    returnId: string,
    photoId: string,
  ) => Promise<{ contentType: string; bytes: Buffer } | undefined>;
  advance: (
    customerId: CustomerId,
    input: {
      id: string;
      from: ReturnRecord['request']['status'];
      to: ReturnRecord['request']['status'];
      refundPaise: number;
      at: number;
    },
  ) => Promise<boolean>;
  findCustomerEmail: (customerId: CustomerId) => Promise<string | undefined>;
  notifications: NotificationAdapter;
  log: { warn(obj: object, msg: string): void };
};

const BLOCKS: Record<string, string> = {
  NOT_DELIVERED: 'Returns open once the order is delivered.',
  WINDOW_CLOSED: 'The 7-day window for this item has closed.',
  REPLACEMENT_ONLY: 'This item can be replaced if damaged or defective, but not returned.',
  REPLACEMENT_NEEDS_DEFECT: 'A replacement is for an item that arrived damaged or defective.',
};
const PHOTO_ERRORS: Record<string, string> = {
  PHOTOS_REQUIRED: 'Add at least one photo showing the defect or damage.',
  TOO_MANY_PHOTOS: `Add at most ${RETURN_PHOTO_MAX} photos.`,
  PHOTO_TOO_LARGE: 'Each photo must be 2 MB or smaller.',
  PHOTO_NOT_IMAGE: 'Photos must be JPEG, PNG or WebP images.',
};
const KIND = { return: 'Return', replacement: 'Replacement' } as const;
const STATUS_TEXT = {
  approved: 'was approved. Our courier will collect the item within 2 days.',
  completed: 'is complete.',
  rejected: 'was not approved.',
  requested: 'was received.',
} as const;

const decodePhoto = (value: string) =>
  new Uint8Array(Buffer.from(value.replace(/^data:[^,]*,/, ''), 'base64'));

/**
 * Return and replacement requests (D-86, D-88, D-217–D-219): checked against the line's policy
 * and window with the shared rules, photos checked by content, and in demo a support desk that
 * approves and completes, refunding returns on prepaid orders.
 */
export function createReturnsService(deps: ReturnsDeps) {
  const toView = (r: ReturnRecord): ReturnRequestView => ({
    id: r.request.id,
    orderId: r.orderId,
    orderNumber: r.orderNumber,
    orderItemId: r.request.orderItemId,
    productName: r.productName,
    kind: r.request.kind,
    reason: r.request.reason,
    details: r.request.details,
    photoCount: r.request.photoKeys.length,
    status: r.request.status,
    refundPaise: r.refundPaise,
    createdAt: r.request.createdAt.getTime(),
    updatedAt: r.request.updatedAt.getTime(),
    demoNextStatus: deps.demoMode ? nextDemoReturnStatus(r.request.status) : null,
  });

  async function notify(
    customerId: CustomerId,
    kind: NotificationKind,
    title: string,
    body: string,
  ) {
    try {
      const email = await deps.findCustomerEmail(customerId);
      if (email) await deps.notifications.send({ customerId, email, kind, title, body });
    } catch (error) {
      deps.log.warn({ customerId, kind, error: String(error) }, 'return message failed');
    }
  }

  async function view(customerId: CustomerId, id: string) {
    const record = await deps.find(customerId, id);
    if (!record) throw notFound('RETURN_NOT_FOUND', "We couldn't find that request.");
    return toView(record);
  }

  return {
    async request(
      customerId: CustomerId,
      orderId: string,
      orderItemId: string,
      input: ReturnRequestInput & { photos: string[] },
    ): Promise<ReturnRequestView> {
      const target = await deps.findTarget(customerId, orderId, orderItemId);
      if (!target) throw notFound('ORDER_ITEM_NOT_FOUND', "We couldn't find that item.");
      if (target.hasOpenRequest)
        throw new AppError(409, 'RETURN_ALREADY_REQUESTED', 'This item already has a request.');
      const check = canRequestReturn({
        policy: target.item.returnPolicy,
        now: deps.now(),
        kind: input.kind,
        reason: input.reason,
        ...(target.status === 'delivered' && target.deliveredAt
          ? { deliveredAt: target.deliveredAt.getTime() }
          : {}),
      });
      if (!check.ok) throw new AppError(422, check.reason, BLOCKS[check.reason]!);
      const photos = input.photos.map(decodePhoto);
      const problem = photoProblem(photos, check.photosRequired);
      if (problem) throw new AppError(422, problem, PHOTO_ERRORS[problem]!);
      const id = await deps.create(customerId, {
        orderItemId,
        kind: input.kind,
        reason: input.reason,
        details: input.details?.trim() || null,
        photos: photos.map((bytes) => ({
          id: randomUUID(),
          contentType: photoType(bytes)!,
          bytes: Buffer.from(bytes),
        })),
        now: new Date(deps.now()),
      });
      if (!id)
        throw new AppError(409, 'RETURN_ALREADY_REQUESTED', 'This item already has a request.');
      await notify(
        customerId,
        'return_requested',
        `${KIND[input.kind]} requested: ${target.item.productName}`,
        `We received your ${input.kind} request for ${target.item.productName} on order ${target.orderNumber}. We'll reply within 2 working days.`,
      );
      return view(customerId, id);
    },

    /** Newest first, a page at a time. */
    async list(
      customerId: CustomerId,
      query: { cursor?: string | undefined; limit: number },
    ): Promise<{ items: ReturnRequestView[]; nextCursor: string | null }> {
      const rows = await deps.list(customerId, {
        limit: query.limit,
        ...(query.cursor ? { after: readTimeCursor(query.cursor) } : {}),
      });
      const page = rows.slice(0, query.limit);
      const last = page.at(-1);
      return {
        items: page.map(toView),
        nextCursor:
          rows.length > query.limit && last
            ? timeCursor(last.request.createdAt, last.request.id)
            : null,
      };
    },

    async photo(customerId: CustomerId, returnId: string, photoId: string) {
      const photo = await deps.findPhoto(customerId, returnId, photoId);
      if (!photo) throw notFound('PHOTO_NOT_FOUND', "We couldn't find that photo.");
      return photo;
    },

    /** Demo support desk (D-219): approves, then completes; a completed return is refunded. */
    async demoAdvance(customerId: CustomerId, id: string): Promise<ReturnRequestView> {
      if (!deps.demoMode) throw notFound('NOT_FOUND', 'Not found');
      const record = await deps.find(customerId, id);
      if (!record) throw notFound('RETURN_NOT_FOUND', "We couldn't find that request.");
      const to = nextDemoReturnStatus(record.request.status);
      if (!to) throw new AppError(409, 'NOTHING_TO_ADVANCE', 'This request has finished.');
      const refundPaise =
        to === 'completed'
          ? returnRefundPaise({
              kind: record.request.kind,
              prepaid: record.paymentMethod !== 'cod',
              linePaidPaise: linePaidPaise(record.item),
            })
          : 0;
      const moved = await deps.advance(customerId, {
        id,
        from: record.request.status,
        to,
        refundPaise,
        at: deps.now(),
      });
      if (moved)
        await notify(
          customerId,
          'return_updated',
          `${KIND[record.request.kind]} ${to}: ${record.productName}`,
          `Your ${record.request.kind} request for ${record.productName} ${STATUS_TEXT[to]}` +
            (refundPaise > 0
              ? ` We refunded ${formatInr(refundPaise)} to your original payment method.`
              : to === 'completed' && record.request.kind === 'return'
                ? ' For cash-on-delivery orders our team will contact you about the refund.'
                : ''),
        );
      return view(customerId, id);
    },
  };
}

export type ReturnsService = ReturnType<typeof createReturnsService>;
