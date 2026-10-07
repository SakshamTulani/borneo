import { z } from 'zod';
import { AppError } from './errors';

/** Keyset cursor for "newest first" lists: the last row's time and id, opaque to clients. */
export function timeCursor(at: Date, id: string): string {
  return Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');
}

/** 400 INVALID_CURSOR when it isn't one of ours. */
export function readTimeCursor(cursor: string): { at: Date; id: string } {
  const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  const at = new Date(iso ?? '');
  if (!id || Number.isNaN(at.getTime()) || !z.uuid().safeParse(id).success)
    throw new AppError(400, 'INVALID_CURSOR', 'That page link is no longer valid.');
  return { at, id };
}
