import {
  attributesSchemaFor,
  couponSchema,
  flashSaleSchema,
  paymentOfferSchema,
  type AttributeDef,
} from '@borneo/shared';
import type * as schema from '../schema/index';
import { categories, type SeedCategory } from './categories';
import * as commerce from './commerce';
import { inr, seedId } from './ids';
import { deliveryLanes, servicePincodes, warehouses } from './logistics';
import { DEFAULT_STOCK, lines, products, type SeedProduct } from './products';
import { relationOverrides, relationRules } from './relations';

type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert'][];

export type SeedData = {
  categories: SeedCategory[];
  lines: typeof lines;
  products: SeedProduct[];
  relationRules: typeof relationRules;
  relationOverrides: typeof relationOverrides;
  bundles: typeof commerce.bundles;
  flashSales: typeof commerce.flashSales;
  paymentOffers: typeof commerce.paymentOffers;
  emiPlans: typeof commerce.emiPlans;
};

export const seedData: SeedData = {
  categories,
  lines,
  products,
  relationRules,
  relationOverrides,
  bundles: commerce.bundles,
  flashSales: commerce.flashSales,
  paymentOffers: commerce.paymentOffers,
  emiPlans: commerce.emiPlans,
};

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const istDate = (ms: number) => new Date(ms + 5.5 * HOUR_MS).toISOString().slice(0, 10);

const totalStock = (p: SeedProduct, sku: string) =>
  (p.variants.find((v) => v.sku === sku)?.stock ?? DEFAULT_STOCK).reduce((a, b) => a + b, 0);

const isSelling = (p: SeedProduct) => p.status === 'live' || p.status === 'preorder';

/** Every problem in the seed catalog; empty means it can be loaded. */
export function seedIssues(data: SeedData): string[] {
  const issues: string[] = [];
  const cats = new Map(data.categories.map((c) => [c.slug, c]));
  const bySlug = new Map(data.products.map((p) => [p.slug, p]));
  const bySku = new Map(data.products.flatMap((p) => p.variants.map((v) => [v.sku, { p, v }])));
  const unique = (label: string, values: string[]) => {
    const seen = new Set<string>();
    for (const v of values) {
      if (seen.has(v)) issues.push(`duplicate ${label} "${v}"`);
      seen.add(v);
    }
  };
  unique(
    'category slug',
    data.categories.map((c) => c.slug),
  );
  unique(
    'product slug',
    data.products.map((p) => p.slug),
  );
  unique(
    'model number',
    data.products.map((p) => p.modelNumber),
  );
  unique(
    'sku',
    data.products.flatMap((p) => p.variants.map((v) => v.sku)),
  );

  for (const c of data.categories) {
    const defs = new Map(c.attributes.map((d) => [d.key, d]));
    unique(
      `attribute in ${c.slug}`,
      c.attributes.map((d) => d.key),
    );
    for (const d of c.attributes) {
      if ((d.type === 'enum' || d.type === 'list') && !d.options)
        issues.push(`${c.slug}.${d.key}: ${d.type} attributes need options`);
      if (d.compat && d.type === 'text')
        issues.push(`${c.slug}.${d.key}: text cannot be compat (D-22)`);
    }
    for (const k of c.config.filters)
      if (!defs.get(k)?.filterable)
        issues.push(`${c.slug}: filter "${k}" is not a filterable attribute`);
    for (const k of c.config.compare)
      if (!defs.get(k)?.comparable)
        issues.push(`${c.slug}: compare "${k}" is not a comparable attribute`);
    for (const g of c.config.specGroups)
      for (const k of g.keys)
        if (!defs.has(k)) issues.push(`${c.slug}: spec "${k}" is not an attribute`);
    if (c.depth === 'full' && !c.config.finder)
      issues.push(`${c.slug}: full depth needs a finder (D-13)`);
    if (c.depth === 'template' && c.config.finder)
      issues.push(`${c.slug}: finders are for full-depth categories only (D-13)`);
  }

  for (const l of data.lines)
    if (!cats.has(l.category)) issues.push(`line ${l.key}: unknown category ${l.category}`);

  for (const p of data.products) {
    const cat = cats.get(p.category);
    if (!cat) {
      issues.push(`${p.slug}: unknown category ${p.category}`);
      continue;
    }
    const line = data.lines.find((l) => l.key === p.line);
    if (line?.category !== p.category)
      issues.push(`${p.slug}: line ${p.line} is not in ${p.category}`);
    const parsed = attributesSchemaFor(cat.attributes).safeParse(p.attributes);
    if (!parsed.success)
      for (const i of parsed.error.issues)
        issues.push(`${p.slug}: attribute ${i.path.join('.') || '(root)'}: ${i.message} (D-16)`);
    if (cat.depth === 'full' && isSelling(p) && !(p.explainer && p.whoFor && p.notFor))
      issues.push(
        `${p.slug}: full-depth products need explainer, who it's for and not for (D-152)`,
      );
    if ((p.status === 'preorder') !== (p.dispatchInDays !== undefined))
      issues.push(`${p.slug}: pre-orders, and only pre-orders, need a dispatch range (D-64)`);
    if (p.variants.length === 0) issues.push(`${p.slug}: no variants`);
    for (const v of p.variants) {
      const preorder = p.status === 'preorder';
      if (preorder !== (v.preorderCap !== undefined))
        issues.push(`${v.sku}: pre-order variants, and only those, need a pre-order cap (D-65)`);
      if (preorder && totalStock(p, v.sku) > 0)
        issues.push(`${v.sku}: pre-orders sell against their cap, not warehouse stock (D-65)`);
    }
    for (const v of p.variants) {
      if (v.price <= 0 || v.price > v.mrp)
        issues.push(`${v.sku}: price must be > 0 and ≤ MRP (D-31)`);
      if (!Number.isInteger(v.price) || !Number.isInteger(v.mrp))
        issues.push(`${v.sku}: prices are whole rupees in seed files`);
    }
  }

  for (const r of data.relationRules) {
    const from = cats.get(r.from);
    const to = cats.get(r.to);
    const fromDef = from?.attributes.find((d) => d.key === r.match.fromAttr);
    const toDef = to?.attributes.find((d) => d.key === r.match.toAttr);
    if (!fromDef || !toDef) issues.push(`rule ${r.key}: attributes must exist on both categories`);
    else if (fromDef.type === 'text' || toDef.type === 'text')
      issues.push(`rule ${r.key}: free-text attributes cannot drive relations (D-22)`);
    else if (r.match.kind === 'equal' && (fromDef.type !== toDef.type || fromDef.type === 'list'))
      issues.push(`rule ${r.key}: "equal" needs two scalar attributes of the same type`);
    else if (r.match.kind === 'contains' && (fromDef.type === 'list') === (toDef.type === 'list'))
      issues.push(`rule ${r.key}: "contains" needs exactly one list attribute`);
  }
  const overrideKey = (o: (typeof data.relationOverrides)[number]) => `${o.from}>${o.to}>${o.type}`;
  const removes = new Set(
    data.relationOverrides.filter((o) => o.action === 'remove').map(overrideKey),
  );
  for (const o of data.relationOverrides) {
    if (!bySlug.has(o.from) || !bySlug.has(o.to))
      issues.push(`override ${overrideKey(o)}: unknown product`);
    if (o.action === 'add' && removes.has(overrideKey(o)))
      issues.push(`override ${overrideKey(o)}: added and removed (D-27)`);
  }

  for (const o of data.paymentOffers) {
    if (o.kind !== 'noCostEmi') continue;
    for (const bank of o.banks ?? [])
      if (
        !data.emiPlans.some(
          (p) =>
            p.bank === bank &&
            p.tenureMonths === o.tenureMonths &&
            p.annualRateBps === o.annualRateBps,
        )
      )
        issues.push(
          `offer ${o.key}: ${bank} has no ${o.tenureMonths}-month plan at the offer's rate (D-45)`,
        );
  }

  for (const b of data.bundles) {
    let total = 0;
    for (const item of b.items) {
      const hit = bySku.get(item.sku);
      if (!hit || hit.p.status !== 'live')
        issues.push(`bundle ${b.slug}: ${item.sku} is not a live variant`);
      else total += hit.v.price * item.qty;
    }
    if (b.price >= total)
      issues.push(`bundle ${b.slug}: price must be below the members' total (D-06)`);
  }

  for (const f of data.flashSales) {
    const hit = bySku.get(f.sku);
    if (!hit || hit.p.status !== 'live') {
      issues.push(`flash ${f.key}: ${f.sku} is not a live variant`);
      continue;
    }
    if (f.salePrice >= hit.v.price)
      issues.push(`flash ${f.key}: sale price must be below the selling price (D-140)`);
    if (f.cap > totalStock(hit.p, f.sku))
      issues.push(`flash ${f.key}: cap exceeds stock on hand (D-140)`);
  }
  return issues;
}

export type SeedRows = {
  category: Insert<typeof schema.category>;
  attributeDef: Insert<typeof schema.attributeDef>;
  productLine: Insert<typeof schema.productLine>;
  product: Insert<typeof schema.product>;
  variant: Insert<typeof schema.variant>;
  faq: Insert<typeof schema.faq>;
  searchSynonym: Insert<typeof schema.searchSynonym>;
  relationRule: Insert<typeof schema.relationRule>;
  relationOverride: Insert<typeof schema.relationOverride>;
  bundle: Insert<typeof schema.bundle>;
  bundleItem: Insert<typeof schema.bundleItem>;
  offer: Insert<typeof schema.offer>;
  emiPlan: Insert<typeof schema.emiPlan>;
  flashSale: Insert<typeof schema.flashSale>;
  disposableDomain: Insert<typeof schema.disposableDomain>;
  warehouse: Insert<typeof schema.warehouse>;
  inventory: Insert<typeof schema.inventory>;
  serviceability: Insert<typeof schema.serviceability>;
  deliveryLane: Insert<typeof schema.deliveryLane>;
};

/** Insert-ready rows. Throws if the seed has issues; offers and flash sales are parsed with the shared contracts. */
export function buildSeed(now: Date, data: SeedData = seedData): SeedRows {
  const issues = seedIssues(data);
  if (issues.length > 0) throw new Error(`Seed catalog is invalid:\n- ${issues.join('\n- ')}`);

  const t = now.getTime();
  const catId = (slug: string) => seedId('category', slug);
  const productId = (slug: string) => seedId('product', slug);
  const variantId = (sku: string) => seedId('variant', sku);
  const warehouseId = (code: string) => seedId('warehouse', code);
  const offerFrom = new Date(t + commerce.OFFER_WINDOW_DAYS.from * DAY_MS);
  const offerTo = new Date(t + commerce.OFFER_WINDOW_DAYS.to * DAY_MS);
  const categoryIds = (slugs?: string[]) => (slugs ? { categoryIds: slugs.map(catId) } : {});

  const offer: SeedRows['offer'] = [
    ...commerce.coupons.map((c) => {
      const id = seedId('offer', c.code);
      const { categories: scope, code, name, ...rest } = c;
      const rules = { ...rest, ...categoryIds(scope) };
      couponSchema.parse({
        id,
        code,
        name,
        ...rules,
        validFrom: offerFrom.getTime(),
        validTo: offerTo.getTime(),
      });
      return {
        id,
        kind: 'coupon' as const,
        code,
        name,
        rules,
        appliesToAll: false,
        activeFrom: offerFrom,
        activeTo: offerTo,
      };
    }),
    ...data.paymentOffers.map((o) => {
      const { key, categories: scope, name, appliesToAll, ...rest } = o;
      const id = seedId('offer', key);
      const rules = { ...rest, ...categoryIds(scope) };
      paymentOfferSchema.parse({
        id,
        name,
        appliesToAll,
        ...rules,
        validFrom: offerFrom.getTime(),
        validTo: offerTo.getTime(),
      });
      return {
        id,
        kind: o.kind === 'bank' ? ('bank' as const) : ('no_cost_emi' as const),
        code: null,
        name,
        rules,
        appliesToAll,
        activeFrom: offerFrom,
        activeTo: offerTo,
      };
    }),
  ];

  const flashSale: SeedRows['flashSale'] = data.flashSales.map((f) => {
    const id = seedId('flash', f.key);
    const startsAt = t + f.startsInHours * HOUR_MS;
    const endsAt = startsAt + f.durationHours * HOUR_MS;
    const row = {
      id,
      variantId: variantId(f.sku),
      salePricePaise: inr(f.salePrice),
      cap: f.cap,
      sold: 0,
      perCustomerLimit: 1,
    };
    flashSaleSchema.parse({ ...row, startsAt, endsAt });
    return { ...row, startsAt: new Date(startsAt), endsAt: new Date(endsAt) };
  });

  return {
    category: data.categories.map((c, i) => ({
      id: catId(c.slug),
      slug: c.slug,
      name: c.name,
      depth: c.depth,
      config: c.config,
      returnPolicy: c.returnPolicy,
      sort: i,
    })),
    attributeDef: data.categories.flatMap((c) =>
      c.attributes.map((d: AttributeDef, i) => ({
        id: seedId('attribute', `${c.slug}.${d.key}`),
        categoryId: catId(c.slug),
        key: d.key,
        label: d.label,
        type: d.type,
        unit: d.unit ?? null,
        options: d.options ?? null,
        filterable: d.filterable ?? false,
        comparable: d.comparable ?? false,
        compat: d.compat,
        sort: i,
      })),
    ),
    productLine: data.lines.map((l) => ({
      id: seedId('line', l.key),
      categoryId: catId(l.category),
      name: l.name,
    })),
    product: data.products.map((p) => ({
      id: productId(p.slug),
      lineId: seedId('line', p.line),
      categoryId: catId(p.category),
      slug: p.slug,
      name: p.name,
      modelNumber: p.modelNumber,
      generation: p.generation,
      tier: p.tier,
      familyTier: p.familyTier,
      status: p.status,
      attributes: p.attributes,
      explainer: p.explainer ?? null,
      whoFor: p.whoFor ?? null,
      notFor: p.notFor ?? null,
      launchedAt: p.launchedAt ?? null,
      dispatchFrom: p.dispatchInDays ? istDate(t + p.dispatchInDays[0] * DAY_MS) : null,
      dispatchTo: p.dispatchInDays ? istDate(t + p.dispatchInDays[1] * DAY_MS) : null,
    })),
    variant: data.products.flatMap((p) =>
      p.variants.map((v) => ({
        id: variantId(v.sku),
        productId: productId(p.slug),
        sku: v.sku,
        options: v.options,
        mrpPaise: inr(v.mrp),
        pricePaise: inr(v.price),
        preorderCap: v.preorderCap ?? null,
      })),
    ),
    faq: [
      ...data.categories.flatMap((c) =>
        c.faqs.map((f, i) => ({
          id: seedId('faq', `${c.slug}#${i}`),
          categoryId: catId(c.slug),
          ...f,
          sort: i,
        })),
      ),
      ...data.products.flatMap((p) =>
        (p.faqs ?? []).map((f, i) => ({
          id: seedId('faq', `${p.slug}#${i}`),
          productId: productId(p.slug),
          ...f,
          sort: i,
        })),
      ),
    ],
    searchSynonym: commerce.searchSynonyms.map((s) => ({ id: seedId('synonym', s.term), ...s })),
    relationRule: data.relationRules.map((r) => ({
      id: seedId('relation-rule', r.key),
      type: r.type,
      fromCategoryId: catId(r.from),
      toCategoryId: catId(r.to),
      match: r.match,
      reasonTemplate: r.reasonTemplate,
    })),
    relationOverride: data.relationOverrides.map((o) => ({
      id: seedId('relation-override', `${o.from}>${o.to}>${o.type}>${o.action}`),
      fromProductId: productId(o.from),
      toProductId: productId(o.to),
      type: o.type,
      action: o.action,
      reason: o.reason ?? null,
    })),
    bundle: data.bundles.map((b) => ({
      id: seedId('bundle', b.slug),
      slug: b.slug,
      name: b.name,
      pricePaise: inr(b.price),
      activeFrom: offerFrom,
      activeTo: null,
    })),
    bundleItem: data.bundles.flatMap((b) =>
      b.items.map((i) => ({
        bundleId: seedId('bundle', b.slug),
        variantId: variantId(i.sku),
        qty: i.qty,
      })),
    ),
    offer,
    emiPlan: data.emiPlans.map((p) => ({
      id: seedId('emi', `${p.bank}-${p.tenureMonths}`),
      ...p,
    })),
    flashSale,
    disposableDomain: commerce.disposableDomains.map((domain) => ({ domain })),
    warehouse: warehouses.map((w) => ({ id: warehouseId(w.code), ...w })),
    inventory: data.products.flatMap((p) =>
      p.variants.flatMap((v) =>
        (v.stock ?? DEFAULT_STOCK).map((onHand, i) => ({
          warehouseId: warehouseId(warehouses[i]!.code),
          variantId: variantId(v.sku),
          onHand,
          reserved: 0,
        })),
      ),
    ),
    serviceability: servicePincodes.flatMap((s) =>
      data.categories.map((c) => ({
        pincode: s.pincode,
        categoryId: catId(c.slug),
        ...(s.except?.[c.slug] ?? { deliverable: true, codAllowed: true }),
      })),
    ),
    deliveryLane: deliveryLanes.map((l) => ({
      warehouseId: warehouseId(l.warehouse),
      pincodePrefix: l.prefix,
      minDays: l.minDays,
      maxDays: l.maxDays,
    })),
  };
}
