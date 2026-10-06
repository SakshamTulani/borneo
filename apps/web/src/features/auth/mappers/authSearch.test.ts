import { describe, expect, it } from 'vitest';
import { afterSignIn, parseAuthSearch } from './authSearch';

describe('auth search params', () => {
  it('keeps same-site redirects and a valid email only', () => {
    expect(
      parseAuthSearch({ redirect: '/account/addresses', email: 'A@Example.com', reset: 'true' }),
    ).toEqual({
      redirect: '/account/addresses',
      email: 'a@example.com',
      reset: true,
    });
    expect(parseAuthSearch({ redirect: 'https://evil.example', email: 'nope' })).toEqual({});
    expect(parseAuthSearch({ redirect: '//evil.example' })).toEqual({});
  });

  it('lands on the account after sign-in unless sent from elsewhere', () => {
    expect(afterSignIn({})).toBe('/account');
    expect(afterSignIn({ redirect: '/products/pulse-4' })).toBe('/products/pulse-4');
  });
});
