import { queryOptions } from '@tanstack/react-query';
import { deleteWatch, getWatch, putWatch } from '../api/watchApi';

/** The customer's watch list (D-147, D-222). Under `['me']`. */
export const watchQuery = queryOptions({ queryKey: ['me', 'watch'], queryFn: getWatch });

export const startWatching = putWatch;
export const stopWatching = deleteWatch;
