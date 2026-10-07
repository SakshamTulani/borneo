import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { MapPinnedIcon, PlusIcon } from 'lucide-react';
import { canAddAddress, MAX_ADDRESSES } from '@borneo/shared';
import { Badge } from '@/shared/ui/base/badge';
import { Button } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import type { AddressCard } from '../model';

type Props =
  | { status: 'loading' }
  | { status: 'error'; onRetry: () => void }
  | {
      status: 'ready';
      addresses: AddressCard[];
      onMakeDefault: (id: string) => void;
      onDelete: (id: string) => void;
      /** The address being changed, so its buttons show progress. */
      busyId?: string | undefined;
      /** A failed delete or default change. */
      problem?: string | undefined;
    };

const addLink =
  'inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-[15px] text-brand-ink outline-none hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

/** The address book (D-188): default first, each with its exact pin saved (D-53). */
export function AddressBook(props: Props) {
  if (props.status === 'loading') {
    return (
      <div
        className="grid gap-4 sm:grid-cols-2"
        role="status"
        aria-busy="true"
        aria-label="Loading addresses"
      >
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }
  if (props.status === 'error') {
    return (
      <ErrorState
        title="Couldn’t load your addresses"
        body="Please try again."
        onRetry={props.onRetry}
      />
    );
  }
  if (props.addresses.length === 0) {
    return (
      <EmptyState
        icon={<MapPinnedIcon className="size-8" aria-hidden />}
        title="No saved addresses"
        body="Save an address with its map pin to check delivery and check out faster."
        action={
          <Link to="/account/addresses/new" className={addLink}>
            <PlusIcon className="size-4" aria-hidden />
            Add an address
          </Link>
        }
      />
    );
  }
  const full = !canAddAddress(props.addresses.length);
  return (
    <div className="space-y-4">
      {props.problem ? <FormAlert>{props.problem}</FormAlert> : null}
      <ul className="grid gap-4 sm:grid-cols-2">
        {props.addresses.map((a) => (
          <AddressItem
            key={a.id}
            address={a}
            busy={props.busyId === a.id}
            onMakeDefault={() => props.onMakeDefault(a.id)}
            onDelete={() => props.onDelete(a.id)}
          />
        ))}
      </ul>
      {full ? (
        <p className="text-sm text-ink-muted">
          You’ve saved {MAX_ADDRESSES} addresses, the most we keep. Delete one to add another.
        </p>
      ) : (
        <Link to="/account/addresses/new" className={addLink}>
          <PlusIcon className="size-4" aria-hidden />
          Add an address
        </Link>
      )}
    </div>
  );
}

function AddressItem({
  address,
  busy,
  onMakeDefault,
  onDelete,
}: {
  address: AddressCard;
  busy: boolean;
  onMakeDefault: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const headingId = `address-${address.id}`;
  return (
    <li
      className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5"
      aria-labelledby={headingId}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 id={headingId} className="font-semibold">
          {address.name}
        </h3>
        {address.isDefault ? <Badge variant="brand">Default</Badge> : null}
      </div>
      <address className="text-[15px] text-ink-muted not-italic">
        {address.lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
        <span className="mt-1 block tabular-nums">{address.phone}</span>
      </address>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1" aria-live="polite">
        {confirming ? (
          <>
            <span className="text-sm">Delete this address?</span>
            <Button variant="destructive" onClick={onDelete} loading={busy}>
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </>
        ) : (
          <>
            <Link
              to="/account/addresses/$id"
              params={{ id: address.id }}
              aria-label={`Edit ${address.lines[0]}`}
              className="inline-flex min-h-11 items-center text-[15px] text-brand hover:underline"
            >
              Edit
            </Link>
            {address.isDefault ? null : (
              <Button variant="link" className="h-11 px-0" onClick={onMakeDefault} loading={busy}>
                Make default
              </Button>
            )}
            <Button
              variant="link"
              className="h-11 px-0 text-danger"
              aria-label={`Delete ${address.lines[0]}`}
              onClick={() => setConfirming(true)}
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
