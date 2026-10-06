/** One inbox entry as shown (D-101). */
export type InboxItem = {
  id: string;
  title: string;
  body: string;
  /** "6 Oct 2026, 12:30 pm" (India time). */
  when: string;
  /** For `<time dateTime>`. */
  at: string;
  unread: boolean;
};

export type InboxPage = { items: InboxItem[]; unread: number; nextCursor: string | null };
