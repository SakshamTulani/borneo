import { errorMessage } from '@/shared/lib/errors';
import { useAddressesQuery } from '../hooks/useAddressesQuery';
import { useDeleteAddressMutation } from '../hooks/useDeleteAddressMutation';
import { useSetDefaultAddressMutation } from '../hooks/useSetDefaultAddressMutation';
import { toAddressCard } from '../mappers/toAddressCard';
import { AddressBook } from './AddressBook';

export function AddressBookPage() {
  const addresses = useAddressesQuery();
  const remove = useDeleteAddressMutation();
  const makeDefault = useSetDefaultAddressMutation();

  if (addresses.isPending) return <AddressBook status="loading" />;
  if (addresses.isError)
    return <AddressBook status="error" onRetry={() => void addresses.refetch()} />;
  const failed = remove.error ?? makeDefault.error;
  return (
    <AddressBook
      status="ready"
      addresses={addresses.data.map(toAddressCard)}
      onMakeDefault={(id) => makeDefault.mutate(id)}
      onDelete={(id) => remove.mutate(id)}
      busyId={
        remove.isPending
          ? remove.variables
          : makeDefault.isPending
            ? makeDefault.variables
            : undefined
      }
      problem={failed ? errorMessage(failed) : undefined}
    />
  );
}
