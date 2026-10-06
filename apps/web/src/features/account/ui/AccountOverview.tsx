import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { useSessionQuery } from '@/features/auth';

const spacedMobile = (phone: string) => `${phone.slice(0, 5)} ${phone.slice(5)}`;

/** Who is signed in, and where things are. */
export function AccountOverview() {
  const { data: customer } = useSessionQuery();
  if (!customer) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section aria-labelledby="details" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="details" className="mb-3 font-semibold">
          Your details
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
          <dt className="text-ink-muted">Name</dt>
          <dd>{customer.name}</dd>
          <dt className="text-ink-muted">Email</dt>
          <dd className="break-all">{customer.email}</dd>
          <dt className="text-ink-muted">Mobile</dt>
          <dd className="tabular-nums">
            {customer.phone ? spacedMobile(customer.phone) : 'Not added'}
          </dd>
        </dl>
      </section>
      <section aria-labelledby="shortcuts" className="rounded-xl border border-line bg-surface p-5">
        <h2 id="shortcuts" className="mb-1 font-semibold">
          Orders
        </h2>
        <p className="text-[15px] text-ink-muted">
          Your orders, returns and invoices will appear here once you’ve placed an order.
        </p>
        <Link
          to="/account/addresses"
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-[15px] text-brand hover:underline"
        >
          Manage addresses
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
