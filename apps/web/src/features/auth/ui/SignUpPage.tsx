import { Link } from '@tanstack/react-router';
import { PASSWORD_MIN } from '@borneo/shared';
import { errorCode, errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/base/button';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { PasswordField } from '@/shared/ui/forms/PasswordField';
import { TextField } from '@/shared/ui/forms/TextField';
import { useSignUpForm } from '../hooks/useSignUpForm';
import { useSignUpMutation } from '../hooks/useSignUpMutation';
import { AuthCard } from './AuthCard';

type Props = { redirect?: string; onSignedUp: () => void };

/** Name, email, mobile and password; signs in straight away (D-91, D-93). */
export function SignUpPage({ redirect, onSignedUp }: Props) {
  const form = useSignUpForm();
  const signUp = useSignUpMutation();
  const { errors } = form.formState;
  const submit = form.handleSubmit((values) => signUp.mutate(values, { onSuccess: onSignedUp }));
  const taken = errorCode(signUp.error) === 'EMAIL_TAKEN';

  return (
    <AuthCard
      title="Create your account"
      intro="One account for orders, returns and your Borneo devices."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/sign-in"
            search={redirect ? { redirect } : {}}
            className="text-brand hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        {signUp.isError ? (
          <FormAlert>
            {errorMessage(signUp.error)}
            {taken ? (
              <>
                {' '}
                <Link
                  to="/sign-in"
                  search={{
                    email: signUp.variables?.email ?? '',
                    ...(redirect ? { redirect } : {}),
                  }}
                  className="font-semibold underline"
                >
                  Sign in
                </Link>
              </>
            ) : null}
          </FormAlert>
        ) : null}
        <TextField
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...form.register('name')}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          hint="You sign in with this."
          error={errors.email?.message}
          {...form.register('email')}
        />
        <TextField
          label="Mobile number"
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          hint="For delivery updates from the courier."
          error={errors.phone?.message}
          {...form.register('phone')}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN} characters.`}
          error={errors.password?.message}
          {...form.register('password')}
        />
        <Button type="submit" size="lg" className="w-full" loading={signUp.isPending}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
