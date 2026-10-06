import type { HealthResponse } from './health.schema';

export type HealthDeps = { demoMode: boolean; pingDatabase: () => Promise<boolean> };

export function createHealthService(deps: HealthDeps) {
  return {
    async getHealth(): Promise<HealthResponse> {
      const up = await deps.pingDatabase();
      return { status: 'ok', demoMode: deps.demoMode, database: up ? 'up' : 'down' };
    },
  };
}

export type HealthService = ReturnType<typeof createHealthService>;
