import { describe, expect, it } from 'vitest';
import { checkBoundaryAnchors } from './boundaryAnchors.ts';

describe('checkBoundaryAnchors', () => {
  it('reports anchors that match no file', () => {
    const anchors = [
      { name: 'web feature hooks', pattern: '^apps/web/src/features/[^/]+/hooks/' },
      { name: 'web feature ui', pattern: '^apps/web/src/features/[^/]+/ui/' },
    ];
    expect(checkBoundaryAnchors(anchors, ['apps/web/src/features/a/ui/A.tsx'])).toEqual([
      'boundary "web feature hooks" (^apps/web/src/features/[^/]+/hooks/) matches no file',
    ]);
  });

  it('reports files outside known slice layers', () => {
    expect(
      checkBoundaryAnchors(
        [],
        [
          'apps/web/src/features/a/utils/x.ts',
          'apps/api/src/modules/m/helpers.ts',
          'apps/web/src/features/a/model.test.ts',
        ],
      ),
    ).toEqual([
      'apps/web/src/features/a/utils/x.ts: not in a known feature layer (api, mappers, repository, hooks, ui, model.ts, index.ts)',
      'apps/api/src/modules/m/helpers.ts: module files must be *.route|service|repository|schema.ts or index.ts',
    ]);
  });
});
