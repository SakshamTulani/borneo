import { materializeRelations, type RelationEdge, type RelationOverride } from '@borneo/shared';
import type { RelationInputs } from './relations.repository';

export type RelationsDeps = {
  loadInputs: () => Promise<RelationInputs>;
  replaceRelations: (edges: RelationEdge[]) => Promise<void>;
};

export function createRelationsService(deps: RelationsDeps) {
  return {
    /**
     * Rebuilds `relation` from rules, product lines and overrides (D-21). Overrides that add and
     * remove the same edge are returned as conflicts; the remove wins (D-27).
     */
    async materialize(): Promise<{ edges: number; conflicts: RelationOverride[] }> {
      const { edges, conflicts } = materializeRelations(await deps.loadInputs());
      await deps.replaceRelations(edges);
      return { edges: edges.length, conflicts };
    },
  };
}

export type RelationsService = ReturnType<typeof createRelationsService>;
