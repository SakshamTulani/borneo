import { searchResultSchema, type SearchResult } from '@borneo/shared';
import { getJson } from '../../../shared/lib/http';

export async function getSearch(q: string, limit: number, cursor?: string): Promise<SearchResult> {
  const params = new URLSearchParams({ q, limit: String(limit), ...(cursor ? { cursor } : {}) });
  return getJson(`/search?${params.toString()}`, searchResultSchema);
}
