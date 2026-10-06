import { useId, type FormEvent } from 'react';
import { AlertCircleIcon, BanIcon, MapPinIcon, PackageXIcon, TruckIcon } from 'lucide-react';
import { formatDateRange } from '@/shared/lib/format';
import { Button } from '@/shared/ui/base/button';
import { Input } from '@/shared/ui/base/input';
import { Label } from '@/shared/ui/base/label';

/** Result comes from the serviceability rule (D-50–55); this component only displays it. */
export type DeliveryState =
  | { status: 'idle' }
  | { status: 'checking' }
  | {
      status: 'deliverable';
      from: string;
      to: string;
      cod: boolean;
      /** Why COD is off, when it is (pre-order, flash sale, pincode). */
      codNote?: string;
    }
  | { status: 'notDeliverable' }
  | { status: 'outOfStockHere' }
  | { status: 'invalid'; message: string }
  | { status: 'error' };

type Props = {
  /** The field's text. */
  pincode: string;
  /** The pincode the result is for; defaults to the field. Results never quote a later edit. */
  checkedPincode?: string;
  onPincodeChange: (pincode: string) => void;
  onCheck: () => void;
  state: DeliveryState;
  /** Place name for the checked pincode, when known ("Bengaluru, Karnataka"). */
  place?: string;
  /** Offers picking the pincode from a map pin; the keyboard path is the field. */
  onChooseOnMap?: () => void;
};

export function DeliveryChecker({
  pincode,
  checkedPincode = pincode,
  onPincodeChange,
  onCheck,
  state,
  place,
  onChooseOnMap,
}: Props) {
  const inputId = useId();
  const errorId = useId();
  const invalid = state.status === 'invalid';
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onCheck();
  };
  return (
    <form onSubmit={submit} className="space-y-2">
      <Label htmlFor={inputId}>Delivery pincode</Label>
      <div className="flex gap-2">
        <Input
          id={inputId}
          inputMode="numeric"
          autoComplete="postal-code"
          value={pincode}
          onChange={(e) => onPincodeChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? errorId : undefined}
          className="max-w-40 tabular-nums"
        />
        <Button type="submit" variant="secondary" loading={state.status === 'checking'}>
          Check
        </Button>
      </div>
      {onChooseOnMap ? (
        <Button type="button" variant="link" className="h-11 px-0" onClick={onChooseOnMap}>
          <MapPinIcon className="size-4" aria-hidden />
          Choose on map
        </Button>
      ) : null}
      <div aria-live="polite" className="min-h-6 text-sm">
        {state.status === 'invalid' ? (
          <p id={errorId} className="flex items-center gap-2 text-danger">
            <AlertCircleIcon className="size-4" aria-hidden />
            {state.message}
          </p>
        ) : null}
        {place && state.status !== 'invalid' && state.status !== 'checking' ? (
          <p className="text-ink-muted">{place}</p>
        ) : null}
        {state.status === 'error' ? (
          <p className="flex items-center gap-2 text-danger">
            <AlertCircleIcon className="size-4" aria-hidden />
            Couldn’t check delivery. Try again.
          </p>
        ) : null}
        {state.status === 'deliverable' ? (
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-medium text-success">
              <TruckIcon className="size-4" aria-hidden />
              Estimated delivery {formatDateRange(state.from, state.to)}
            </p>
            <p className="text-ink-muted">
              {state.cod
                ? 'Cash on delivery available'
                : (state.codNote ?? 'Cash on delivery not available here')}
            </p>
          </div>
        ) : null}
        {state.status === 'notDeliverable' ? (
          <p className="flex items-center gap-2 font-medium text-danger">
            <BanIcon className="size-4" aria-hidden />
            Not deliverable to {checkedPincode} yet
          </p>
        ) : null}
        {state.status === 'outOfStockHere' ? (
          <p className="flex items-center gap-2 font-medium text-warning">
            <PackageXIcon className="size-4" aria-hidden />
            Out of stock for {checkedPincode}
          </p>
        ) : null}
      </div>
    </form>
  );
}
