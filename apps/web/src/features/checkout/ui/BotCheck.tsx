import { BotOffIcon, CheckIcon } from 'lucide-react';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/base/button';
import { DemoBox } from '@/shared/ui/feedback/DemoBox';
import { useBotCheckMutation } from '../hooks/useBotCheckMutation';

/**
 * Flash checkout's bot check (D-143, D-232). In the demo a mock check stands in for the provider's
 * challenge; its token goes with the order. Without one, flash orders can't be placed (D-144).
 */
export function BotCheck({
  token,
  onToken,
}: {
  token: string | null;
  onToken: (t: string) => void;
}) {
  const check = useBotCheckMutation();
  if (token)
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-success">
        <CheckIcon className="size-4" aria-hidden />
        Bot check passed
      </p>
    );
  return (
    <DemoBox title="Demo mode: mock bot check for flash sales">
      <p className="mb-3">Flash sale checkout asks you to prove you're a person.</p>
      <Button
        variant="secondary"
        loading={check.isPending}
        onClick={() => check.mutate(undefined, { onSuccess: (r) => onToken(r.token) })}
      >
        <BotOffIcon aria-hidden />
        I'm not a robot
      </Button>
      {check.isError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {(check.error as { status?: number }).status === 404
            ? "Flash sale checkout isn't available right now."
            : errorMessage(check.error)}
        </p>
      ) : null}
    </DemoBox>
  );
}
