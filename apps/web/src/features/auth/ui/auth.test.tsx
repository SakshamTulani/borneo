import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { apiError, customer, sentTo, stubApi } from '@/test/api';
import { renderWithRouter } from '@/test/router';
import { sessionQuery } from '../repository/authRepository';
import { AccountLink } from './AccountLink';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { SignInPage } from './SignInPage';
import { SignUpPage } from './SignUpPage';

afterEach(() => vi.unstubAllGlobals());

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('SignInPage', () => {
  it('checks the fields before calling the API; axe clean', async () => {
    const api = stubApi({});
    const { container } = await renderWithRouter(<SignInPage onSignedIn={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy();
    expect(screen.getByText('Enter your password')).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-91: a wrong password shows the API message', async () => {
    stubApi({
      'POST /auth/sign-in': apiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.'),
    });
    const onSignedIn = vi.fn();
    const { container } = await renderWithRouter(<SignInPage onSignedIn={onSignedIn} />);
    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Email or password is incorrect.');
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-91: signs in, stores the session and hands over', async () => {
    const api = stubApi({ 'POST /auth/sign-in': [200, { customer }] });
    const queryClient = client();
    const onSignedIn = vi.fn();
    await renderWithRouter(<SignInPage email="asha@example.com" onSignedIn={onSignedIn} />, {
      queryClient,
    });
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
    expect(sentTo(api, 'POST /auth/sign-in')).toEqual([
      { email: 'asha@example.com', password: 'correct horse' },
    ]);
    expect(queryClient.getQueryData(sessionQuery.queryKey)).toEqual(customer);
  });

  it('confirms a password reset', async () => {
    stubApi({});
    await renderWithRouter(<SignInPage passwordReset onSignedIn={() => {}} />);
    expect(screen.getByRole('status').textContent).toContain('Password changed');
  });
});

describe('SignUpPage', () => {
  const fill = async (password = 'correct horse') => {
    await userEvent.type(screen.getByLabelText('Full name'), 'Asha Rao');
    await userEvent.type(screen.getByLabelText('Email'), 'Asha@Example.com');
    await userEvent.type(screen.getByLabelText('Mobile number'), '+91 98765 43210');
    await userEvent.type(screen.getByLabelText('Password'), password);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  };

  it('D-91, D-99: sends name, email, a 10-digit mobile and password', async () => {
    const api = stubApi({ 'POST /auth/sign-up': [201, { customer }] });
    const onSignedUp = vi.fn();
    const { container } = await renderWithRouter(<SignUpPage onSignedUp={onSignedUp} />);
    expect(await axe(container)).toHaveNoViolations();
    await fill();
    await waitFor(() => expect(onSignedUp).toHaveBeenCalled());
    expect(sentTo(api, 'POST /auth/sign-up')).toEqual([
      {
        name: 'Asha Rao',
        email: 'asha@example.com',
        phone: '9876543210',
        password: 'correct horse',
      },
    ]);
  });

  it('D-97: a short password is refused before sending', async () => {
    const api = stubApi({});
    await renderWithRouter(<SignUpPage onSignedUp={() => {}} />);
    await fill('short');
    expect(await screen.findByText('Use at least 8 characters')).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
  });

  it('a taken email offers sign-in with that email', async () => {
    stubApi({
      'POST /auth/sign-up': apiError(
        409,
        'EMAIL_TAKEN',
        'An account already uses this email. Sign in instead.',
      ),
    });
    const { container } = await renderWithRouter(<SignUpPage onSignedUp={() => {}} />);
    await fill();
    expect((await screen.findByRole('alert')).textContent).toContain(
      'An account already uses this email.',
    );
    expect(
      screen.getAllByRole('link', { name: 'Sign in' }).map((a) => a.getAttribute('href')),
    ).toContain('/sign-in?email=asha%40example.com');
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('ForgotPasswordPage', () => {
  const demo = {
    to: 'asha@example.com',
    subject: 'Reset your Borneo password',
    body: 'Someone asked to reset your password.\n\nYour reset code is 482913. It expires in 10 minutes.',
    code: '482913',
  };

  const request = async () => {
    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }));
    await screen.findByRole('heading', { name: 'Check your email' });
  };

  it('D-95: in demo mode the code shows on screen and fills the field; axe clean', async () => {
    const api = stubApi({
      'POST /auth/password-reset/request': [202, { demo }],
      'POST /auth/password-reset': [204],
    });
    const onReset = vi.fn();
    const queryClient = client();
    queryClient.setQueryData(sessionQuery.queryKey, customer);
    const { container } = await renderWithRouter(<ForgotPasswordPage onReset={onReset} />, {
      queryClient,
    });
    await request();
    const box = screen.getByRole('note', { name: 'Demo mode: this would be emailed' });
    expect(box.textContent).toContain('482913');
    expect(box.textContent).toContain('Reset your Borneo password');
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(screen.getByRole('button', { name: 'Use this code' }));
    expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe('482913');
    await userEvent.type(screen.getByLabelText('New password'), 'a new password');
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }));
    await waitFor(() => expect(onReset).toHaveBeenCalledWith('asha@example.com'));
    // D-97: the reset signed out every device, this browser too.
    expect(queryClient.getQueryData(sessionQuery.queryKey)).toBeNull();
    expect(sentTo(api, 'POST /auth/password-reset')).toEqual([
      { email: 'asha@example.com', code: '482913', password: 'a new password' },
    ]);
  });

  it('D-165: without demo mode there is no on-screen box', async () => {
    stubApi({ 'POST /auth/password-reset/request': [202, {}] });
    await renderWithRouter(<ForgotPasswordPage onReset={() => {}} />);
    await request();
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.getByText(/If an account uses/).textContent).toContain('asha@example.com');
  });

  it('D-98: a wrong code shows why', async () => {
    stubApi({
      'POST /auth/password-reset/request': [202, {}],
      'POST /auth/password-reset': apiError(
        400,
        'INVALID_CODE',
        'That code is wrong or has expired. Ask for a new one.',
      ),
    });
    await renderWithRouter(<ForgotPasswordPage onReset={() => {}} />);
    await request();
    await userEvent.type(screen.getByLabelText('Code'), '000000');
    await userEvent.type(screen.getByLabelText('New password'), 'a new password');
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }));
    expect((await screen.findByRole('alert')).textContent).toContain('That code is wrong');
  });
});

describe('AccountLink', () => {
  it('signed out: "Sign in"; signed in: the first name, to the account', async () => {
    stubApi({ 'GET /session': [200, { customer: null }] });
    const { unmount } = await renderWithRouter(<AccountLink />);
    expect((await screen.findByRole('link', { name: 'Sign in' })).getAttribute('href')).toBe(
      '/sign-in',
    );
    unmount();

    const queryClient = client();
    queryClient.setQueryData(sessionQuery.queryKey, customer);
    const { container } = await renderWithRouter(<AccountLink />, { queryClient });
    const link = screen.getByRole('link', { name: 'Your account (Asha Rao)' });
    expect(link.getAttribute('href')).toBe('/account');
    expect(link.textContent).toBe('Asha');
    expect(await axe(container)).toHaveNoViolations();
  });
});
