import { compareViewSchema, type CompareView } from '@borneo/shared';
import { getJson } from '../../../shared/lib/http';

export const getCompare = (category: string, slugs: string[]): Promise<CompareView> =>
  getJson(
    `/compare?${new URLSearchParams({ category, p: slugs.join(',') }).toString()}`,
    compareViewSchema,
  );
