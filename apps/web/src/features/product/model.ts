import type { ProductDetail, ProductVariant } from '@borneo/shared';
import type { VariantOption } from '@/shared/ui/commerce/VariantSelector';

export type { ProductDetail, ProductVariant };

/** One option dimension (e.g. colour) with the current choice. */
export type OptionGroup = { key: string; legend: string; value: string; options: VariantOption[] };

export type OfferCardView = {
  id: string;
  kind: 'bank' | 'coupon' | 'noCostEmi';
  title: string;
  description: string;
  code?: string;
  status: 'available' | 'notApplicable';
  reason?: string;
};
