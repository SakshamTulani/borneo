import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, CheckIcon, RotateCcwIcon, SparklesIcon } from 'lucide-react';
import { toCatalogCard } from '@/features/catalog';
import { cn } from '@/shared/lib/utils';
import { Button, buttonVariants } from '@/shared/ui/base/button';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { ProductCard } from '@/shared/ui/commerce/ProductCard';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { ChoiceList } from '@/shared/ui/forms/ChoiceList';
import { Container } from '@/shared/ui/layout/Container';
import { useFinderQuery } from '../hooks/useFinderQuery';
import type { FinderSearch, FinderView } from '../model';

/** Matches shown before "Show more matches". */
const PAGE = 6;

function Question({
  question,
  onAnswer,
}: {
  question: FinderView['questions'][number];
  onAnswer: (value: string) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  if (!question.multi)
    return (
      <ChoiceList
        label={question.prompt}
        value={undefined}
        onChange={onAnswer}
        choices={question.options.map((o) => ({
          value: o.value,
          title: o.label,
          ...(o.detail ? { detail: o.detail } : {}),
        }))}
      />
    );
  return (
    <div className="space-y-4">
      <ul className="grid gap-2" aria-label={question.prompt}>
        {question.options.map((o) => {
          const on = picked.includes(o.value);
          return (
            <li key={o.value}>
              <label
                className={cn(
                  'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border bg-surface p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand',
                  on ? 'border-brand shadow-[inset_0_0_0_1px_var(--brand)]' : 'border-line',
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[var(--brand)]"
                  checked={on}
                  onChange={() =>
                    setPicked(on ? picked.filter((p) => p !== o.value) : [...picked, o.value])
                  }
                />
                <span>
                  <span className="block font-semibold">{o.label}</span>
                  {o.detail ? (
                    <span className="block text-sm text-ink-muted">{o.detail}</span>
                  ) : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <Button onClick={() => onAnswer(picked.join(','))}>
        {picked.length ? 'Continue' : 'None of these: continue'}
      </Button>
    </div>
  );
}

/**
 * Guided finder (D-13, D-225): one question at a time, answers in the URL, results with the facts
 * they were picked on. Nothing is chosen for the customer.
 */
export function FinderPage({
  id,
  answers,
  onAnswersChange,
}: {
  id: string;
  answers: FinderSearch;
  onAnswersChange: (next: FinderSearch) => void;
}) {
  const query = useFinderQuery(id, answers);
  const [shown, setShown] = useState(PAGE);
  const view = query.data;
  if (query.isError && !view)
    return (
      <Container className="py-10">
        <ErrorState title="Couldn't load the finder" onRetry={() => void query.refetch()} />
      </Container>
    );
  if (!view)
    return (
      <Container className="py-10">
        <Skeleton className="h-96 w-full" aria-label="Loading the finder" />
      </Container>
    );

  const step = view.questions.findIndex((q) => !(q.key in answers));
  const current = step === -1 ? null : view.questions[step]!;
  const answered = view.questions.filter((q) => q.key in answers);
  const labelOf = (key: string) => {
    const q = view.questions.find((x) => x.key === key)!;
    const values = (answers[key] ?? '').split(',').filter(Boolean);
    return values.length
      ? values.map((v) => q.options.find((o) => o.value === v)?.label ?? v).join(', ')
      : 'None';
  };
  const without = (key: string) => {
    const { [key]: _drop, ...rest } = answers;
    void _drop;
    return rest;
  };

  return (
    <Container className="max-w-4xl space-y-8 py-8 sm:py-10">
      <div className="space-y-2">
        <Link
          to="/categories/$slug"
          params={{ slug: view.category.slug }}
          className="inline-flex min-h-11 items-center gap-1 text-[15px] text-brand hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          All {view.category.name.toLowerCase()}
        </Link>
        <h1 className="flex items-center gap-3 font-heading text-title tracking-tight">
          <SparklesIcon className="size-7 text-brand" aria-hidden />
          {view.title}
        </h1>
        <p className="text-ink-muted">
          {view.questions.length} quick questions. We only use the specs we publish, never guesses.
        </p>
      </div>

      {answered.length ? (
        <ol className="flex flex-wrap gap-2" aria-label="Your answers">
          {answered.map((q) => (
            <li key={q.key}>
              <button
                type="button"
                onClick={() => onAnswersChange(without(q.key))}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-soft px-4 text-sm text-brand outline-none hover:bg-brand-soft/70 focus-visible:outline-2 focus-visible:outline-brand"
                aria-label={`${q.prompt} ${labelOf(q.key)}. Change`}
              >
                <CheckIcon className="size-4" aria-hidden />
                {labelOf(q.key)}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => onAnswersChange({})}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm text-ink-muted hover:text-ink"
            >
              <RotateCcwIcon className="size-4" aria-hidden />
              Start again
            </button>
          </li>
        </ol>
      ) : null}

      {current ? (
        <section aria-labelledby="question" className="space-y-4">
          <p className="text-sm text-ink-muted">
            Question {step + 1} of {view.questions.length}
          </p>
          <h2 id="question" className="font-heading text-tagline font-semibold">
            {current.prompt}
          </h2>
          <Question
            key={current.key}
            question={current}
            onAnswer={(value) => onAnswersChange({ ...answers, [current.key]: value })}
          />
        </section>
      ) : (
        <section aria-labelledby="results" className="space-y-5" aria-busy={query.isFetching}>
          <h2 id="results" className="font-heading text-tagline font-semibold">
            {view.results.length
              ? `${view.results.length} ${view.results.length === 1 ? 'match' : 'matches'}, best first`
              : 'Nothing fits all of that'}
          </h2>
          {view.results.length === 0 ? (
            <div className="space-y-3 rounded-xl bg-surface p-5">
              {view.relax ? (
                <>
                  <p>
                    Without “{view.relax.label}”, {view.relax.count}{' '}
                    {view.relax.count === 1 ? 'product fits' : 'products fit'}.
                  </p>
                  <Button
                    onClick={() => {
                      const values = (answers[view.relax!.question] ?? '')
                        .split(',')
                        .filter((v) => v !== view.relax!.option);
                      onAnswersChange({
                        ...answers,
                        [view.relax!.question]: values.join(',') || 'any',
                      });
                    }}
                  >
                    Drop “{view.relax.label}”
                  </Button>
                </>
              ) : (
                <p>Try fewer must-haves, or a different budget.</p>
              )}
            </div>
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {view.results.slice(0, shown).map(({ product, reasons }, i) => {
                  const { id: _id, slug, ...card } = toCatalogCard(product);
                  void _id;
                  return (
                    <li key={product.id} className="flex flex-col gap-2">
                      {i === 0 ? (
                        <p className="text-sm font-semibold text-brand">Best match</p>
                      ) : null}
                      <ProductCard
                        {...card}
                        link={{ to: '/products/$slug', params: { slug } }}
                        className="w-full flex-1"
                      />
                      <ul className="space-y-1 text-sm" aria-label={`Why ${product.name}`}>
                        {reasons.map((r) => (
                          <li key={r} className="flex gap-1.5">
                            <CheckIcon
                              className="mt-0.5 size-4 shrink-0 text-success"
                              aria-hidden
                            />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-3">
                {view.results.length > shown ? (
                  <Button variant="secondary" onClick={() => setShown(shown + PAGE)}>
                    Show more matches
                  </Button>
                ) : null}
                {view.results.length >= 2 ? (
                  <Link
                    to="/compare/$category"
                    params={{ category: view.category.slug }}
                    search={{
                      p: view.results
                        .slice(0, 3)
                        .map((r) => r.product.slug)
                        .join(','),
                    }}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    Compare the top {Math.min(3, view.results.length)}
                  </Link>
                ) : null}
              </div>
            </>
          )}
        </section>
      )}

      {view.explainers.length ? (
        <section aria-labelledby="explainers" className="space-y-4 rounded-xl bg-surface p-6">
          <h2 id="explainers" className="font-semibold">
            Good to know
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            {view.explainers.map((e) => (
              <div key={e.title}>
                <dt className="font-semibold">{e.title}</dt>
                <dd className="text-[15px] text-ink-muted">{e.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </Container>
  );
}
