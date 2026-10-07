import { finderViewSchema, type FinderView } from '@borneo/shared';
import { getJson } from '../../../shared/lib/http';

export const getFinder = (id: string, answers: Record<string, string>): Promise<FinderView> =>
  getJson(
    `/finder/${encodeURIComponent(id)}?${new URLSearchParams(answers).toString()}`,
    finderViewSchema,
  );
