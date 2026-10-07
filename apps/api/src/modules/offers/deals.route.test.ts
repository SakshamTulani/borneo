import { dealsViewSchema } from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';

const db = useTestDb();

describe('GET /deals', () => {
  it('D-231: the seeded live sale shows with its real end; the upcoming one with its start', async () => {
    const app = testApp(db);
    const view = dealsViewSchema.parse((await app.inject({ method: 'GET', url: '/deals' })).json());
    expect(view.live.length).toBeGreaterThan(0);
    for (const d of view.live) {
      expect(d.endsAt).toBeGreaterThan(TEST_NOW.getTime());
      expect(d.salePricePaise).toBeLessThan(d.regularPricePaise);
      if (d.remaining !== null) expect(d.remaining).toBeLessThanOrEqual(5);
    }
    for (const d of view.upcoming) expect(d.startsAt).toBeGreaterThan(TEST_NOW.getTime());
  });

  it('D-140: once every sale has ended, nothing shows', async () => {
    const later = testApp(db, { now: () => TEST_NOW.getTime() + 60 * 86_400_000 });
    const view = dealsViewSchema.parse(
      (await later.inject({ method: 'GET', url: '/deals' })).json(),
    );
    expect(view).toEqual({ live: [], upcoming: [] });
  });
});
