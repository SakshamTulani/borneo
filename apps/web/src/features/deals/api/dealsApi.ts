import { dealsViewSchema, type DealsView } from '@borneo/shared';
import { getJson } from '../../../shared/lib/http';

export const getDeals = (): Promise<DealsView> => getJson('/deals', dealsViewSchema);
