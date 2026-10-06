import { toCustomerId, type DemoMessage } from '@borneo/shared';
import { describe, expect, it, vi } from 'vitest';
import type { OutboundMessage } from '../../adapters/notifications/index';
import { emptyIdentity } from '../../test/factories';
import { createAuthService } from './auth.service';

const customerId = toCustomerId('c1');

function service(identity = emptyIdentity(), shown: DemoMessage | null = null) {
  const send = vi.fn(async (_m: OutboundMessage) => shown);
  return { auth: createAuthService({ identity, notifications: { send } }), send };
}

describe('auth service', () => {
  it('D-95: a reset code goes out through the NotificationAdapter as a secret', async () => {
    const box = { to: 'a@example.com', subject: 's', body: 'b', code: '123456' };
    const { auth, send } = service(
      emptyIdentity({
        issueResetCode: async () => ({ customerId, email: 'a@example.com', code: '123456' }),
      }),
      box,
    );
    expect(await auth.requestPasswordReset('a@example.com')).toEqual({ demo: box });
    const sent = send.mock.calls[0]![0];
    expect(sent).toMatchObject({ customerId, kind: 'password_reset', secret: { code: '123456' } });
    expect(sent.secret!.text).toBe('Your reset code is 123456. It expires in 10 minutes.');
    expect(sent.body).not.toContain('123456');
  });

  it('D-165: no on-screen box when the adapter shows none', async () => {
    const { auth } = service(
      emptyIdentity({
        issueResetCode: async () => ({ customerId, email: 'a@example.com', code: '123456' }),
      }),
    );
    expect(await auth.requestPasswordReset('a@example.com')).toEqual({});
  });

  it('sends nothing when no account uses the email', async () => {
    const { auth, send } = service();
    expect(await auth.requestPasswordReset('nobody@example.com')).toEqual({});
    expect(send).not.toHaveBeenCalled();
  });

  it('D-98: a completed reset tells the customer their password changed', async () => {
    const { auth, send } = service(
      emptyIdentity({ resetPassword: async () => ({ customerId, email: 'a@example.com' }) }),
    );
    await auth.resetPassword({ email: 'a@example.com', code: '123456', password: 'new password' });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ customerId, kind: 'password_changed' }),
    );
    expect(send.mock.calls[0]![0].secret).toBeUndefined();
  });
});
