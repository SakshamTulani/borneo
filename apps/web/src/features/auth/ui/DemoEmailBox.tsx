import { Button } from '@/shared/ui/base/button';
import { DemoBox } from '@/shared/ui/feedback/DemoBox';
import type { DemoEmail } from '../model';

/** What the reset email would say, shown on screen in demo mode only (D-95). */
export function DemoEmailBox({
  email,
  onUseCode,
}: {
  email: DemoEmail;
  onUseCode?: (code: string) => void;
}) {
  return (
    <DemoBox>
      <dl className="space-y-1">
        <div className="flex gap-2">
          <dt className="text-ink-muted">To</dt>
          <dd>{email.to}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-muted">Subject</dt>
          <dd>{email.subject}</dd>
        </div>
      </dl>
      <p className="mt-3 whitespace-pre-line">{email.body}</p>
      {email.code ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-2xl tracking-[0.3em] tabular-nums">{email.code}</span>
          {onUseCode ? (
            <Button type="button" variant="outline" onClick={() => onUseCode(email.code!)}>
              Use this code
            </Button>
          ) : null}
        </div>
      ) : null}
    </DemoBox>
  );
}
