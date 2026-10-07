import { useForm } from 'react-hook-form';
import type { ReturnFormValues } from '../model';

/** The request's kind, reason and details; the dialog checks photos against the reason (D-88). */
export function useReturnForm(defaultValues: ReturnFormValues) {
  return useForm<ReturnFormValues>({ defaultValues });
}
