import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { profileInputSchema, type ProfileInput } from '@borneo/shared';

/** Name and mobile, validated with the API's schema (D-99, D-223). */
export function useProfileForm(defaultValues: { name: string; phone: string }) {
  return useForm<{ name: string; phone: string }, unknown, ProfileInput>({
    resolver: zodResolver(profileInputSchema) as never,
    defaultValues,
  });
}
