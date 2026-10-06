import type { DeliveryState } from '@/shared/ui/commerce/DeliveryChecker';

/** What the PDP shows for a checked pincode (D-50–55). */
export type DeliveryView = { state: DeliveryState; place?: string };

/** A map pin resolved to a pincode (D-184). */
export type PinnedPincode = { pincode: string; place: string };
