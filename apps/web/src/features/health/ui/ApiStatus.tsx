import { useApiStatusQuery } from '../hooks/useApiStatusQuery';
import { ApiStatusBadge } from './ApiStatusBadge';

export function ApiStatus() {
  const query = useApiStatusQuery();
  return <ApiStatusBadge status={query.data} isError={query.isError} />;
}
