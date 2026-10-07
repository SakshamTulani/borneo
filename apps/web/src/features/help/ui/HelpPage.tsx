import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  CreditCardIcon,
  PackageXIcon,
  RotateCcwIcon,
  TruckIcon,
  UserRoundIcon,
} from 'lucide-react';
import {
  HOLD_DURATION_MS,
  policySummary,
  RETURN_PHOTO_MAX,
  RETURN_WINDOW_DAYS,
} from '@borneo/shared';
import { Container } from '@/shared/ui/layout/Container';

const holdMinutes = HOLD_DURATION_MS / 60_000;
const linkClass = 'text-brand hover:underline';

function Topic({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-32 rounded-xl bg-surface p-6">
      <h2
        id={`${id}-h`}
        className="mb-4 flex items-center gap-3 font-heading text-tagline font-semibold"
      >
        <span
          aria-hidden
          className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand"
        >
          {icon}
        </span>
        {title}
      </h2>
      <div className="space-y-4 text-[15px] [&_dt]:font-semibold [&_dd]:text-ink-muted">
        {children}
      </div>
    </section>
  );
}

/**
 * Help (D-224): answers written from the rules the store runs on (return policy, window, hold,
 * cancelling), so the page and the checkout never disagree.
 */
export function HelpPage() {
  return (
    <Container className="max-w-3xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="font-heading text-headline font-semibold tracking-tight">Help</h1>
        <p className="text-ink-muted">
          How delivery, payment, cancelling and returns work at Borneo.
        </p>
      </div>
      <nav aria-label="Help topics">
        <ul className="flex flex-wrap gap-2">
          {(
            [
              ['delivery', 'Delivery'],
              ['payments', 'Payments'],
              ['cancelling', 'Cancelling'],
              ['returns', 'Returns'],
              ['account', 'Account'],
            ] as const
          ).map(([hash, label]) => (
            <li key={hash}>
              <Link
                to="/help"
                hash={hash}
                className="inline-flex min-h-11 items-center rounded-full bg-surface px-4 text-[15px] outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Topic id="delivery" icon={<TruckIcon className="size-5" />} title="Delivery and tracking">
        <dl className="space-y-4">
          <div>
            <dt>What does delivery cost?</dt>
            <dd>Nothing. Delivery is free on every order.</dd>
          </div>
          <div>
            <dt>When will it arrive?</dt>
            <dd>
              Each product page shows an estimated date range for your pincode, worked out from the
              warehouse that has it in stock. It’s an estimate, not a promise; checkout shows it
              again for your address.
            </dd>
          </div>
          <div>
            <dt>How do I track my order?</dt>
            <dd>
              Open it in{' '}
              <Link to="/account/orders" className={linkClass}>
                your orders
              </Link>
              . You’ll see each step with its time, and the courier and tracking number once it
              ships. The courier texts you on the way.
            </dd>
          </div>
          <div>
            <dt>Can I open the box before accepting it?</dt>
            <dd>
              No, we don’t offer open-box delivery. If something is wrong, ask for a return or
              replacement after delivery.
            </dd>
          </div>
        </dl>
      </Topic>

      <Topic
        id="payments"
        icon={<CreditCardIcon className="size-5" />}
        title="Payments, EMI and offers"
      >
        <dl className="space-y-4">
          <div>
            <dt>How can I pay?</dt>
            <dd>
              UPI, cards, EMI, or cash on delivery where your pincode allows it. Cash on delivery
              isn’t available for pre-orders or flash sales.
            </dd>
          </div>
          <div>
            <dt>Why is there a {holdMinutes}-minute timer?</dt>
            <dd>
              When you start paying online, we hold your items for {holdMinutes} minutes so nobody
              else can buy them. If payment doesn’t finish in time, the items go back to stock and
              nothing is charged.
            </dd>
          </div>
          <div>
            <dt>How do offers combine?</dt>
            <dd>
              One coupon and one payment offer per order. No-cost EMI counts as the payment offer.
              Flash-sale and bundle prices can take a payment offer but not a coupon. We never apply
              an offer for you: you choose it.
            </dd>
          </div>
          <div>
            <dt>Do I get a GST invoice?</dt>
            <dd>Yes. Download it from the order in your account.</dd>
          </div>
        </dl>
      </Topic>

      <Topic id="cancelling" icon={<PackageXIcon className="size-5" />} title="Cancelling an order">
        <dl className="space-y-4">
          <div>
            <dt>Until when can I cancel?</dt>
            <dd>
              Until the order ships. Open it in your account and choose Cancel order. The whole
              order is cancelled.
            </dd>
          </div>
          <div>
            <dt>What happens to my money?</dt>
            <dd>
              If you paid online, the full amount goes back to your original payment method. If you
              chose cash on delivery, nothing is due.
            </dd>
          </div>
          <div>
            <dt>It has already shipped</dt>
            <dd>Then it can’t be cancelled, but you can ask for a return after delivery.</dd>
          </div>
        </dl>
      </Topic>

      <Topic
        id="returns"
        icon={<RotateCcwIcon className="size-5" />}
        title="Returns and replacements"
      >
        <dl className="space-y-4">
          <div>
            <dt>Audio, wearables, accessories, smart home and robot vacuums</dt>
            <dd>{policySummary('return')}</dd>
          </div>
          <div>
            <dt>Phones and TVs</dt>
            <dd>{policySummary('replacementOnly')}</dd>
          </div>
          <div>
            <dt>How long do I have?</dt>
            <dd>
              Until the end of the {RETURN_WINDOW_DAYS}th day after delivery (India time). Each
              product page and order shows its own policy.
            </dd>
          </div>
          <div>
            <dt>How do I ask?</dt>
            <dd>
              Open the order in your account and choose Return or replace on the item. For a defect
              or damage, add 1 to {RETURN_PHOTO_MAX} photos (JPEG, PNG or WebP, up to 2 MB each).
              Follow it in{' '}
              <Link to="/account/returns" className={linkClass}>
                your returns
              </Link>
              .
            </dd>
          </div>
          <div>
            <dt>When do I get my money back?</dt>
            <dd>
              Once we’ve received a returned item, what you paid for it (after any discount) goes
              back to your original payment method. For cash-on-delivery orders our team contacts
              you about the refund.
            </dd>
          </div>
        </dl>
      </Topic>

      <Topic id="account" icon={<UserRoundIcon className="size-5" />} title="Your account">
        <dl className="space-y-4">
          <div>
            <dt>Do I need an account to buy?</dt>
            <dd>Yes. You can create one inside checkout with your email and a password.</dd>
          </div>
          <div>
            <dt>What are “My devices”?</dt>
            <dd>
              Products you bought from us, once they’re delivered, with accessories that fit them.
              We never ask you to list devices yourself.
            </dd>
          </div>
          <div>
            <dt>What is the watch list?</dt>
            <dd>
              Choose Watch on an out-of-stock product and it stays in your watch list with its
              current stock. We don’t send emails or messages about it.
            </dd>
          </div>
          <div>
            <dt>I forgot my password</dt>
            <dd>
              <Link to="/forgot-password" className={linkClass}>
                Reset it here
              </Link>
              . You can change your name, mobile and password in{' '}
              <Link to="/account/profile" className={linkClass}>
                Profile and security
              </Link>
              .
            </dd>
          </div>
        </dl>
      </Topic>
    </Container>
  );
}
