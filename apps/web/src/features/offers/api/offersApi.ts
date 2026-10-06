import { offerStripSchema, type OfferStrip } from '@borneo/shared';
import { getJson } from '../../../shared/lib/http';

export const getLiveOffers = (): Promise<OfferStrip> => getJson('/offers/live', offerStripSchema);
