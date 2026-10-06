import { isValidPincode } from '@borneo/shared';
import { useState } from 'react';
import { mapTiles } from '@/shared/lib/mapTiles';
import { DeliveryChecker } from '@/shared/ui/commerce/DeliveryChecker';
import { useDeliveryForm } from '../hooks/useDeliveryForm';
import { useDeliveryQuery } from '../hooks/useDeliveryQuery';
import { deliveryViewFor } from '../mappers/toDeliveryView';
import { MapPinDialog } from './MapPinDialog';

/** PDP delivery estimate for the selected variant (D-50–55); rechecks when the variant changes. */
export function ProductDelivery({ sku }: { sku: string }) {
  const form = useDeliveryForm();
  const query = useDeliveryQuery(sku, form.pincode);
  const [mapOpen, setMapOpen] = useState(false);
  const view = deliveryViewFor({
    pincode: form.pincode,
    validPincode: form.pincode !== null && isValidPincode(form.pincode),
    data: query.data,
    isError: query.isError,
  });

  return (
    <>
      <DeliveryChecker
        pincode={form.input}
        checkedPincode={form.pincode ?? ''}
        onPincodeChange={form.setInput}
        onCheck={() => {
          // Same pincode after a failure: the query key is unchanged, so ask again.
          if (form.submit() && query.isError) void query.refetch();
        }}
        state={view.state}
        {...(view.place ? { place: view.place } : {})}
        {...(mapTiles ? { onChooseOnMap: () => setMapOpen(true) } : {})}
      />
      {mapTiles ? (
        <MapPinDialog
          tiles={mapTiles}
          open={mapOpen}
          onOpenChange={setMapOpen}
          onPick={(pinned) => form.submit(pinned.pincode)}
        />
      ) : null}
    </>
  );
}
