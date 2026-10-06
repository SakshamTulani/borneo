import { isDefaultOnAdd } from '@borneo/shared';
import { useSessionQuery } from '@/features/auth';
import { mapTiles } from '@/shared/lib/mapTiles';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { useAddressesQuery } from '../hooks/useAddressesQuery';
import { useSaveAddressMutation } from '../hooks/useSaveAddressMutation';
import { toFormValues } from '../mappers/toAddressCard';
import { AddressForm, type DefaultChoice } from './AddressForm';

/** Add (no `id`) or edit an address; `onSaved` returns to the book. */
export function AddressFormPage({ id, onSaved }: { id?: string; onSaved: () => void }) {
  const session = useSessionQuery();
  const addresses = useAddressesQuery();
  const save = useSaveAddressMutation();

  if (addresses.isPending)
    return <Skeleton className="h-[36rem] rounded-xl" aria-label="Loading" />;
  if (addresses.isError) {
    return (
      <ErrorState title="Couldn’t load your addresses" onRetry={() => void addresses.refetch()} />
    );
  }
  const existing = id ? addresses.data.find((a) => a.id === id) : undefined;
  if (id && !existing) {
    return <EmptyState title="Address not found" body="It may have been deleted." />;
  }
  // D-188: a new address that will be the default whatever the customer picks is "first".
  const defaultChoice: DefaultChoice = existing
    ? existing.isDefault
      ? 'current'
      : 'choose'
    : isDefaultOnAdd(addresses.data.length, false)
      ? 'first'
      : 'choose';

  return (
    <AddressForm
      key={existing?.id ?? 'new'}
      initial={toFormValues(existing, session.data ?? null)}
      defaultChoice={defaultChoice}
      tiles={mapTiles}
      submitLabel={existing ? 'Save changes' : 'Save address'}
      saving={save.isPending}
      error={save.error}
      onSubmit={(input) => save.mutate({ ...(id ? { id } : {}), input }, { onSuccess: onSaved })}
    />
  );
}
