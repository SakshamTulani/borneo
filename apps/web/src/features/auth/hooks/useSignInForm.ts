import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { signInInputSchema } from '@borneo/shared';

export function useSignInForm(email = '') {
  return useForm({
    resolver: zodResolver(signInInputSchema),
    defaultValues: { email, password: '' },
  });
}
