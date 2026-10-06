import { useQuery } from '@tanstack/react-query';
import { useSessionQuery } from '@/features/auth';
import { addressesQuery, defaultPincode } from '../repository/addressesRepository';

/** The default address's pincode when signed in (D-185); null otherwise. */
export function useDefaultPincodeQuery() {
  const session = useSessionQuery();
  return useQuery({ ...addressesQuery, enabled: !!session.data, select: defaultPincode });
}
