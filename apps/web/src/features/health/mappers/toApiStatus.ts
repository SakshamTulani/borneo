import type { HealthDto } from '../api/getHealth';
import type { ApiStatus } from '../model';

export function toApiStatus(dto: HealthDto): ApiStatus {
  return { reachable: true, demoMode: dto.demoMode, databaseUp: dto.database === 'up' };
}
