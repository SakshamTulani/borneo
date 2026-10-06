import { useEffect, useState } from 'react';
import { CheckCircle2Icon, MapPinIcon } from 'lucide-react';
import { useWatch } from 'react-hook-form';
import { isValidPincode, type AddressFields } from '@borneo/shared';
import { errorCode, errorMessage } from '@/shared/lib/errors';
import type { MapTiles } from '@/shared/lib/mapTiles';
import { Button } from '@/shared/ui/base/button';
import { CheckboxField } from '@/shared/ui/forms/CheckboxField';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { TextField } from '@/shared/ui/forms/TextField';
import { INDIA_VIEW, STREET_ZOOM } from '@/shared/ui/map/PinPickerDialog';
import type { MapView } from '@/shared/ui/map/LeafletMap';
import { useAddressForm } from '../hooks/useAddressForm';
import { usePincodePlaceQuery } from '../hooks/usePincodePlaceQuery';
import { usePinPincodeMutation } from '../hooks/usePinPincodeMutation';
import type { AddressFormValues } from '../model';
import { AddressPinDialog } from './AddressPinDialog';

/** How the default choice is offered: the first address is always the default (D-188). */
export type DefaultChoice = 'first' | 'current' | 'choose';

type Props = {
  initial: AddressFormValues;
  defaultChoice: DefaultChoice;
  /** Null when no map provider is configured (D-187): the pincode's centre is used instead. */
  tiles: MapTiles | null;
  submitLabel: string;
  saving: boolean;
  /** The last failed save. */
  error: unknown;
  onSubmit: (values: AddressFields) => void;
};

const PIN_ZOOM = 17;

/** Address with its exact map pin (D-53). Pincode fills city and state when we know it. */
export function AddressForm({
  initial,
  defaultChoice,
  tiles,
  submitLabel,
  saving,
  error,
  onSubmit,
}: Props) {
  const form = useAddressForm(initial);
  const { errors } = form.formState;
  const [pincode, lat, lng, city, state] = useWatch({
    control: form.control,
    name: ['pincode', 'lat', 'lng', 'city', 'state'],
  });
  const place = usePincodePlaceQuery(pincode);
  const pinLookup = usePinPincodeMutation();
  const [mapOpen, setMapOpen] = useState(false);
  const pinned = lat !== undefined && lng !== undefined;
  const area = place.data ?? null;

  // A known pincode fills empty city and state; without a map its centre is the pin (D-187).
  useEffect(() => {
    if (!area) return;
    if (!city) form.setValue('city', area.city);
    if (!state) form.setValue('state', area.state);
    if (!tiles) {
      form.setValue('lat', area.lat);
      form.setValue('lng', area.lng);
    }
  }, [area, city, state, tiles, form]);

  // The API refuses a pin far from its pincode (D-189): show that at the pin.
  useEffect(() => {
    if (errorCode(error) === 'PIN_FAR_FROM_PINCODE') {
      form.setError('lat', { message: errorMessage(error) });
    }
  }, [error, form]);

  const placePin = (pin: { lat: number; lng: number }) => {
    form.setValue('lat', pin.lat);
    form.setValue('lng', pin.lng);
    form.clearErrors('lat');
    if (!isValidPincode(form.getValues('pincode'))) {
      pinLookup.mutate(pin, {
        onSuccess: (found) => {
          if (!found || isValidPincode(form.getValues('pincode'))) return;
          form.setValue('pincode', found.pincode, { shouldValidate: true });
        },
      });
    }
  };

  const mapStart: MapView = pinned
    ? { lat, lng, zoom: PIN_ZOOM }
    : area
      ? { lat: area.lat, lng: area.lng, zoom: STREET_ZOOM }
      : INDIA_VIEW;
  const formProblem =
    error && errorCode(error) !== 'PIN_FAR_FROM_PINCODE' ? errorMessage(error) : null;
  const pinError = errors.lat?.message ?? errors.lng?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formProblem ? <FormAlert>{formProblem}</FormAlert> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...form.register('name')}
        />
        <TextField
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          hint="The courier calls this number."
          error={errors.phone?.message}
          {...form.register('phone')}
        />
      </div>
      <TextField
        label="Pincode"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        className="max-w-48"
        hint={area ? `${area.city}, ${area.state}` : undefined}
        error={errors.pincode?.message}
        {...form.register('pincode', {
          onChange: (e: { target: { value: string } }) =>
            form.setValue('pincode', e.target.value.replace(/\D/g, '').slice(0, 6)),
        })}
      />
      <TextField
        label="House, flat and street"
        autoComplete="address-line1"
        error={errors.line1?.message}
        {...form.register('line1')}
      />
      <TextField
        label="Area or locality"
        aside="Optional"
        autoComplete="address-line2"
        error={errors.line2?.message}
        {...form.register('line2')}
      />
      <TextField
        label="Landmark"
        aside="Optional"
        error={errors.landmark?.message}
        {...form.register('landmark')}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="City"
          autoComplete="address-level2"
          error={errors.city?.message}
          {...form.register('city')}
        />
        <TextField
          label="State"
          autoComplete="address-level1"
          error={errors.state?.message}
          {...form.register('state')}
        />
      </div>

      <fieldset
        className="space-y-3 rounded-xl border border-line p-4"
        aria-describedby="pin-status"
      >
        <legend className="px-1 text-sm font-semibold">Map pin</legend>
        <p id="pin-status" aria-live="polite" className="flex items-start gap-2 text-[15px]">
          {pinned ? (
            <>
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <span>
                {tiles
                  ? 'Pin placed'
                  : 'Using the centre of your pincode (the map isn’t available)'}
                <span className="block text-sm text-ink-muted tabular-nums">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
              </span>
            </>
          ) : (
            <span className="text-ink-muted">
              {tiles
                ? 'Not placed yet. The courier uses the pin to find your door.'
                : 'The map isn’t available. Enter a pincode we know and we’ll use its centre.'}
            </span>
          )}
        </p>
        {pinError ? (
          <p role="alert" className="text-sm text-danger">
            {pinError}
          </p>
        ) : null}
        {tiles ? (
          <Button type="button" variant="outline" onClick={() => setMapOpen(true)}>
            <MapPinIcon aria-hidden />
            {pinned ? 'Move pin' : 'Place pin on map'}
          </Button>
        ) : null}
      </fieldset>

      {defaultChoice === 'choose' ? (
        <CheckboxField
          label="Make this my default address"
          hint="Used first at checkout and for delivery estimates."
          {...form.register('isDefault')}
        />
      ) : (
        <p className="text-sm text-ink-muted">
          {defaultChoice === 'first'
            ? 'This will be your default address.'
            : 'This is your default address.'}
        </p>
      )}

      <Button type="submit" size="lg" loading={saving}>
        {submitLabel}
      </Button>

      {tiles ? (
        <AddressPinDialog
          tiles={tiles}
          open={mapOpen}
          onOpenChange={setMapOpen}
          initial={mapStart}
          onPlace={placePin}
        />
      ) : null}
    </form>
  );
}
