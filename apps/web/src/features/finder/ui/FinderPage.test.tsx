import { QueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { FinderView } from '@borneo/shared';
import { stubApi } from '@/test/api';
import { summaryFixture } from '@/test/fixtures';
import { renderWithRouter } from '@/test/router';
import { FinderPage } from './FinderPage';

afterEach(() => vi.unstubAllGlobals());

const base: FinderView = {
  id: 'phones',
  title: 'Find your phone',
  category: { slug: 'smartphones', name: 'Smartphones' },
  questions: [
    {
      key: 'budget',
      prompt: 'What would you like to spend?',
      multi: false,
      options: [
        { value: 'under20', label: 'Under ₹20,000', detail: null },
        { value: 'any', label: 'No fixed budget', detail: null },
      ],
    },
    {
      key: 'needs',
      prompt: 'Anything it must have?',
      multi: true,
      options: [
        { value: '5g', label: '5G', detail: null },
        { value: 'nfc', label: 'Tap to pay (NFC)', detail: null },
      ],
    },
  ],
  answers: {},
  complete: false,
  results: [],
  relax: null,
  explainers: [{ title: 'Refresh rate', body: 'How often the screen redraws.' }],
};
const qc = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('FinderPage', () => {
  it('D-225: one question at a time, nothing chosen; an answer goes to the URL; axe clean', async () => {
    stubApi({ 'GET /finder/phones': [200, base] });
    const onChange = vi.fn();
    const { container } = await renderWithRouter(
      <FinderPage id="phones" answers={{}} onAnswersChange={onChange} />,
      { queryClient: qc() },
    );
    expect(await screen.findByText('Question 1 of 2')).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios.every((r) => r.getAttribute('aria-checked') === 'false')).toBe(true);
    expect(await axe(container)).toHaveNoViolations();
    await userEvent.click(screen.getByText('Under ₹20,000'));
    expect(onChange).toHaveBeenCalledWith({ budget: 'under20' });
  });

  it('D-225: a multi question accepts several answers or none', async () => {
    stubApi({ 'GET /finder/phones': [200, { ...base, answers: { budget: ['any'] } }] });
    const onChange = vi.fn();
    await renderWithRouter(
      <FinderPage id="phones" answers={{ budget: 'any' }} onAnswersChange={onChange} />,
      { queryClient: qc() },
    );
    await userEvent.click(await screen.findByRole('button', { name: 'None of these: continue' }));
    expect(onChange).toHaveBeenLastCalledWith({ budget: 'any', needs: '' });
    await userEvent.click(screen.getByLabelText(/5G/));
    await userEvent.click(screen.getByLabelText(/Tap to pay/));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onChange).toHaveBeenLastCalledWith({ budget: 'any', needs: '5g,nfc' });
  });

  it('D-22: results say why in facts, best first, and can be compared', async () => {
    const view: FinderView = {
      ...base,
      answers: { budget: ['any'], needs: ['5g'] },
      complete: true,
      results: [
        {
          product: summaryFixture({ id: 'a', slug: 'nova-3', name: 'Nova 3' }),
          reasons: ['5G: Yes'],
        },
        {
          product: summaryFixture({ id: 'b', slug: 'pulse-4', name: 'Pulse 4' }),
          reasons: ['5G: Yes'],
        },
      ],
    };
    stubApi({ 'GET /finder/phones': [200, view] });
    const { container } = await renderWithRouter(
      <FinderPage
        id="phones"
        answers={{ budget: 'any', needs: '5g' }}
        onAnswersChange={() => {}}
      />,
      { queryClient: qc() },
    );
    expect(await screen.findByText('2 matches, best first')).toBeTruthy();
    expect(screen.getByText('Best match')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Why Nova 3' }).textContent).toContain('5G: Yes');
    expect(screen.getByRole('link', { name: 'Compare the top 2' }).getAttribute('href')).toContain(
      'p=nova-3%2Cpulse-4',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-225: when nothing fits, offers to drop the answer that brings back the most', async () => {
    const view: FinderView = {
      ...base,
      answers: { budget: ['under20'], needs: ['nfc'] },
      complete: true,
      relax: { question: 'budget', option: 'under20', label: 'Under ₹20,000', count: 3 },
    };
    stubApi({ 'GET /finder/phones': [200, view] });
    const onChange = vi.fn();
    await renderWithRouter(
      <FinderPage
        id="phones"
        answers={{ budget: 'under20', needs: 'nfc' }}
        onAnswersChange={onChange}
      />,
      { queryClient: qc() },
    );
    expect(await screen.findByText('Without “Under ₹20,000”, 3 products fit.')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Drop “Under ₹20,000”' }));
    expect(onChange).toHaveBeenCalledWith({ budget: 'any', needs: 'nfc' });
  });
});
