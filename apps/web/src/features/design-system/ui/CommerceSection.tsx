import { useState } from 'react';
import { Countdown } from '@/shared/ui/commerce/Countdown';
import { DeliveryChecker } from '@/shared/ui/commerce/DeliveryChecker';
import { OfferCard } from '@/shared/ui/commerce/OfferCard';
import { OrderTimeline } from '@/shared/ui/commerce/OrderTimeline';
import { PriceBlock } from '@/shared/ui/commerce/PriceBlock';
import { ProductCard } from '@/shared/ui/commerce/ProductCard';
import { ProductCardSkeleton } from '@/shared/ui/commerce/ProductCardSkeleton';
import { Rating } from '@/shared/ui/commerce/Rating';
import { SpecTable } from '@/shared/ui/commerce/SpecTable';
import { StatusBadge } from '@/shared/ui/commerce/StatusBadge';
import { VariantSelector } from '@/shared/ui/commerce/VariantSelector';
import {
  demoCards,
  demoColours,
  demoCountdownFrozen,
  demoDeadline,
  demoDelivery,
  demoPrices,
  demoSpecs,
  demoStorage,
  demoTimeline,
} from './demoData';
import { Specimen, State } from './Specimen';

const noop = () => {};

export function CommerceSection() {
  const [colour, setColour] = useState('forest');
  const [storage, setStorage] = useState('256');
  const [watching, setWatching] = useState(false);

  return (
    <section aria-labelledby="commerce" className="space-y-4">
      <h2 id="commerce" className="text-2xl font-bold">
        Commerce components
      </h2>

      <Specimen
        title="Price"
        note="Headline is always the selling price (D-30). MRP and savings only when genuine (D-31)."
      >
        {demoPrices.map((p) => (
          <State key={p.state} label={p.state}>
            <PriceBlock {...p.props} />
          </State>
        ))}
      </Specimen>

      <Specimen title="Rating" note="Verified purchases only (D-150).">
        <State label="With reviews">
          <Rating value={4.3} count={128} />
        </State>
        <State label="No reviews yet">
          <Rating count={0} />
        </State>
      </Specimen>

      <Specimen
        title="Status badges"
        note="Low stock only from a real cap; compatibility only from a filled attribute."
      >
        <State label="All kinds" wide>
          <div className="flex flex-wrap gap-2">
            <StatusBadge kind="inStock" />
            <StatusBadge kind="lowStock" count={3} />
            <StatusBadge kind="outOfStock" />
            <StatusBadge kind="preorder" />
            <StatusBadge kind="flashSale" />
            <StatusBadge kind="newLaunch" />
            <StatusBadge kind="upgradeAvailable" />
            <StatusBadge kind="bundle" />
            <StatusBadge kind="worksWith" ecosystem="Alexa" />
          </div>
        </State>
      </Specimen>

      <Specimen title="Product card" columns={4}>
        {demoCards.map((c) => (
          <State key={c.state} label={c.state}>
            <ProductCard
              {...c.props}
              {...(c.props.availability === 'outOfStock'
                ? { watching, onWatchToggle: () => setWatching((w) => !w) }
                : {})}
            />
          </State>
        ))}
        <State label="Loading">
          <ProductCardSkeleton />
        </State>
      </Specimen>

      <Specimen title="Variant selector" note="Unavailable options stay visible but disabled.">
        <State label="Colour">
          <VariantSelector
            legend="Colour"
            options={demoColours}
            value={colour}
            onValueChange={setColour}
          />
        </State>
        <State label="Storage">
          <VariantSelector
            legend="Storage"
            options={demoStorage}
            value={storage}
            onValueChange={setStorage}
          />
        </State>
      </Specimen>

      <Specimen
        title="Delivery checker"
        note="Shows results from the serviceability rule; never decides them."
      >
        {demoDelivery.map((d) => (
          <State key={d.state} label={d.state}>
            <DeliveryChecker
              pincode={d.pincode}
              onPincodeChange={noop}
              onCheck={noop}
              state={d.result}
            />
          </State>
        ))}
      </Specimen>

      <Specimen title="Offer card" note="Max 1 coupon + 1 payment offer (D-35).">
        <State label="Available">
          <OfferCard
            kind="coupon"
            title="Demo ₹500 off"
            description="On orders above ₹4,999."
            code="DEMO500"
            status="available"
            onApply={noop}
          />
        </State>
        <State label="Applied">
          <OfferCard
            kind="noCostEmi"
            title="Demo no-cost EMI"
            description="6 months on select cards."
            status="applied"
          />
        </State>
        <State label="Not applicable">
          <OfferCard
            kind="bank"
            title="Demo Bank 10% instant discount"
            description="Up to ₹1,500 on credit cards."
            status="notApplicable"
            reason="no-cost EMI already uses the payment offer slot"
          />
        </State>
        <State label="Bundle">
          <OfferCard
            kind="bundle"
            title="Demo phone + earbuds"
            description="Fixed bundle price."
            status="available"
            onApply={noop}
          />
        </State>
      </Specimen>

      <Specimen
        title="Countdown"
        note="Counts to a real, fixed deadline. Never resets. Frozen-clock states shown for review."
      >
        <State label="Live, ticking to 31 Dec 2026, 11:59 pm IST">
          <Countdown endsAt={demoDeadline} label="Demo flash sale" />
        </State>
        {demoCountdownFrozen.map((c) => (
          <State key={c.state} label={c.state}>
            <Countdown
              endsAt={demoDeadline}
              label="Demo flash sale"
              now={c.now}
              {...(c.startsAt ? { startsAt: c.startsAt } : {})}
            />
          </State>
        ))}
      </Specimen>

      <Specimen title="Spec table">
        <State label="Grouped, with a missing value">
          <SpecTable groups={demoSpecs} />
        </State>
        <State label="Empty">
          <SpecTable groups={[]} />
        </State>
      </Specimen>

      <Specimen title="Order timeline">
        <State label="In transit">
          <OrderTimeline steps={demoTimeline} />
        </State>
        <State label="Cancelled">
          <OrderTimeline
            steps={demoTimeline.slice(0, 2)}
            outcome={{
              kind: 'cancelled',
              label: 'Cancelled before dispatch',
              at: '6 Oct, 11:00 am',
            }}
          />
        </State>
        <State label="Replacement requested" wide>
          <OrderTimeline
            steps={demoTimeline.map((s) => ({ ...s, status: 'done' as const }))}
            outcome={{ kind: 'returnRequested', label: 'Replacement requested', at: '10 Oct' }}
          />
        </State>
      </Specimen>
    </section>
  );
}
