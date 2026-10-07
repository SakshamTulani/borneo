import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/base/button';
import { Label } from '@/shared/ui/base/label';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { TextField } from '@/shared/ui/forms/TextField';
import { useReviewForm } from '../hooks/useReviewForm';
import { useWriteReviewMutation } from '../hooks/useWriteReviewMutation';
import { StarInput } from './StarInput';

/** A verified review of a delivered item (D-150, D-221): rating required, words optional. */
export function ReviewForm({
  orderItemId,
  productName,
}: {
  orderItemId: string;
  productName: string;
}) {
  const form = useReviewForm();
  const mutation = useWriteReviewMutation();
  const rating = form.watch('rating');
  const submit = form.handleSubmit((values) => {
    if (!values.rating) return form.setError('rating', { message: 'Choose a rating' });
    mutation.mutate({
      orderItemId,
      rating: values.rating,
      ...(values.title.trim() ? { title: values.title.trim() } : {}),
      ...(values.body.trim() ? { body: values.body.trim() } : {}),
    });
  });
  const bodyId = `review-body-${orderItemId}`;
  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="space-y-4"
      noValidate
      aria-label={`Review ${productName}`}
    >
      <StarInput
        value={rating}
        onChange={(n) => {
          form.setValue('rating', n);
          form.clearErrors('rating');
        }}
        error={form.formState.errors.rating?.message}
      />
      <TextField label="Title" aside=" Optional" maxLength={80} {...form.register('title')} />
      <div className="space-y-2">
        <Label htmlFor={bodyId}>
          Your review <span className="font-normal text-ink-muted">Optional</span>
        </Label>
        <textarea
          id={bodyId}
          rows={4}
          maxLength={2000}
          placeholder="What do you use it for? What do you like, and what could be better?"
          className="w-full rounded-md border border-line bg-surface px-4 py-3 text-[15px] outline-none placeholder:text-ink-muted focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand"
          {...form.register('body')}
        />
      </div>
      {mutation.isError ? <FormAlert>{errorMessage(mutation.error)}</FormAlert> : null}
      <Button type="submit" loading={mutation.isPending}>
        Post review
      </Button>
    </form>
  );
}
