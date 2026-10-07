import { compareViewSchema, productDetailSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';

const db = useTestDb();
const app = testApp(db);
const detail = async (slug: string) =>
  productDetailSchema.parse((await app.inject({ method: 'GET', url: `/products/${slug}` })).json());

describe('product page lineup', () => {
  it('D-237: points to the newest sold generation in the line, pre-orders included', async () => {
    const nova3 = await detail('nova-3');
    expect(nova3.newerModel).toMatchObject({
      slug: 'nova-4',
      kind: 'newerGeneration',
      preorder: true,
    });
    expect(nova3.newerModel!.pricePaise).toBeGreaterThan(0);
  });

  it('D-237: the top model of the newest generation has no nudge', async () => {
    expect((await detail('apex-2-premium')).newerModel).toBeNull();
  });

  it('D-238: previous model (even discontinued), newer model, siblings', async () => {
    const pulse4 = await detail('pulse-4');
    expect(pulse4.compareWith.map((c) => [c.slug, c.relation, c.discontinued])).toEqual([
      ['pulse-3', 'previous', true],
      ['pulse-4-pro', 'sibling', false],
    ]);
  });

  it('D-238: compare accepts a discontinued predecessor of the category', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/compare?category=smartphones&p=pulse-4,pulse-3',
    });
    const view = compareViewSchema.parse(res.json());
    expect(view.products.map((p) => [p.slug, p.status])).toEqual([
      ['pulse-4', 'live'],
      ['pulse-3', 'discontinued'],
    ]);
  });
});
