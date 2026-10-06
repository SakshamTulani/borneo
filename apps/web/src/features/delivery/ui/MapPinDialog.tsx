import { useState } from 'react';
import { LocateFixedIcon, MapPinIcon } from 'lucide-react';
import { Button } from '@/shared/ui/base/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/base/dialog';
import { usePinLookupMutation } from '../hooks/usePinLookupMutation';
import type { PinnedPincode } from '../model';
import { LeafletMap, type MapCentre } from './LeafletMap';
import type { MapTiles } from '@/shared/lib/mapTiles';

/** All of India in view until the customer moves the map. */
const INDIA = { lat: 22.5, lng: 79, zoom: 5 };
const STREET_ZOOM = 15;

type Props = {
  tiles: MapTiles;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (pinned: PinnedPincode) => void;
};

/** Pick the delivery pincode by placing a pin (D-52, D-184). The field stays the main path. */
export function MapPinDialog({ tiles, open, onOpenChange, onPick }: Props) {
  const [centre, setCentre] = useState<MapCentre | null>(null);
  const [focus, setFocus] = useState<(MapCentre & { zoom: number }) | undefined>();
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);
  const lookup = usePinLookupMutation();

  const close = (next: boolean) => {
    if (!next) {
      lookup.reset();
      setLocateFailed(false);
      setFocus(undefined);
      setCentre(null);
    }
    onOpenChange(next);
  };

  const locate = () => {
    setLocating(true);
    setLocateFailed(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setFocus({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: STREET_ZOOM });
      },
      () => {
        setLocating(false);
        setLocateFailed(true);
      },
      { timeout: 10_000 },
    );
  };

  const confirm = () => {
    if (!centre) return;
    lookup.mutate(centre, {
      onSuccess: (pinned) => {
        if (!pinned) return;
        onPick(pinned);
        close(false);
      },
    });
  };

  const notFound = lookup.isSuccess && lookup.data === null;
  const canLocate = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle>Choose delivery location</DialogTitle>
        <DialogDescription>
          Move the map until the pin sits on your address. You can also type the pincode instead.
        </DialogDescription>
        <div className="relative h-72 sm:h-96">
          {open ? (
            <LeafletMap
              tiles={tiles}
              initial={INDIA}
              focus={focus}
              onCentreChange={(c) => {
                setCentre(c);
                if (!lookup.isIdle) lookup.reset();
              }}
              label="Map. Arrow keys move the map under the pin; plus and minus zoom."
            />
          ) : null}
          <MapPinIcon
            className="pointer-events-none absolute top-1/2 left-1/2 z-[500] size-9 -translate-x-1/2 -translate-y-full fill-brand text-surface"
            aria-hidden
          />
        </div>
        <div aria-live="polite" className="min-h-5 text-sm">
          {notFound ? (
            <p className="text-danger">
              We don’t have a pincode for this spot. Move the pin closer to a town, or type the
              pincode.
            </p>
          ) : null}
          {lookup.isError ? (
            <p className="text-danger">Couldn’t look up this spot. Try again.</p>
          ) : null}
          {locateFailed ? (
            <p className="text-danger">Couldn’t get your location. Move the map instead.</p>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {canLocate ? (
            <Button type="button" variant="ghost" onClick={locate} loading={locating}>
              <LocateFixedIcon aria-hidden />
              Use my location
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={confirm} loading={lookup.isPending} disabled={!centre}>
            Use this location
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
