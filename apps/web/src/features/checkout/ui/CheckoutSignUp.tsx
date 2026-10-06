import { Link } from '@tanstack/react-router';
import { PASSWORD_MIN } from '@borneo/shared';
import { AddressForm, toFormValues } from '@/features/addresses';
import { errorCode, errorMessage } from '@/shared/lib/errors';
import { mapTiles } from '@/shared/lib/mapTiles';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { PasswordField } from '@/shared/ui/forms/PasswordField';
import { TextField } from '@/shared/ui/forms/TextField';
import { useCheckoutAccountForm } from '../hooks/useCheckoutAccountForm';
import { useCheckoutSignUpMutation } from '../hooks/useCheckoutSignUpMutation';

/**
 * Buying needs an account (D-90), made right here (D-92): email and password, then the delivery
 * address, whose name and mobile go on the account. The cart in this browser comes along (D-192).
 */
export function CheckoutSignUp() {
  const account = useCheckoutAccountForm();
  const signUp = useCheckoutSignUpMutation();
  const { errors } = account.formState;
  const taken = errorCode(signUp.error) === 'EMAIL_TAKEN';

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-ink-muted">
        Already have an account?{' '}
        <Link
          to="/sign-in"
          search={{ redirect: '/checkout' }}
          className="font-semibold text-brand hover:underline"
        >
          Sign in to check out
        </Link>
      </p>

      <section aria-labelledby="checkout-account" className="space-y-5 rounded-xl bg-surface p-5">
        <div>
          <h2 id="checkout-account" className="text-lg font-semibold">
            Your account
          </h2>
          <p className="text-sm text-ink-muted">
            For your orders, invoices and returns. Your name and mobile come from the address below.
          </p>
        </div>
        {signUp.isError ? (
          <FormAlert>
            {errorMessage(signUp.error)}
            {taken ? (
              <>
                {' '}
                <Link
                  to="/sign-in"
                  search={{ email: signUp.variables?.account.email ?? '', redirect: '/checkout' }}
                  className="font-semibold underline"
                >
                  Sign in
                </Link>
              </>
            ) : null}
          </FormAlert>
        ) : null}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...account.register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint={`At least ${PASSWORD_MIN} characters.`}
          error={errors.password?.message}
          {...account.register('password')}
        />
      </section>

      <section
        aria-labelledby="checkout-new-address"
        className="space-y-5 rounded-xl bg-surface p-5"
      >
        <h2 id="checkout-new-address" className="text-lg font-semibold">
          Delivery address
        </h2>
        <AddressForm
          initial={toFormValues(undefined, null)}
          defaultChoice="first"
          tiles={mapTiles}
          submitLabel="Create account and continue"
          saving={signUp.isPending}
          error={null}
          onSubmit={(address) =>
            void account.handleSubmit((values) => signUp.mutate({ account: values, address }))()
          }
        />
      </section>
    </div>
  );
}
