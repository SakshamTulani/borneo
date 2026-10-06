import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { passwordResetInputSchema } from '@borneo/shared';

export function usePasswordResetForm(email: string) {
  return useForm({
    resolver: zodResolver(passwordResetInputSchema),
    defaultValues: { email, code: '', password: '' },
  });
}
