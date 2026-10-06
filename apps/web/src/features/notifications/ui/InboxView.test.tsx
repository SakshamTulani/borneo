import { QueryClient } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { sentTo, stubApi } from '@/test/api';
import { renderWithRouter } from '@/test/router';
import { toInboxItem } from '../mappers/toInboxItem';
import { InboxPage } from './InboxPage';
import { InboxView } from './InboxView';

afterEach(() => vi.unstubAllGlobals());

const changed = {
  id: '00000000-0000-4000-8000-000000000002',
  kind: 'password_changed' as const,
  title: 'Your password was changed',
  body: 'Every device was signed out.',
  createdAt: '2026-10-06T07:00:00.000Z',
  readAt: null,
};
const requested = {
  ...changed,
  id: '00000000-0000-4000-8000-000000000001',
  kind: 'password_reset' as const,
  title: 'Reset your Borneo password',
  createdAt: '2026-10-06T06:50:00.000Z',
  readAt: '2026-10-06T06:55:00.000Z',
};

describe('InboxView', () => {
  it('D-101: newest first, unread marked and counted; axe clean', async () => {
    const onMarkRead = vi.fn();
    const { container } = render(
      <InboxView
        status="ready"
        items={[changed, requested].map(toInboxItem)}
        unread={1}
        onMarkRead={onMarkRead}
        onMarkAllRead={() => {}}
      />,
    );
    expect(screen.getByText('1 unread')).toBeTruthy();
    const [first, second] = screen.getAllByRole('article');
    expect(first!.textContent).toContain('Your password was changed');
    expect(first!.textContent).toContain('New');
    expect(first!.querySelector('time')!.getAttribute('dateTime')).toBe(changed.createdAt);
    expect(second!.textContent).not.toContain('New');
    await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(onMarkRead).toHaveBeenCalledWith(changed.id);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('empty, loading and error states; axe clean', async () => {
    const { container, rerender } = render(
      <InboxView
        status="ready"
        items={[]}
        unread={0}
        onMarkRead={() => {}}
        onMarkAllRead={() => {}}
      />,
    );
    expect(screen.getByText('No messages yet')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    rerender(<InboxView status="loading" />);
    expect(screen.getByLabelText('Loading messages')).toBeTruthy();
    const onRetry = vi.fn();
    rerender(<InboxView status="error" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('InboxPage', () => {
  it('marks everything read and refreshes', async () => {
    let read = false;
    const api = stubApi({
      'GET /me/notifications': () => [
        200,
        {
          items: [{ ...changed, readAt: read ? changed.createdAt : null }],
          nextCursor: null,
          unread: read ? 0 : 1,
        },
      ],
      'POST /me/notifications/read-all': () => {
        read = true;
        return [204];
      },
    });
    await renderWithRouter(<InboxPage />, {
      queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(screen.getByText('All read')).toBeTruthy());
    expect(sentTo(api, 'POST /me/notifications/read-all')).toHaveLength(1);
  });
});
