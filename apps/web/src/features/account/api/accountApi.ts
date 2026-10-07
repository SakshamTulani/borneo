import {
  accountSummarySchema,
  authResponseSchema,
  ownedDevicesSchema,
  type AccountSummary,
  type AuthResponse,
  type OwnedDevice,
  type PasswordChangeInput,
  type ProfileInput,
} from '@borneo/shared';
import { getJson, sendJson } from '../../../shared/lib/http';

export const getSummary = (): Promise<AccountSummary> =>
  getJson('/me/summary', accountSummarySchema);

export const getDevices = (): Promise<{ items: OwnedDevice[] }> =>
  getJson('/me/devices', ownedDevicesSchema);

export const patchProfile = (input: ProfileInput): Promise<AuthResponse> =>
  sendJson('PATCH', '/me/profile', input, authResponseSchema);

export const postPassword = (input: PasswordChangeInput): Promise<AuthResponse> =>
  sendJson('POST', '/me/password', input, authResponseSchema);
