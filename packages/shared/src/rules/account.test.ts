import { describe, expect, it } from 'vitest';
import {
  passwordResetInputSchema,
  signInInputSchema,
  signUpInputSchema,
} from '../contracts/account';
import { normalizeIndianMobile, safeRedirectPath } from './account';

describe('account', () => {
  it('D-99: a mobile number is stored as 10 digits starting 6–9', () => {
    for (const typed of [
      '9876543210',
      '98765 43210',
      '+91 98765-43210',
      '919876543210',
      '09876543210',
    ]) {
      expect(normalizeIndianMobile(typed), typed).toBe('9876543210');
    }
    for (const bad of ['5876543210', '987654321', '98765432101', '+1 9876543210', 'abc']) {
      expect(normalizeIndianMobile(bad), bad).toBeNull();
    }
  });

  it('D-91: sign-up takes name, email, phone and password; email is trimmed and lowercased', () => {
    expect(
      signUpInputSchema.parse({
        name: ' Asha ',
        email: ' Asha@Example.COM ',
        phone: '+91 98765 43210',
        password: 'longenough',
      }),
    ).toEqual({
      name: 'Asha',
      email: 'asha@example.com',
      phone: '9876543210',
      password: 'longenough',
    });
  });

  it('D-97: passwords are 8 to 128 characters', () => {
    const base = { name: 'A', email: 'a@example.com', phone: '9876543210' };
    expect(signUpInputSchema.safeParse({ ...base, password: 'short12' }).success).toBe(false);
    expect(signUpInputSchema.safeParse({ ...base, password: 'x'.repeat(8) }).success).toBe(true);
    expect(signUpInputSchema.safeParse({ ...base, password: 'x'.repeat(129) }).success).toBe(false);
    // Sign-in never rejects on length: an old password is just checked.
    expect(signInInputSchema.safeParse({ email: 'a@example.com', password: 'short' }).success).toBe(
      true,
    );
  });

  it('D-98: a reset code is exactly 6 digits', () => {
    const base = { email: 'a@example.com', password: 'longenough' };
    expect(passwordResetInputSchema.safeParse({ ...base, code: ' 123456 ' }).success).toBe(true);
    expect(passwordResetInputSchema.safeParse({ ...base, code: '12345' }).success).toBe(false);
    expect(passwordResetInputSchema.safeParse({ ...base, code: '12345a' }).success).toBe(false);
  });

  it('redirects after sign-in stay on this site', () => {
    expect(safeRedirectPath('/account/addresses?x=1')).toBe('/account/addresses?x=1');
    for (const bad of [
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      '/\t/evil.example',
      '/\n/evil.example',
      '/%09/evil.example'.replace('%09', '\t'),
      'account',
      42,
    ]) {
      expect(safeRedirectPath(bad)).toBe('/account');
    }
    expect(safeRedirectPath(undefined, '/')).toBe('/');
  });
});
