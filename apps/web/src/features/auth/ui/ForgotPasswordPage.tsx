import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { passwordResetRequestSchema, PASSWORD_MIN, RESET_CODE_TTL_SECONDS } from '@borneo/shared';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/base/button';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { PasswordField } from '@/shared/ui/forms/PasswordField';
import { TextField } from '@/shared/ui/forms/TextField';
import { usePasswordResetForm } from '../hooks/usePasswordResetForm';
import { useRequestResetMutation } from '../hooks/useRequestResetMutation';
import { useResetPasswordMutation } from '../hooks/useResetPasswordMutation';
import type { DemoEmail } from '../model';
import { AuthCard } from './AuthCard';
import { DemoEmailBox } from './DemoEmailBox';

type Props = { email?: string; redirect?: string; onReset: (email: string) => void };

/** Two steps: ask for a code, then set a new password with it (D-92, D-95, D-98). */
export function ForgotPasswordPage({ email = '', redirect, onReset }: Props) {
  const [sentTo, setSentTo] = useState<{ email: string; demo: DemoEmail | null } | null>(null);
  return sentTo ? (
    <ResetStep
      email={sentTo.email}
      demo={sentTo.demo}
      onSent={setSentTo}
      onReset={() => onReset(sentTo.email)}
      onChangeEmail={() => setSentTo(null)}
    />
  ) : (
    <RequestStep email={email} redirect={redirect} onSent={setSentTo} />
  );
}

function RequestStep({
  email,
  redirect,
  onSent,
}: {
  email: string;
  redirect: string | undefined;
  onSent: (sent: { email: string; demo: DemoEmail | null }) => void;
}) {
  const form = useForm({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: { email },
  });
  const request = useRequestResetMutation();
  const submit = form.handleSubmit(({ email: to }) =>
    request.mutate(to, { onSuccess: (demo) => onSent({ email: to, demo }) }),
  );
  return (
    <AuthCard
      title="Reset your password"
      intro="Enter your email and we’ll send you a 6-digit code."
      footer={
        <Link
          to="/sign-in"
          search={redirect ? { redirect } : {}}
          className="text-brand hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {request.isError ? <FormAlert>{errorMessage(request.error)}</FormAlert> : null}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Button type="submit" size="lg" className="w-full" loading={request.isPending}>
          Send code
        </Button>
      </form>
    </AuthCard>
  );
}

function ResetStep({
  email,
  demo,
  onSent,
  onReset,
  onChangeEmail,
}: {
  email: string;
  demo: DemoEmail | null;
  onSent: (sent: { email: string; demo: DemoEmail | null }) => void;
  onReset: () => void;
  onChangeEmail: () => void;
}) {
  const form = usePasswordResetForm(email);
  const reset = useResetPasswordMutation();
  const resend = useRequestResetMutation();
  const { errors } = form.formState;
  const submit = form.handleSubmit((values) => reset.mutate(values, { onSuccess: onReset }));
  const minutes = RESET_CODE_TTL_SECONDS / 60;

  return (
    <AuthCard
      title="Check your email"
      intro={
        <>
          If an account uses <strong className="font-semibold text-ink">{email}</strong>, we’ve sent
          it a 6-digit code. It works for {minutes} minutes.
        </>
      }
      footer={
        <Button type="button" variant="link" className="h-11" onClick={onChangeEmail}>
          Use a different email
        </Button>
      }
    >
      {demo ? (
        <DemoEmailBox
          email={demo}
          onUseCode={(code) => form.setValue('code', code, { shouldValidate: true })}
        />
      ) : null}
      <form onSubmit={submit} noValidate className="space-y-5">
        {reset.isError ? <FormAlert>{errorMessage(reset.error)}</FormAlert> : null}
        <TextField
          label="Code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          className="[&_input]:tracking-[0.3em] [&_input]:tabular-nums"
          error={errors.code?.message}
          {...form.register('code')}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN} characters. You’ll be signed out on every device.`}
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>
          Set new password
        </Button>
      </form>
      <div className="border-t border-line pt-4 text-center text-sm">
        {resend.isSuccess ? (
          <p role="status" className="mb-2 text-ink-muted">
            We’ve sent a new code.
          </p>
        ) : null}
        {resend.isError ? (
          <p role="alert" className="mb-2 text-danger">
            {errorMessage(resend.error)}
          </p>
        ) : null}
        <Button
          type="button"
          variant="link"
          className="h-11"
          loading={resend.isPending}
          onClick={() =>
            resend.mutate(email, {
              onSuccess: (next) => {
                form.setValue('code', '');
                onSent({ email, demo: next });
              },
            })
          }
        >
          Send a new code
        </Button>
      </div>
    </AuthCard>
  );
}
