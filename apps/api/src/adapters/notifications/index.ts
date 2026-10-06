import type { CustomerId, DemoMessage, NotificationKind } from '@borneo/shared';

/** A message for one customer. `secret` goes only into the outbound message, never the inbox (D-98). */
export type OutboundMessage = {
  customerId: CustomerId;
  email: string;
  kind: NotificationKind;
  title: string;
  body: string;
  secret?: { code: string; text: string };
};

export type InboxEntry = Pick<OutboundMessage, 'kind' | 'title' | 'body'>;

/**
 * NotificationAdapter port (ADR-0003, D-101). Every message also lands in the account inbox.
 * `send` returns what would have been emailed when the on-screen demo box applies (DEMO_MODE),
 * otherwise null.
 */
export type NotificationAdapter = {
  send(message: OutboundMessage): Promise<DemoMessage | null>;
};

export type NotifierDeps = {
  saveToInbox: (customerId: CustomerId, entry: InboxEntry) => Promise<void>;
  log: { info(obj: object, msg: string): void; warn(obj: object, msg: string): void };
};

const inboxEntry = ({ kind, title, body }: OutboundMessage): InboxEntry => ({ kind, title, body });

/** Demo: nothing leaves the system (D-100). Inbox + log + the on-screen box (D-95, D-101). */
export function createDemoNotifier(deps: NotifierDeps): NotificationAdapter {
  return {
    async send(message) {
      await deps.saveToInbox(message.customerId, inboxEntry(message));
      deps.log.info({ kind: message.kind, customerId: message.customerId }, 'demo notification');
      return {
        to: message.email,
        subject: message.title,
        body: message.secret ? `${message.body}\n\n${message.secret.text}` : message.body,
        ...(message.secret ? { code: message.secret.code } : {}),
      };
    },
  };
}

/**
 * Outside demo mode until a real email provider exists (production blocker D-104): the inbox
 * and log only. Secrets are dropped, so password reset cannot complete without a provider.
 */
export function createInboxOnlyNotifier(deps: NotifierDeps): NotificationAdapter {
  return {
    async send(message) {
      await deps.saveToInbox(message.customerId, inboxEntry(message));
      deps.log.warn(
        { kind: message.kind, customerId: message.customerId },
        'no email provider configured (D-104): message not emailed',
      );
      return null;
    },
  };
}
