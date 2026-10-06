import { Link } from '@tanstack/react-router';
import { CheckCircle2Icon } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/base/button';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { PasswordField } from '@/shared/ui/forms/PasswordField';
import { TextField } from '@/shared/ui/forms/TextField';
import { useSignInForm } from '../hooks/useSignInForm';
import { useSignInMutation } from '../hooks/useSignInMutation';
import { AuthCard } from './AuthCard';

type Props = {
  email?: string;
  /** Kept on the links to sign-up and reset, so the customer lands where they started. */
  redirect?: string;
  /** Just reset the password: say so above the form. */
  passwordReset?: boolean;
  onSignedIn: () => void;
};

/** Email + password sign-in (D-91). */
export function SignInPage({ email = '', redirect, passwordReset = false, onSignedIn }: Props) {
  const form = useSignInForm(email);
  const signIn = useSignInMutation();
  const { errors } = form.formState;
  const submit = form.handleSubmit((values) => signIn.mutate(values, { onSuccess: onSignedIn }));

  return (
    <AuthCard
      title="Sign in"
      intro="Track orders, save addresses and check out faster."
      footer={
        <>
          New to Borneo?{' '}
          <Link
            to="/sign-up"
            search={redirect ? { redirect } : {}}
            className="text-brand hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      {passwordReset ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md bg-success-soft px-4 py-3 text-sm text-success"
        >
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Password changed. Sign in with your new password.
        </p>
      ) : null}
      <form onSubmit={submit} noValidate className="space-y-5">
        {signIn.isError ? <FormAlert>{errorMessage(signIn.error)}</FormAlert> : null}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <div className="space-y-2">
          <PasswordField
            label="Password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...form.register('password')}
          />
          <Link
            to="/forgot-password"
            search={redirect ? { redirect } : {}}
            className="inline-flex min-h-11 items-center text-[15px] text-brand hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={signIn.isPending}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
}
