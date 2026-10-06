import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { CheckIcon, ChevronDownIcon, InfoIcon, RotateCcwIcon, XIcon } from 'lucide-react';
import { toCatalogCard, toPriceBlock } from '@/features/catalog';
import { formatDateRange } from '@/shared/lib/format';
import { Countdown } from '@/shared/ui/commerce/Countdown';
import { OfferCard } from '@/shared/ui/commerce/OfferCard';
import { PriceBlock } from '@/shared/ui/commerce/PriceBlock';
import { ProductCard } from '@/shared/ui/commerce/ProductCard';
import { Rating } from '@/shared/ui/commerce/Rating';
import { SpecTable } from '@/shared/ui/commerce/SpecTable';
import { StatusBadge, type StatusBadgeProps } from '@/shared/ui/commerce/StatusBadge';
import { VariantSelector } from '@/shared/ui/commerce/VariantSelector';
import { Container } from '@/shared/ui/layout/Container';
import { Breadcrumbs } from '@/shared/ui/navigation/Breadcrumbs';
import { toOfferCards } from '../mappers/toOfferCards';
import { optionGroups, variantFor } from '../mappers/variantSelection';
import type { ProductDetail, ProductVariant } from '../model';
import { ProductGallery } from './ProductGallery';

type Props = {
  product: ProductDetail;
  variant: ProductVariant;
  onVariantChange: (sku: string) => void;
  /** Delivery checker for the selected variant; not shown for discontinued products. */
  delivery?: ReactNode;
};

function variantBadges(product: ProductDetail, v: ProductVariant): StatusBadgeProps[] {
  const badges: StatusBadgeProps[] = [];
  if (v.flash) badges.push({ kind: 'flashSale' });
  if (v.flash?.lowStockCount !== undefined)
    badges.push({ kind: 'lowStock', count: v.flash.lowStockCount });
  if (v.availability === 'preorder') badges.push({ kind: 'preorder' });
  if (v.availability === 'outOfStock' && product.status !== 'discontinued')
    badges.push({ kind: 'outOfStock' });
  return badges;
}

const h2 = 'font-heading text-headline tracking-tight';

/** Product page template (D-13, D-14): the same for every category, driven by data. */
export function ProductView({ product, variant, onVariantChange, delivery }: Props) {
  const groups = optionGroups(product, variant);
  const badges = variantBadges(product, variant);
  const offers = toOfferCards(variant.offers);
  const discontinued = product.status === 'discontinued';

  return (
    <Container className="space-y-16 pt-2 pb-8">
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { key: 'home', node: <Link to="/">Home</Link> },
            {
              key: 'category',
              node: (
                <Link to="/categories/$slug" params={{ slug: product.category.slug }}>
                  {product.category.name}
                </Link>
              ),
            },
            { key: 'product', node: product.name },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ProductGallery key={product.id} images={product.images} />
          </div>

          <div className="space-y-7">
            <div className="space-y-2">
              <p className="text-sm text-ink-muted">{product.lineName}</p>
              <h1 className="font-heading text-[2rem] leading-tight tracking-tight sm:text-title">
                {product.name}
              </h1>
              <Rating
                {...(product.rating.average !== null ? { value: product.rating.average } : {})}
                count={product.rating.count}
              />
            </div>

            {discontinued ? (
              <div role="note" className="flex gap-3 rounded-xl bg-surface p-5 text-sm">
                <InfoIcon className="size-5 shrink-0 text-info" aria-hidden />
                <p>
                  We no longer sell the {product.name}. Accessories and support continue.
                  {product.successor ? (
                    <>
                      {' '}
                      Its successor is the{' '}
                      <Link
                        to="/products/$slug"
                        params={{ slug: product.successor.slug }}
                        className="font-medium text-brand underline underline-offset-4"
                      >
                        {product.successor.name}
                      </Link>
                      .
                    </>
                  ) : null}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {badges.length ? (
                  <ul className="flex flex-wrap gap-1" aria-label="Status">
                    {badges.map((b, i) => (
                      <li key={i}>
                        <StatusBadge {...b} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                <PriceBlock
                  {...toPriceBlock(variant.price)}
                  size="lg"
                  unavailable={variant.availability === 'outOfStock'}
                />
                {variant.flash ? (
                  <Countdown endsAt={new Date(variant.flash.endsAt).toISOString()} />
                ) : null}
                {product.dispatch && variant.availability === 'preorder' ? (
                  <p className="text-sm">
                    Pre-order: expected to dispatch{' '}
                    <span className="font-medium">
                      {formatDateRange(product.dispatch.from, product.dispatch.to)}
                    </span>
                    . Pay in full now; cancel free before dispatch.
                  </p>
                ) : null}
              </div>
            )}

            {groups.length && !discontinued ? (
              <div className="space-y-4">
                {groups.map((g) => (
                  <VariantSelector
                    key={g.key}
                    legend={g.legend}
                    options={g.options}
                    value={g.value}
                    onValueChange={(value) =>
                      onVariantChange(variantFor(product, variant, g.key, value).sku)
                    }
                  />
                ))}
              </div>
            ) : null}

            {delivery && !discontinued ? (
              <div className="rounded-xl bg-surface p-5">{delivery}</div>
            ) : null}

            <div className="flex gap-3 rounded-xl bg-surface p-5 text-sm">
              <RotateCcwIcon className="size-5 shrink-0 text-ink-muted" aria-hidden />
              <p>{product.returnPolicy}</p>
            </div>

            {product.compatibility.length ? (
              <section aria-labelledby="pdp-compat" className="space-y-2">
                <h2 id="pdp-compat" className="text-sm font-semibold">
                  Compatibility
                </h2>
                <ul className="space-y-1 text-sm">
                  {product.compatibility.map((f) => (
                    <li key={f.key} className="flex items-center gap-2">
                      <CheckIcon className="size-4 shrink-0 text-success" aria-hidden />
                      {f.text}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="text-xs text-ink-muted">
              Model {product.modelNumber} · SKU {variant.sku}
            </p>
          </div>
        </div>
      </div>

      {offers.length && !discontinued ? (
        <section aria-labelledby="pdp-offers" className="space-y-4">
          <h2 id="pdp-offers" className={h2}>
            Offers
          </h2>
          <p className="text-sm text-ink-muted">
            One coupon and one payment offer per order. Applied at checkout.
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {offers.map(({ id, ...o }) => (
              <li key={id}>
                <OfferCard {...o} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {product.explainer || product.whoFor || product.notFor ? (
        <section aria-labelledby="pdp-about" className="space-y-4">
          <h2 id="pdp-about" className={h2}>
            About the {product.name}
          </h2>
          {product.explainer ? (
            <p className="max-w-3xl text-lg leading-relaxed sm:text-tagline sm:leading-snug sm:font-normal">
              {product.explainer}
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            {product.whoFor ? (
              <div className="rounded-xl bg-surface p-6">
                <h3 className="flex items-center gap-2 font-heading text-tagline tracking-tight">
                  <CheckIcon className="size-5 text-success" aria-hidden />
                  Who it's for
                </h3>
                <p className="mt-2 text-ink-muted">{product.whoFor}</p>
              </div>
            ) : null}
            {product.notFor ? (
              <div className="rounded-xl bg-surface p-6">
                <h3 className="flex items-center gap-2 font-heading text-tagline tracking-tight">
                  <XIcon className="size-5 text-ink-muted" aria-hidden />
                  Who it's not for
                </h3>
                <p className="mt-2 text-ink-muted">{product.notFor}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="pdp-specs" className="space-y-4">
        <h2 id="pdp-specs" className={h2}>
          Specifications
        </h2>
        <div className="max-w-3xl rounded-xl bg-surface p-6 sm:p-8">
          <SpecTable groups={product.specs} />
        </div>
      </section>

      {product.faqs.length ? (
        <section aria-labelledby="pdp-faqs" className="space-y-4">
          <h2 id="pdp-faqs" className={h2}>
            Questions
          </h2>
          <div className="max-w-3xl divide-y divide-line rounded-xl bg-surface">
            {product.faqs.map((f) => (
              <details key={f.question} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-semibold outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <ChevronDownIcon
                    className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="px-6 pb-5 text-ink-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="pdp-reviews" className="space-y-2">
        <h2 id="pdp-reviews" className={h2}>
          Reviews
        </h2>
        <p className="text-sm text-ink-muted">
          {product.rating.count === 0
            ? 'No reviews yet. Only customers who bought this product can review it.'
            : `${product.rating.count} verified review${product.rating.count === 1 ? '' : 's'}.`}
        </p>
      </section>

      {product.suggestions.length ? (
        <section aria-labelledby="pdp-suggestions" className="space-y-4">
          <h2 id="pdp-suggestions" className={h2}>
            Goes well with
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {product.suggestions.map(({ product: p, reason }) => {
              const { id, slug, ...card } = toCatalogCard(p);
              return (
                <li key={id} className="flex flex-col gap-2">
                  <ProductCard
                    {...card}
                    link={{ to: '/products/$slug', params: { slug } }}
                    className="flex-1"
                  />
                  <p className="px-1 text-sm text-ink-muted">{reason}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
