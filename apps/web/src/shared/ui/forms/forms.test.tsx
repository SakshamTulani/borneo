import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { CheckboxField } from './CheckboxField';
import { ChoiceList } from './ChoiceList';
import { FormAlert } from './FormAlert';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';

describe('form fields', () => {
  it('TextField ties the hint, then the error, to the input', async () => {
    const { container, rerender } = render(
      <TextField label="Email" hint="We sign you in with it" />,
    );
    const input = screen.getByLabelText('Email');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(screen.getByText('We sign you in with it').id).toBe(
      input.getAttribute('aria-describedby'),
    );
    expect(await axe(container)).toHaveNoViolations();

    rerender(<TextField label="Email" hint="We sign you in with it" error="Enter a valid email" />);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Enter a valid email').id).toBe(input.getAttribute('aria-describedby'));
    expect(screen.queryByText('We sign you in with it')).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('PasswordField shows and hides the password', async () => {
    const { container } = render(<PasswordField label="Password" />);
    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(input.getAttribute('type')).toBe('password');
    await userEvent.click(toggle);
    expect(input.getAttribute('type')).toBe('text');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('CheckboxField is unticked unless the caller ticks it (D-06)', async () => {
    const { container } = render(
      <CheckboxField label="Make this my default" hint="Used first at checkout" />,
    );
    expect((screen.getByLabelText('Make this my default') as HTMLInputElement).checked).toBe(false);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('FormAlert is announced', async () => {
    const { container } = render(<FormAlert>Email or password is incorrect.</FormAlert>);
    expect(screen.getByRole('alert').textContent).toBe('Email or password is incorrect.');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ChoiceList starts with nothing chosen and reports the choice', async () => {
    let chosen: string | undefined;
    const { container } = render(
      <ChoiceList
        label="Kind"
        value={undefined}
        onChange={(v) => (chosen = v)}
        choices={[
          { value: 'a', title: 'Return' },
          { value: 'b', title: 'Replacement', disabled: true },
        ]}
      />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios.every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
    await userEvent.click(screen.getByText('Return'));
    expect(chosen).toBe('a');
    expect((radios[1] as HTMLButtonElement).disabled).toBe(true);
    expect(await axe(container)).toHaveNoViolations();
  });
});
