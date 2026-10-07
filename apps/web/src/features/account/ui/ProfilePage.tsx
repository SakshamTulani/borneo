import { useState } from 'react';
import { CheckCircle2Icon } from 'lucide-react';
import { useSessionQuery } from '@/features/auth';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/base/button';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { PasswordField } from '@/shared/ui/forms/PasswordField';
import { TextField } from '@/shared/ui/forms/TextField';
import { useChangePasswordMutation } from '../hooks/useChangePasswordMutation';
import { usePasswordForm } from '../hooks/usePasswordForm';
import { useProfileForm } from '../hooks/useProfileForm';
import { useUpdateProfileMutation } from '../hooks/useUpdateProfileMutation';

const card = 'space-y-4 rounded-xl border border-line bg-surface p-5';

function Saved({ children }: { children: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-success">
      <CheckCircle2Icon className="size-4" aria-hidden />
      {children}
    </p>
  );
}

function DetailsForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const form = useProfileForm({ name, phone });
  const save = useUpdateProfileMutation();
  const submit = form.handleSubmit((values) => save.mutate(values));
  const { errors } = form.formState;
  return (
    <form onSubmit={(e) => void submit(e)} className={card} noValidate aria-labelledby="details-h">
      <h3 id="details-h" className="font-semibold">
        Your details
      </h3>
      <TextField
        label="Full name"
        autoComplete="name"
        error={errors.name?.message}
        {...form.register('name')}
      />
      <TextField
        label="Mobile number"
        type="tel"
        autoComplete="tel-national"
        hint="10 digits. Couriers call this number."
        error={errors.phone?.message}
        {...form.register('phone')}
      />
      <TextField
        label="Email"
        value={email}
        readOnly
        hint="You sign in with your email, so it can't be changed."
      />
      {save.isError ? <FormAlert>{errorMessage(save.error)}</FormAlert> : null}
      {save.isSuccess && !form.formState.isDirty ? <Saved>Saved</Saved> : null}
      <Button type="submit" loading={save.isPending}>
        Save details
      </Button>
    </form>
  );
}

function PasswordForm() {
  const form = usePasswordForm();
  const change = useChangePasswordMutation();
  const [done, setDone] = useState(false);
  const submit = form.handleSubmit((values) =>
    change.mutate(values, {
      onSuccess: () => {
        setDone(true);
        form.reset();
      },
    }),
  );
  const { errors } = form.formState;
  return (
    <form onSubmit={(e) => void submit(e)} className={card} noValidate aria-labelledby="password-h">
      <h3 id="password-h" className="font-semibold">
        Password
      </h3>
      <PasswordField
        label="Current password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...form.register('currentPassword')}
      />
      <PasswordField
        label="New password"
        autoComplete="new-password"
        hint="8 to 128 characters. Other devices will be signed out."
        error={errors.newPassword?.message}
        {...form.register('newPassword')}
      />
      {change.isError ? <FormAlert>{errorMessage(change.error)}</FormAlert> : null}
      {done && !change.isPending ? (
        <Saved>Password changed. Other devices are signed out.</Saved>
      ) : null}
      <Button type="submit" loading={change.isPending} onClick={() => setDone(false)}>
        Change password
      </Button>
    </form>
  );
}

/** Profile and security (D-223): name and mobile, and the password. */
export function ProfilePage() {
  const { data: customer } = useSessionQuery();
  if (!customer) return null;
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <DetailsForm
        key={`${customer.name}|${customer.phone}`}
        name={customer.name}
        phone={customer.phone ?? ''}
        email={customer.email}
      />
      <PasswordForm />
    </div>
  );
}
