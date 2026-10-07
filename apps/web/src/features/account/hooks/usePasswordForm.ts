import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { passwordChangeInputSchema, type PasswordChangeInput } from '@borneo/shared';

export function usePasswordForm() {
  return useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeInputSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });
}
