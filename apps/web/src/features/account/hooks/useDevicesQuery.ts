import { useQuery } from '@tanstack/react-query';
import { devicesQuery } from '../repository/accountRepository';

export function useDevicesQuery() {
  return useQuery(devicesQuery);
}
