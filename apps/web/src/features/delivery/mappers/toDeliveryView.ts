import type { DeliveryCheck, PincodeArea } from '@borneo/shared';
import type { DeliveryView, PinnedPincode } from '../model';

type CodReason = Extract<
  DeliveryCheck['estimate'],
  { status: 'deliverable' }
>['cod']['reasons'][number];

/** The first reason a customer can act on or understand wins (D-71, D-146, D-70). */
const COD_NOTES: [CodReason, string][] = [
  ['PREORDER', 'Pre-orders are paid online; no cash on delivery'],
  ['FLASH_SALE', 'Flash sale price is paid online; no cash on delivery'],
  ['PINCODE', 'Cash on delivery not available here'],
];

const placeName = (p: { city: string; state: string }) => `${p.city}, ${p.state}`;

export function toDeliveryView(dto: DeliveryCheck): DeliveryView {
  const place = dto.place ? { place: placeName(dto.place) } : {};
  const e = dto.estimate;
  switch (e.status) {
    case 'invalidPincode':
      return { state: { status: 'invalid', message: 'Enter a 6-digit pincode' } };
    case 'notDeliverable':
    case 'outOfStockHere':
      return { state: { status: e.status }, ...place };
    case 'deliverable': {
      const note = COD_NOTES.find(([reason]) => e.cod.reasons.includes(reason))?.[1];
      return {
        state: {
          status: 'deliverable',
          from: e.from,
          to: e.to,
          cod: e.cod.allowed,
          ...(!e.cod.allowed && note ? { codNote: note } : {}),
        },
        ...place,
      };
    }
  }
}

export const toPinnedPincode = (area: PincodeArea): PinnedPincode => ({
  pincode: area.pincode,
  place: placeName(area),
});

/** The checker's state from the submitted pincode and the query (SSR renders `idle`). */
export function deliveryViewFor(input: {
  pincode: string | null;
  validPincode: boolean;
  data: DeliveryView | undefined;
  isError: boolean;
}): DeliveryView {
  if (input.pincode === null) return { state: { status: 'idle' } };
  if (!input.validPincode) {
    return { state: { status: 'invalid', message: 'Enter a 6-digit pincode' } };
  }
  if (input.isError) return { state: { status: 'error' } };
  return input.data ?? { state: { status: 'checking' } };
}
