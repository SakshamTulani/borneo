import { toCustomerId } from '@borneo/shared';
import { describe, expect, it, vi } from 'vitest';
import { createDemoNotifier, createInboxOnlyNotifier, type OutboundMessage } from './index';

const message: OutboundMessage = {
  customerId: toCustomerId('c1'),
  email: 'asha@example.com',
  kind: 'password_reset',
  title: 'Reset your Borneo password',
  body: 'Someone asked to reset your password.',
  secret: { code: '123456', text: 'Your reset code is 123456.' },
};

const deps = () => ({
  saveToInbox: vi.fn(async () => {}),
  log: { info: vi.fn(), warn: vi.fn() },
});

describe('NotificationAdapter', () => {
  it('D-101: demo writes the inbox and log, and returns the on-screen message (D-95)', async () => {
    const d = deps();
    expect(await createDemoNotifier(d).send(message)).toEqual({
      to: 'asha@example.com',
      subject: 'Reset your Borneo password',
      body: 'Someone asked to reset your password.\n\nYour reset code is 123456.',
      code: '123456',
    });
    expect(d.saveToInbox).toHaveBeenCalledWith(message.customerId, {
      kind: 'password_reset',
      title: 'Reset your Borneo password',
      body: 'Someone asked to reset your password.',
    });
    expect(d.log.info).toHaveBeenCalledOnce();
  });

  it('D-98: the inbox and log never see the secret', async () => {
    const d = deps();
    await createDemoNotifier(d).send(message);
    expect(JSON.stringify([d.saveToInbox.mock.calls, d.log.info.mock.calls])).not.toContain(
      '123456',
    );
  });

  it('D-165: outside demo mode there is no on-screen message', async () => {
    const d = deps();
    expect(await createInboxOnlyNotifier(d).send(message)).toBeNull();
    expect(d.saveToInbox).toHaveBeenCalledOnce();
    expect(d.log.warn).toHaveBeenCalledOnce();
    expect(JSON.stringify(d.log.warn.mock.calls)).not.toContain('123456');
  });
});
