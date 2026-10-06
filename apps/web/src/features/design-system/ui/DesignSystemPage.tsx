import { DemoBox } from '@/shared/ui/feedback/DemoBox';
import { BaseSection } from './BaseSection';
import { CommerceSection } from './CommerceSection';
import { TokensSection } from './TokensSection';

/** Internal design reference (docs/DESIGN.md). noindex; static demo props only. */
export function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 py-8">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold">Design system</h1>
        <p className="max-w-2xl text-ink-muted">
          Clear, confident, warm. One system across value, upper-mid and premium.
        </p>
        <DemoBox title="Demo data">
          Every product, price, offer and date on this page is a static example for design review.
          Nothing here is real or computed.
        </DemoBox>
      </header>
      <TokensSection />
      <BaseSection />
      <CommerceSection />
    </div>
  );
}
