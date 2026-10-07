import { useQuery } from '@tanstack/react-query';
import { summaryQuery } from '../repository/accountRepository';

export function useAccountSummaryQuery() {
  return useQuery(summaryQuery);
}
