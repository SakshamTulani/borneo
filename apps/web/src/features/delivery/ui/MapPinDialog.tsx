import type { MapTiles } from '@/shared/lib/mapTiles';
import { PinPickerDialog } from '@/shared/ui/map/PinPickerDialog';
import { usePinLookupMutation } from '../hooks/usePinLookupMutation';
import type { PinnedPincode } from '../model';

type Props = {
  tiles: MapTiles;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (pinned: PinnedPincode) => void;
};

/** Pick the delivery pincode by placing a pin (D-52, D-184). The field stays the main path. */
export function MapPinDialog({ tiles, open, onOpenChange, onPick }: Props) {
  const lookup = usePinLookupMutation();

  const close = (next: boolean) => {
    if (!next) lookup.reset();
    onOpenChange(next);
  };

  const notFound = lookup.isSuccess && lookup.data === null;

  return (
    <PinPickerDialog
      tiles={tiles}
      open={open}
      onOpenChange={close}
      title="Choose delivery location"
      description="Move the map until the pin sits on your address. You can also type the pincode instead."
      confirmLabel="Use this location"
      confirming={lookup.isPending}
      onMove={() => {
        if (!lookup.isIdle) lookup.reset();
      }}
      onConfirm={(centre) =>
        lookup.mutate(centre, {
          onSuccess: (pinned) => {
            if (!pinned) return;
            onPick(pinned);
            close(false);
          },
        })
      }
      message={
        notFound ? (
          <p className="text-danger">
            We don’t have a pincode for this spot. Move the pin closer to a town, or type the
            pincode.
          </p>
        ) : lookup.isError ? (
          <p className="text-danger">Couldn’t look up this spot. Try again.</p>
        ) : null
      }
    />
  );
}
