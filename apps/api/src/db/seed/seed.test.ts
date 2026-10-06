import { describe, expect, it } from 'vitest';
import { buildSeed, seedData, seedIssues, type SeedData } from './index';

const NOW = new Date('2026-10-06T06:30:00.000Z');
const rows = buildSeed(NOW);

/** A deep copy of the seed with one fault planted. */
function plant(fault: (d: SeedData) => void): SeedData {
  const copy = structuredClone(seedData);
  fault(copy);
  return copy;
}
const product = (d: SeedData, slug: string) => d.products.find((p) => p.slug === slug)!;

describe('seed catalog', () => {
  it('has no issues', () => {
    expect(seedIssues(seedData)).toEqual([]);
  });

  it('D-10: every launch category exists and sells at least one product', () => {
    const launch = [
      'smartphones',
      'audio',
      'wearables',
      'accessories',
      'smart-home',
      'tvs',
      'robot-vacuums',
    ];
    expect(rows.category.map((c) => c.slug).sort()).toEqual([...launch].sort());
    for (const c of rows.category)
      expect(rows.product.some((p) => p.categoryId === c.id && p.status === 'live')).toBe(true);
  });

  it('D-13: smartphones and audio are full depth with a finder; the rest are templates', () => {
    const full = rows.category.filter((c) => c.depth === 'full').map((c) => c.slug);
    expect(full.sort()).toEqual(['audio', 'smartphones']);
    for (const c of rows.category) expect(c.config.finder !== undefined).toBe(c.depth === 'full');
  });

  it('D-81: phones and TVs are seeded replacement only; D-83: the rest are returnable', () => {
    const policy = Object.fromEntries(rows.category.map((c) => [c.slug, c.returnPolicy]));
    expect(policy).toEqual({
      smartphones: 'replacementOnly',
      tvs: 'replacementOnly',
      audio: 'return',
      wearables: 'return',
      accessories: 'return',
      'smart-home': 'return',
      'robot-vacuums': 'return',
    });
  });

  it('D-16: a product attribute that breaks its category schema is reported', () => {
    const issues = seedIssues(
      plant((d) => {
        product(d, 'pulse-4').attributes.ip_rating = 'IP99';
        product(d, 'pulse-4').attributes.colour = 'Forest';
      }),
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^pulse-4: attribute ip_rating: .* \(D-16\)$/),
        expect.stringMatching(/^pulse-4: attribute \(root\): .*colour.* \(D-16\)$/),
      ]),
    );
  });

  it('D-31: a selling price above MRP is reported', () => {
    const issues = seedIssues(plant((d) => (product(d, 'nova-3').variants[0]!.price = 99999)));
    expect(issues).toContain('BN3-8-128-MIS: price must be > 0 and ≤ MRP (D-31)');
  });

  it('D-06: a bundle that is not cheaper than its members is reported', () => {
    const issues = seedIssues(plant((d) => (d.bundles[0]!.price = 99999)));
    expect(issues).toContain(
      "bundle pulse-4-audio-pack: price must be below the members' total (D-06)",
    );
  });

  it('D-140: a flash sale above the selling price or beyond stock is reported', () => {
    const issues = seedIssues(
      plant((d) => {
        d.flashSales[0]!.salePrice = 9999;
        d.flashSales[0]!.cap = 10_000;
      }),
    );
    expect(issues).toEqual(
      expect.arrayContaining([
        'flash echo-buds-2-live: sale price must be below the selling price (D-140)',
        'flash echo-buds-2-live: cap exceeds stock on hand (D-140)',
      ]),
    );
  });

  it('D-22: a relation rule on a free-text attribute is reported', () => {
    const issues = seedIssues(
      plant(
        (d) =>
          (d.relationRules[0]!.match = { kind: 'equal', fromAttr: 'chipset', toAttr: 'connector' }),
      ),
    );
    expect(issues).toContain('rule phone-case: free-text attributes cannot drive relations (D-22)');
  });

  it('D-27: an override that adds and removes the same edge is reported', () => {
    const issues = seedIssues(
      plant((d) =>
        d.relationOverrides.push({
          from: 'apex-2',
          to: 'cable-usb-c-1m',
          type: 'compatible',
          action: 'add',
        }),
      ),
    );
    expect(issues).toContain('override apex-2>cable-usb-c-1m>compatible: added and removed (D-27)');
  });

  it('D-45: a no-cost EMI offer whose rate differs from the bank plan is reported', () => {
    const issues = seedIssues(
      plant(
        (d) =>
          (d.emiPlans.find((p) => p.bank === 'ICICI' && p.tenureMonths === 6)!.annualRateBps =
            1600),
      ),
    );
    expect(issues).toContain(
      "offer phones-no-cost-6: ICICI has no 6-month plan at the offer's rate (D-45)",
    );
  });

  it('D-65: pre-orders sell against a cap, never warehouse stock', () => {
    expect(rows.variant.find((v) => v.sku === 'BN4-12-256-GLA')).toMatchObject({
      preorderCap: 200,
    });
    expect(
      rows.variant.filter((v) => v.sku !== 'BN4-12-256-GLA').every((v) => v.preorderCap === null),
    ).toBe(true);
    const issues = seedIssues(
      plant((d) => {
        const v = product(d, 'nova-4').variants[0]!;
        v.stock = [1, 0, 0];
      }),
    );
    expect(issues).toContain(
      'BN4-12-256-GLA: pre-orders sell against their cap, not warehouse stock (D-65)',
    );
  });

  it('rejects relation rules whose match kind does not fit the attribute types', () => {
    const issues = seedIssues(
      plant(
        (d) =>
          (d.relationRules[0]!.match = {
            kind: 'equal',
            fromAttr: 'case_fit',
            toAttr: 'fits_case',
          }),
      ),
    );
    expect(issues).toContain(
      'rule phone-case: "equal" needs two scalar attributes of the same type',
    );
  });

  it('D-152: full-depth products need explainer, who it is for and who it is not for', () => {
    const issues = seedIssues(plant((d) => delete product(d, 'echo-buds-2').notFor));
    expect(issues).toContain(
      "echo-buds-2: full-depth products need explainer, who it's for and not for (D-152)",
    );
  });

  it('D-64: pre-orders get a dispatch range in IST dates after seeding', () => {
    const nova4 = rows.product.find((p) => p.slug === 'nova-4')!;
    expect(nova4).toMatchObject({
      status: 'preorder',
      dispatchFrom: '2026-10-27',
      dispatchTo: '2026-11-03',
    });
    expect(
      rows.product.filter((p) => p.status !== 'preorder').every((p) => p.dispatchFrom === null),
    ).toBe(true);
  });

  it('D-62: every seeded pincode has a row for every category', () => {
    const pincodes = new Set(rows.serviceability.map((s) => s.pincode));
    expect(rows.serviceability).toHaveLength(pincodes.size * rows.category.length);
    expect(rows.serviceability.some((s) => s.pincode === '799001')).toBe(false);
  });

  it('D-70: COD only where the pincode is deliverable', () => {
    expect(rows.serviceability.filter((s) => !s.deliverable && s.codAllowed)).toEqual([]);
  });

  it('D-41: every price is whole paise', () => {
    const paise = [
      ...rows.variant.flatMap((v) => [v.pricePaise, v.mrpPaise]),
      ...rows.bundle.map((b) => b.pricePaise),
      ...rows.flashSale.map((f) => f.salePricePaise),
    ];
    expect(paise.every((p) => Number.isSafeInteger(p) && p > 0)).toBe(true);
  });

  it('D-140: flash sales have a real window relative to seeding', () => {
    const live = rows.flashSale.find((f) => f.cap === 40)!;
    expect(live.startsAt.getTime()).toBeLessThan(NOW.getTime());
    expect(live.endsAt.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('ids are stable across builds', () => {
    const again = buildSeed(new Date('2030-01-01T00:00:00.000Z'));
    expect(again.product.map((p) => p.id)).toEqual(rows.product.map((p) => p.id));
    expect(again.variant.map((v) => v.id)).toEqual(rows.variant.map((v) => v.id));
  });

  it('refuses to build an invalid catalog', () => {
    expect(() =>
      buildSeed(
        NOW,
        plant((d) => (product(d, 'pulse-4').attributes.nfc = 'yes')),
      ),
    ).toThrow(/Seed catalog is invalid/);
  });
});
