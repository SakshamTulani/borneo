import { describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { appDeps } from '../../services';
import { TEST_ORIGIN } from '../../test/app';
import { TEST_NOW, useTestDb } from '../../test/db';
import {
  headerSession,
  insertSellable,
  insertShopper,
  placeViaApi,
  putInCart,
} from '../../test/factories';

const db = useTestDb('orders');

describe('order analytics', () => {
  it('D-236: each placed order is one event: amounts and flags, never who', async () => {
    const lines: { analytics?: { name: string; props: Record<string, unknown> } }[] = [];
    const deps = appDeps(db, {
      demoMode: true,
      auth: { secret: 'test-auth-secret-at-least-32-characters', baseURL: `${TEST_ORIGIN}/api` },
      webOrigin: TEST_ORIGIN,
      now: () => TEST_NOW.getTime(),
      log: { info: (obj) => void lines.push(obj as never), warn: () => {} },
    });
    const app = buildApp({ ...deps, session: headerSession });
    const item = await insertSellable(db, { stock: { blr: 5 } });
    const shopper = await insertShopper(db);
    for (let i = 0; i < 2; i++) {
      await putInCart(db, shopper.customerId, item.key);
      await placeViaApi(app, shopper, 'cod');
    }
    const events = lines.flatMap((l) =>
      l.analytics?.name === 'order_placed' ? [l.analytics] : [],
    );
    expect(events.map((e) => e.props.firstOrder)).toEqual([true, false]);
    expect(events[0]!.props).toMatchObject({
      method: 'cod',
      items: 1,
      preorder: false,
      flash: false,
    });
    const text = JSON.stringify(events);
    expect(text).not.toContain(shopper.customerId);
    expect(text).not.toContain('Asha');
  });
});
