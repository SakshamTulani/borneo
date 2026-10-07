import { useForm } from 'react-hook-form';
import type { ReviewFormValues } from '../model';

/** Rating starts unset (nothing chosen for the customer, D-06). */
export function useReviewForm() {
  return useForm<ReviewFormValues>({ defaultValues: { rating: 0, title: '', body: '' } });
}
