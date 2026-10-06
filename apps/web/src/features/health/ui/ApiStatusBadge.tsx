import type { ApiStatus } from '../model';

type Props = { status: ApiStatus | undefined; isError: boolean };

export function ApiStatusBadge({ status, isError }: Props) {
  const label = isError
    ? 'API unreachable'
    : !status
      ? 'Checking API…'
      : `API up · database ${status.databaseUp ? 'up' : 'down'}${status.demoMode ? ' · demo mode' : ''}`;
  const tone = isError ? 'text-danger' : status ? 'text-success' : 'text-ink-muted';
  return (
    <p role="status" className={`text-sm ${tone}`}>
      {label}
    </p>
  );
}
