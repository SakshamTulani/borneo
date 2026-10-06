import { useLiveOffersQuery } from '../hooks/useLiveOffersQuery';
import { OfferStripView } from './OfferStripView';

/** The strip stays out of the way: nothing while loading or if offers can't load. */
export function OfferStrip() {
  const { data } = useLiveOffersQuery();
  return data ? <OfferStripView offers={data} /> : null;
}
