import { queryOptions } from '@tanstack/react-query';
import { getHealth } from '../api/getHealth';
import { toApiStatus } from '../mappers/toApiStatus';
import type { ApiStatus } from '../model';

export async function fetchApiStatus(): Promise<ApiStatus> {
  return toApiStatus(await getHealth());
}

/** Shared by the hook and route loaders (SSR prefetch). */
export const apiStatusQuery = queryOptions({ queryKey: ['health'], queryFn: fetchApiStatus });
