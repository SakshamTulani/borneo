import { queryOptions } from '@tanstack/react-query';
import type { PasswordChangeInput, ProfileInput } from '@borneo/shared';
import { getDevices, getSummary, patchProfile, postPassword } from '../api/accountApi';

/** Counts for the overview (D-223). Under `['me']`. */
export const summaryQuery = queryOptions({ queryKey: ['me', 'summary'], queryFn: getSummary });

/** Owned devices with compatible add-ons (D-24, D-220). */
export const devicesQuery = queryOptions({ queryKey: ['me', 'devices'], queryFn: getDevices });

export const updateProfile = async (input: ProfileInput) => (await patchProfile(input)).customer;
export const changePassword = async (input: PasswordChangeInput) =>
  (await postPassword(input)).customer;
