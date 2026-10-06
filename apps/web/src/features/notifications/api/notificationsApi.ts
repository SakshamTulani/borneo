import { notificationPageSchema, type NotificationPage } from '@borneo/shared';
import { getJson, send } from '../../../shared/lib/http';

export function getNotifications(cursor?: string): Promise<NotificationPage> {
  const params = new URLSearchParams({ limit: '20', ...(cursor ? { cursor } : {}) });
  return getJson(`/me/notifications?${params.toString()}`, notificationPageSchema);
}

export const postRead = (id: string) => send('POST', `/me/notifications/${id}/read`);
export const postReadAll = () => send('POST', '/me/notifications/read-all');
