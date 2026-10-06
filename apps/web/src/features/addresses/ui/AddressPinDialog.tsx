import type { MapTiles } from '@/shared/lib/mapTiles';
import type { MapCentre, MapView } from '@/shared/ui/map/LeafletMap';
import { PinPickerDialog } from '@/shared/ui/map/PinPickerDialog';

type Props = {
  tiles: MapTiles;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: MapView;
  onPlace: (pin: MapCentre) => void;
};

/** Place the exact delivery pin for an address (D-53). */
export function AddressPinDialog({ tiles, open, onOpenChange, initial, onPlace }: Props) {
  return (
    <PinPickerDialog
      tiles={tiles}
      open={open}
      onOpenChange={onOpenChange}
      initial={initial}
      title="Place the pin on your door"
      description="Move the map until the pin sits exactly on the building. The courier uses it to find you."
      confirmLabel="Save pin"
      onConfirm={(pin) => {
        onPlace(pin);
        onOpenChange(false);
      }}
    />
  );
}
