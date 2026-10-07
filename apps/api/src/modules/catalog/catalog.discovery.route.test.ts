import { compareViewSchema, finderViewSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';

const db = useTestDb();
const app = testApp(db);
const get = async (url: string) => app.inject({ method: 'GET', url });

describe('GET /finder/:id', () => {
  it('D-225: questions first; results only once every question has an answer', async () => {
    const res = await get('/finder/phones?budget=under20');
    expect(res.statusCode).toBe(200);
    const view = finderViewSchema.parse(res.json());
    expect(view.category.slug).toBe('smartphones');
    expect(view.questions.map((q) => q.key)).toEqual(['budget', 'priority', 'needs']);
    expect(view.complete).toBe(false);
    expect(view.results).toEqual([]);
    expect(view.explainers.length).toBeGreaterThan(0);
  });

  it('D-225: hard answers filter, results say why, and only live products show', async () => {
    const view = finderViewSchema.parse(
      (await get('/finder/phones?budget=under20&priority=battery&needs=5g,nfc')).json(),
    );
    expect(view.complete).toBe(true);
    expect(view.results.length).toBeGreaterThan(0);
    for (const r of view.results) {
      expect(r.product.price.sellingPaise).toBeLessThan(20_000_00 + 1);
      expect(r.product.status).toBe('live');
      expect(r.reasons).toContain('5G: Yes');
      expect(r.reasons).toContain('NFC: Yes');
    }
  });

  it('D-225: unknown answers are ignored; nothing fitting names the answer to drop', async () => {
    const view = finderViewSchema.parse(
      (await get('/finder/audio?type=speaker&use=commute,hires&budget=under3&bogus=1')).json(),
    );
    expect(view.answers).toEqual({
      type: ['speaker'],
      use: ['commute', 'hires'],
      budget: ['under3'],
    });
    // No speaker cancels noise: the answer to drop is the one that brings back the most.
    const none = finderViewSchema.parse(
      (await get('/finder/audio?type=speaker&use=commute&budget=any')).json(),
    );
    expect(none.results).toEqual([]);
    expect(none.relax).toMatchObject({ question: 'type', option: 'speaker', label: 'Speaker' });
    expect(none.relax!.count).toBeGreaterThan(0);
  });

  it('D-13: only full-depth categories have a finder', async () => {
    expect((await get('/finder/tvs')).statusCode).toBe(404);
  });
});

describe('GET /compare', () => {
  it('D-227: rows from the category compare config, products in the order asked', async () => {
    const res = await get('/compare?category=audio&p=echo-buds-2-pro,echo-buds-2');
    expect(res.statusCode).toBe(200);
    const view = compareViewSchema.parse(res.json());
    expect(view.products.map((p) => p.slug)).toEqual(['echo-buds-2-pro', 'echo-buds-2']);
    expect(view.rows[0]!.label).toBe('Type');
    expect(view.rows.find((r) => r.key === 'form_factor')!.differs).toBe(false);
  });

  it('D-122: other categories and unknown products drop out; at most 4', async () => {
    const view = compareViewSchema.parse(
      (
        await get(
          '/compare?category=audio&p=echo-buds-2,pulse-4,nope,echo-max-2,echo-buds-1,echo-band-1,boom-2',
        )
      ).json(),
    );
    expect(view.products.map((p) => p.slug)).not.toContain('pulse-4');
    expect(view.products.length).toBeLessThanOrEqual(4);
    expect((await get('/compare?category=nope&p=a')).statusCode).toBe(404);
  });
});
