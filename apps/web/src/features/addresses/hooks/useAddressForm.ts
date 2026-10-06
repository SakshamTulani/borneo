import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { addressInputSchema, type AddressFields } from '@borneo/shared';
import type { AddressFormValues } from '../model';

/** The address form, validated with the API's own schema (D-53, D-189). */
export function useAddressForm(defaultValues: AddressFormValues) {
  return useForm<AddressFormValues, unknown, AddressFields>({
    // The pin starts unset; the schema reports it as "Place the pin on the map".
    resolver: zodResolver(addressInputSchema) as never,
    defaultValues,
  });
}
