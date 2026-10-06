import { DemoBox } from '@/shared/ui/feedback/DemoBox';
import { Container } from '@/shared/ui/layout/Container';
import { BaseSection } from './BaseSection';
import { CommerceSection } from './CommerceSection';
import { TokensSection } from './TokensSection';

/** Internal design reference (docs/DESIGN.md). noindex; static demo props only. */
export function DesignSystemPage() {
  return (
    <Container className="space-y-14 py-10">
      <header className="space-y-3">
        <h1 className="text-title">Design system</h1>
        <p className="max-w-2xl text-ink-muted">
          Clear, confident, warm. Quiet surfaces, one green accent, pill actions, and the product
          does the talking. One system across value, upper-mid and premium.
        </p>
        <DemoBox title="Demo data">
          Every product, price, offer and date on this page is a static example for design review.
          Nothing here is real or computed.
        </DemoBox>
      </header>
      <TokensSection />
      <BaseSection />
      <CommerceSection />
    </Container>
  );
}
