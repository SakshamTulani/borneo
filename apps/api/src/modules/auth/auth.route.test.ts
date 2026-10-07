import { randomUUID } from 'node:crypto';
import {
  authResponseSchema,
  notificationPageSchema,
  passwordResetRequestResponseSchema,
  sessionResponseSchema,
} from '@borneo/shared';
import { describe, expect, it } from 'vitest';
import { testApp } from '../../test/app';
import { useTestDb } from '../../test/db';

const db = useTestDb();
const demo = testApp(db, { demoMode: true });
const live = testApp(db, { demoMode: false });
type App = typeof demo;

const newEmail = () => `asha-${randomUUID()}@example.com`;
const password = 'correct horse';

/** The session cookie pair ("name=value") from Set-Cookie headers. */
function cookieFrom(setCookie: string | string[] | undefined): string {
  const all = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  return all.map((c) => c.split(';')[0]).join('; ');
}

let clients = 0;
async function signUp(app: App, email = newEmail()) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/sign-up',
    // A distinct client per sign-up, so tests don't share the per-IP limit (D-190).
    headers: { 'x-forwarded-for': `10.0.${++clients >> 8}.${clients & 255}` },
    payload: { name: 'Asha Rao', email, phone: '+91 98765 43210', password },
  });
  return { res, email, cookie: cookieFrom(res.headers['set-cookie']) };
}

const signIn = (app: App, email: string, pw = password) =>
  app.inject({ method: 'POST', url: '/auth/sign-in', payload: { email, password: pw } });

async function session(app: App, cookie: string) {
  const res = await app.inject({ method: 'GET', url: '/session', headers: { cookie } });
  expect(res.statusCode).toBe(200);
  return sessionResponseSchema.parse(res.json()).customer;
}

describe('sign up, sign in, sign out', () => {
  it('D-91: sign-up creates the account, saves the phone and signs in', async () => {
    const { res, email, cookie } = await signUp(demo);
    expect(res.statusCode).toBe(201);
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^borneo\.session_token=.+HttpOnly; SameSite=Lax/),
      ]),
    );
    expect(authResponseSchema.parse(res.json()).customer).toMatchObject({
      name: 'Asha Rao',
      email,
      phone: '9876543210',
    });
    expect(await session(demo, cookie)).toMatchObject({ email, phone: '9876543210' });
  });

  it('D-93: email is not verified in demo', async () => {
    const { res } = await signUp(demo);
    expect(authResponseSchema.parse(res.json()).customer.emailVerified).toBe(false);
  });

  it('D-91: email is the identifier; a second account with it is refused', async () => {
    const { email } = await signUp(demo);
    const again = await signUp(demo, email.toUpperCase());
    expect(again.res.statusCode).toBe(409);
    expect(again.res.json().error.code).toBe('EMAIL_TAKEN');
  });

  it('D-91: signs in with email + password; a wrong password or unknown email is 401', async () => {
    const { email } = await signUp(demo);
    const ok = await signIn(demo, ` ${email.toUpperCase()} `);
    expect(ok.statusCode).toBe(200);
    expect(await session(demo, cookieFrom(ok.headers['set-cookie']))).toMatchObject({ email });

    for (const res of [
      await signIn(demo, email, 'wrong password'),
      await signIn(demo, newEmail()),
    ]) {
      expect(res.statusCode).toBe(401);
      expect(res.json().error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
    }
  });

  it('D-97: sign-up refuses a short password and a bad phone', async () => {
    const res = await demo.inject({
      method: 'POST',
      url: '/auth/sign-up',
      payload: { name: 'A', email: newEmail(), phone: '12345', password: 'short' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION');
  });

  it('D-97: the session cookie lasts 7 days', async () => {
    const { res } = await signUp(demo);
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/^borneo\.session_token=.+Max-Age=604800/)]),
    );
  });

  it('signing out without a session still answers 204 and clears the cookie', async () => {
    for (const headers of [{}, { cookie: 'borneo.session_token=forged.value' }]) {
      const out = await demo.inject({ method: 'POST', url: '/auth/sign-out', headers });
      expect(out.statusCode).toBe(204);
      expect(out.headers['set-cookie']).toEqual(
        expect.arrayContaining([expect.stringMatching(/^borneo\.session_token=;/)]),
      );
    }
  });

  it('signing out ends the session', async () => {
    const { cookie } = await signUp(demo);
    const out = await demo.inject({ method: 'POST', url: '/auth/sign-out', headers: { cookie } });
    expect(out.statusCode).toBe(204);
    expect(out.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringMatching(/^borneo\.session_token=;/)]),
    );
    expect(await session(demo, cookie)).toBeNull();
  });

  it('no or a forged cookie is simply signed out', async () => {
    expect(await session(demo, '')).toBeNull();
    expect(await session(demo, 'borneo.session_token=forged.value')).toBeNull();
  });
});

async function requestReset(app: App, email: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/auth/password-reset/request',
    payload: { email },
  });
  expect(res.statusCode).toBe(202);
  return passwordResetRequestResponseSchema.parse(res.json());
}

const reset = (app: App, email: string, code: string, pw = 'a new password') =>
  app.inject({
    method: 'POST',
    url: '/auth/password-reset',
    payload: { email, code, password: pw },
  });

describe('password reset', () => {
  it('D-95: in demo the code is shown on screen, and resets the password', async () => {
    const { email, cookie } = await signUp(demo);
    const { demo: box } = await requestReset(demo, email);
    expect(box).toMatchObject({ to: email, subject: 'Reset your Borneo password' });
    expect(box!.code).toMatch(/^[0-9]{6}$/);
    expect(box!.body).toContain(box!.code);

    expect((await reset(demo, email, box!.code!)).statusCode).toBe(204);
    expect((await signIn(demo, email)).statusCode).toBe(401);
    expect((await signIn(demo, email, 'a new password')).statusCode).toBe(200);
    // D-98: every device is signed out.
    expect(await session(demo, cookie)).toBeNull();
  });

  it('D-165: the on-screen box never appears outside demo mode', async () => {
    const { email } = await signUp(live);
    expect(await requestReset(live, email)).toEqual({});
  });

  it('D-98: outside demo mode the answer is the same whether or not an account uses the email', async () => {
    const { email } = await signUp(live);
    expect(await requestReset(live, email)).toEqual(await requestReset(live, newEmail()));
  });

  it('D-95: in demo mode only a real account gets the on-screen box (accepted demo exception to D-98)', async () => {
    expect(await requestReset(demo, newEmail())).toEqual({});
  });

  it('D-98: a wrong code is refused, and 3 wrong tries kill the code', async () => {
    const { email } = await signUp(demo);
    const { demo: box } = await requestReset(demo, email);
    const wrong = box!.code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 3; i++) {
      const res = await reset(demo, email, wrong);
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_CODE');
    }
    expect((await reset(demo, email, box!.code!)).statusCode).toBe(400);
    expect((await signIn(demo, email)).statusCode).toBe(200);
  });

  it('D-98: a new request replaces the earlier code', async () => {
    const { email } = await signUp(demo);
    const first = (await requestReset(demo, email)).demo!.code!;
    const second = (await requestReset(demo, email)).demo!.code!;
    if (first !== second) expect((await reset(demo, email, first)).statusCode).toBe(400);
    expect((await reset(demo, email, second)).statusCode).toBe(204);
  });

  it('D-101: the inbox records the request and the change, never the code (D-98)', async () => {
    const { email } = await signUp(demo);
    const code = (await requestReset(demo, email)).demo!.code!;
    await reset(demo, email, code);
    const cookie = cookieFrom((await signIn(demo, email, 'a new password')).headers['set-cookie']);

    const res = await demo.inject({ method: 'GET', url: '/me/notifications', headers: { cookie } });
    const page = notificationPageSchema.parse(res.json());
    expect(page.items.map((n) => n.kind)).toEqual(['password_changed', 'password_reset']);
    expect(page.unread).toBe(2);
    expect(JSON.stringify(page)).not.toContain(code);
  });
});

describe('rate limits', () => {
  it('D-190: the 11th sign-in for one email within 15 minutes is refused', async () => {
    const app = testApp(db);
    const email = newEmail();
    for (let i = 0; i < 10; i++) expect((await signIn(app, email, 'nope')).statusCode).toBe(401);
    const res = await signIn(app, email, 'nope');
    expect(res.statusCode).toBe(429);
    expect(res.json().error.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('D-190: at most 3 reset codes per email per 15 minutes', async () => {
    const app = testApp(db, { demoMode: true });
    const { email } = await signUp(app);
    for (let i = 0; i < 3; i++) await requestReset(app, email);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/password-reset/request',
      payload: { email },
    });
    expect(res.statusCode).toBe(429);
  });

  it('D-190: sign-up allows 10 per IP per hour; another IP has its own budget', async () => {
    const app = testApp(db);
    const from = (ip: string) =>
      app.inject({
        method: 'POST',
        url: '/auth/sign-up',
        headers: { 'x-forwarded-for': ip },
        payload: { name: 'A', email: newEmail(), phone: '9876543210', password },
      });
    for (let i = 0; i < 10; i++) expect((await from('203.0.113.7')).statusCode).toBe(201);
    expect((await from('203.0.113.7')).statusCode).toBe(429);
    expect((await from('198.51.100.9')).statusCode).toBe(201);
  });

  it('D-190: at most 10 reset attempts per email and IP per 15 minutes', async () => {
    const app = testApp(db);
    const email = newEmail();
    for (let i = 0; i < 10; i++) expect((await reset(app, email, '000000')).statusCode).toBe(400);
    expect((await reset(app, email, '000000')).statusCode).toBe(429);
  });

  it('D-190: sign-in limits are per client IP behind the web proxy', async () => {
    const app = testApp(db);
    const email = newEmail();
    const from = (ip: string) =>
      app.inject({
        method: 'POST',
        url: '/auth/sign-in',
        headers: { 'x-forwarded-for': ip },
        payload: { email, password: 'nope' },
      });
    for (let i = 0; i < 10; i++) await from('203.0.113.7');
    expect((await from('203.0.113.7')).statusCode).toBe(429);
    // The owner, from their own IP, is not locked out by someone else's attempts.
    expect((await from('198.51.100.9')).statusCode).toBe(401);
  });
});

describe('profile and password', () => {
  it('D-223: needs a session', async () => {
    const profile = await demo.inject({
      method: 'PATCH',
      url: '/me/profile',
      payload: { name: 'Asha R', phone: '9876543210' },
    });
    expect(profile.statusCode).toBe(401);
    const pw = await demo.inject({
      method: 'POST',
      url: '/me/password',
      payload: { currentPassword: password, newPassword: 'another password' },
    });
    expect(pw.statusCode).toBe(401);
  });

  it('D-223: the customer changes their name and mobile (D-99); the email stays', async () => {
    const { email, cookie } = await signUp(demo);
    const res = await demo.inject({
      method: 'PATCH',
      url: '/me/profile',
      headers: { cookie },
      payload: { name: 'Asha Rao Iyer', phone: '+91 91234 56789', email: 'new@example.com' },
    });
    expect(res.statusCode).toBe(200);
    expect(authResponseSchema.parse(res.json()).customer).toMatchObject({
      name: 'Asha Rao Iyer',
      phone: '9123456789',
      email,
    });
    expect(await session(demo, cookie)).toMatchObject({
      name: 'Asha Rao Iyer',
      phone: '9123456789',
      email,
    });
  });

  it('D-99: a bad mobile is refused', async () => {
    const { cookie } = await signUp(demo);
    const res = await demo.inject({
      method: 'PATCH',
      url: '/me/profile',
      headers: { cookie },
      payload: { name: 'Asha Rao', phone: '12345' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('D-223: a wrong current password is 400 WRONG_PASSWORD and nothing changes', async () => {
    const { email, cookie } = await signUp(demo);
    const res = await demo.inject({
      method: 'POST',
      url: '/me/password',
      headers: { cookie },
      payload: { currentPassword: 'not my password', newPassword: 'another password' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('WRONG_PASSWORD');
    expect((await signIn(demo, email)).statusCode).toBe(200);
  });

  it('D-223: changing the password keeps this device signed in and signs out the others', async () => {
    const { email, cookie: other } = await signUp(demo);
    const here = cookieFrom((await signIn(demo, email)).headers['set-cookie']);
    const res = await demo.inject({
      method: 'POST',
      url: '/me/password',
      headers: { cookie: here },
      payload: { currentPassword: password, newPassword: 'another password' },
    });
    expect(res.statusCode).toBe(200);
    expect(authResponseSchema.parse(res.json()).customer.email).toBe(email);
    const fresh = cookieFrom(res.headers['set-cookie']);
    expect(fresh).toMatch(/borneo\.session_token=/);
    expect(await session(demo, fresh)).toMatchObject({ email });
    expect(await session(demo, other)).toBeNull();
    expect((await signIn(demo, email)).statusCode).toBe(401);
    expect((await signIn(demo, email, 'another password')).statusCode).toBe(200);
    const inbox = await demo.inject({
      method: 'GET',
      url: '/me/notifications',
      headers: { cookie: fresh },
    });
    expect(notificationPageSchema.parse(inbox.json()).items.map((n) => n.kind)).toContain(
      'password_changed',
    );
  });

  it('D-97: a new password shorter than 8 characters is refused', async () => {
    const { cookie } = await signUp(demo);
    const res = await demo.inject({
      method: 'POST',
      url: '/me/password',
      headers: { cookie },
      payload: { currentPassword: password, newPassword: 'short' },
    });
    expect(res.statusCode).toBe(400);
  });
});
