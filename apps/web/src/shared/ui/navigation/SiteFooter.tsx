import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { BanknoteIcon, FileTextIcon, RotateCcwIcon, TruckIcon } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Container } from '../layout/Container';

const PROMISES = [
  { icon: TruckIcon, title: 'Free delivery', body: 'On every order, across India' },
  { icon: BanknoteIcon, title: 'Cash on delivery', body: 'Where your pincode allows it' },
  { icon: RotateCcwIcon, title: '7-day returns', body: 'Or a replacement if it’s faulty' },
  { icon: FileTextIcon, title: 'GST invoice', body: 'With every order, in your account' },
];

const HELP = [
  { hash: 'delivery', label: 'Delivery and tracking' },
  { hash: 'returns', label: 'Returns and replacements' },
  { hash: 'payments', label: 'Payments, EMI and offers' },
  { hash: 'cancelling', label: 'Cancelling an order' },
  { hash: 'account', label: 'Your account' },
] as const;

const ACCOUNT = [
  { to: '/account/orders', label: 'Orders' },
  { to: '/account/returns', label: 'Returns' },
  { to: '/account/devices', label: 'My devices' },
  { to: '/account/watch', label: 'Watch list' },
  { to: '/account/addresses', label: 'Addresses' },
] as const;

const PAYMENTS = ['UPI', 'Cards', 'EMI', 'Cash on delivery'];

const heading = 'mb-3 text-sm font-semibold text-ink';
const link =
  'inline-flex min-h-11 items-center rounded-sm text-sm text-ink-muted outline-none hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand';

/**
 * Site footer (D-224): the store's promises, links to shop, help and the account, how to pay,
 * and the demo note. `categories` comes from the catalog (D-10: none hardcoded).
 */
export function SiteFooter({ categories }: { categories?: ReactNode }) {
  return (
    <footer className="border-t border-line bg-surface pb-20 lg:pb-0">
      <Container>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-line py-8 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand"
              >
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-[15px] font-semibold">{title}</span>
                <span className="block text-sm text-ink-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-3">
            <Link to="/" aria-label="Borneo home" className="inline-flex rounded-sm">
              <Logo />
            </Link>
            <p className="max-w-xs text-sm text-ink-muted">
              Phones, audio, wearables, TVs and smart home, made by Borneo and sold only here.
              Delivered from our own warehouses across India.
            </p>
            <div>
              <ul className="flex flex-wrap gap-2" aria-label="Ways to pay">
                {PAYMENTS.map((p) => (
                  <li
                    key={p}
                    className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-muted"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop" className={heading}>
              Shop
            </h2>
            {categories}
          </nav>
          <nav aria-labelledby="footer-help">
            <h2 id="footer-help" className={heading}>
              Help
            </h2>
            <ul>
              {HELP.map((h) => (
                <li key={h.hash}>
                  <Link to="/help" hash={h.hash} className={link}>
                    {h.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-account">
            <h2 id="footer-account" className={heading}>
              Your account
            </h2>
            <ul>
              {ACCOUNT.map((a) => (
                <li key={a.to}>
                  <Link to={a.to} className={link}>
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-1 border-t border-line py-6 text-xs text-ink-muted sm:flex-row sm:justify-between">
          <p>© 2026 Borneo. Prices include GST.</p>
          <p>Demo store: products, prices and orders are samples; nothing is charged or shipped.</p>
        </div>
      </Container>
    </footer>
  );
}

/** Link styling for footer lists filled by features (categories). */
export const footerLinkClass = link;
