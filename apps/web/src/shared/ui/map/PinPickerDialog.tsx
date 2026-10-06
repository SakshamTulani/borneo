import { useState, type ReactNode } from 'react';
import { LocateFixedIcon, MapPinIcon } from 'lucide-react';
import type { MapTiles } from '@/shared/lib/mapTiles';
import { Button } from '@/shared/ui/base/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/base/dialog';
import { LeafletMap, type MapCentre, type MapView } from './LeafletMap';

/** All of India in view until the customer moves the map. */
export const INDIA_VIEW: MapView = { lat: 22.5, lng: 79, zoom: 5 };
export const STREET_ZOOM = 15;

type Props = {
  tiles: MapTiles;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Where the map opens. */
  initial?: MapView;
  confirmLabel: string;
  /** The pin's position when the customer confirms. */
  onConfirm: (centre: MapCentre) => void;
  /** After every move, e.g. to clear an earlier lookup result. */
  onMove?: () => void;
  confirming?: boolean;
  /** A result or problem to announce under the map. */
  message?: ReactNode;
};

/**
 * A fixed pin over a movable map (D-52, D-53). The map is keyboard-operable (arrow keys pan, +/−
 * zoom) and "Use my location" centres it. Leaflet loads only when the dialog opens.
 */
export function PinPickerDialog({
  tiles,
  open,
  onOpenChange,
  title,
  description,
  initial = INDIA_VIEW,
  confirmLabel,
  onConfirm,
  onMove,
  confirming = false,
  message,
}: Props) {
  const [centre, setCentre] = useState<MapCentre | null>(null);
  const [focus, setFocus] = useState<MapView | undefined>();
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);

  const close = (next: boolean) => {
    if (!next) {
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

  const canLocate = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="relative h-72 sm:h-96">
          {open ? (
            <LeafletMap
              tiles={tiles}
              initial={initial}
              focus={focus}
              onCentreChange={(c) => {
                setCentre(c);
                onMove?.();
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
          {message}
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
          <Button
            type="button"
            onClick={() => centre && onConfirm(centre)}
            loading={confirming}
            disabled={!centre}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
