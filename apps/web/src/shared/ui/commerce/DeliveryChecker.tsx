import { useId, type FormEvent } from 'react';
import { AlertCircleIcon, BanIcon, PackageXIcon, TruckIcon } from 'lucide-react';
import { formatDateRange } from '@/shared/lib/format';
import { Button } from '@/shared/ui/base/button';
import { Input } from '@/shared/ui/base/input';
import { Label } from '@/shared/ui/base/label';

/** Result comes from the serviceability rule (D-50–55); this component only displays it. */
export type DeliveryState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'deliverable'; from: string; to: string; cod: boolean }
  | { status: 'notDeliverable' }
  | { status: 'outOfStockHere' }
  | { status: 'invalid'; message: string };

type Props = {
  pincode: string;
  onPincodeChange: (pincode: string) => void;
  onCheck: () => void;
  state: DeliveryState;
};

export function DeliveryChecker({ pincode, onPincodeChange, onCheck, state }: Props) {
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
          maxLength={6}
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
      <div aria-live="polite" className="min-h-6 text-sm">
        {state.status === 'invalid' ? (
          <p id={errorId} className="flex items-center gap-2 text-danger">
            <AlertCircleIcon className="size-4" aria-hidden />
            {state.message}
          </p>
        ) : null}
        {state.status === 'deliverable' ? (
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-medium text-success">
              <TruckIcon className="size-4" aria-hidden />
              Estimated delivery {formatDateRange(state.from, state.to)}
            </p>
            <p className="text-ink-muted">
              {state.cod ? 'Cash on delivery available' : 'Cash on delivery not available here'}
            </p>
          </div>
        ) : null}
        {state.status === 'notDeliverable' ? (
          <p className="flex items-center gap-2 font-medium text-danger">
            <BanIcon className="size-4" aria-hidden />
            Not deliverable to {pincode} yet
          </p>
        ) : null}
        {state.status === 'outOfStockHere' ? (
          <p className="flex items-center gap-2 font-medium text-warning">
            <PackageXIcon className="size-4" aria-hidden />
            Out of stock for {pincode}
          </p>
        ) : null}
      </div>
    </form>
  );
}
