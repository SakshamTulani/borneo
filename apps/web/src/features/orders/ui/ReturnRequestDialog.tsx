import { useState, type ChangeEvent } from 'react';
import { ImagePlusIcon, XIcon } from 'lucide-react';
import {
  RETURN_PHOTO_MAX,
  RETURN_PHOTO_MAX_BYTES,
  photosRequired,
  RETURN_REASONS,
  type ReturnReason,
} from '@borneo/shared';
import { errorMessage } from '@/shared/lib/errors';
import { Button } from '@/shared/ui/base/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/base/dialog';
import { Label } from '@/shared/ui/base/label';
import { ChoiceList } from '@/shared/ui/forms/ChoiceList';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { useRequestReturnMutation } from '../hooks/useRequestReturnMutation';
import { useReturnForm } from '../hooks/useReturnForm';
import { kindLabel } from '../mappers/orderText';
import type { OrderItem } from '../model';
import { fileToBase64 } from '../repository/ordersRepository';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const needsPhotos = (reason: ReturnReason | '') => reason !== '' && photosRequired(reason);

/**
 * Return or replacement for one delivered line (D-86, D-217): only the kinds and reasons its
 * policy allows; defect or damage needs 1–3 photos (D-88). Nothing is chosen for the customer.
 */
export function ReturnRequestDialog({ orderId, item }: { orderId: string; item: OrderItem }) {
  const [open, setOpen] = useState(false);
  const options = item.returnOptions;
  // One kind allowed: that's the only choice. Both: nothing chosen for the customer (D-06).
  const form = useReturnForm({
    kind: options.length === 1 ? options[0]!.kind : '',
    reason: '',
    details: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string>();
  const mutation = useRequestReturnMutation();
  const kind = form.watch('kind');
  const reason = form.watch('reason');
  const reasons = options.find((o) => o.kind === kind)?.reasons ?? [];

  const addPhotos = (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    const next = [...photos, ...files];
    if (next.length > RETURN_PHOTO_MAX)
      return setPhotoError(`Add at most ${RETURN_PHOTO_MAX} photos.`);
    if (files.some((f) => f.size > RETURN_PHOTO_MAX_BYTES))
      return setPhotoError('Each photo must be 2 MB or smaller.');
    setPhotoError(undefined);
    setPhotos(next);
  };

  const submit = form.handleSubmit(async (values) => {
    if (!values.kind) return form.setError('kind', { message: 'Choose return or replacement' });
    if (!values.reason) return form.setError('reason', { message: 'Choose a reason' });
    if (needsPhotos(values.reason) && photos.length === 0)
      return setPhotoError('Add at least one photo showing the defect or damage.');
    const encoded = await Promise.all(photos.map(fileToBase64));
    mutation.mutate(
      {
        orderId,
        itemId: item.id,
        input: {
          kind: values.kind,
          reason: values.reason,
          ...(values.details.trim() ? { details: values.details.trim() } : {}),
          photos: needsPhotos(values.reason) ? encoded : [],
        },
      },
      { onSuccess: () => setOpen(false) },
    );
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {options.some((o) => o.kind === 'return') ? 'Return or replace' : 'Ask for a replacement'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{item.name}</DialogTitle>
        <DialogDescription>
          Tell us what happened. The whole line ({item.qty} × {item.name}) is covered by one
          request.
        </DialogDescription>
        <form onSubmit={(e) => void submit(e)} className="space-y-5" noValidate>
          {options.length > 1 ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">What would you like?</legend>
              <ChoiceList
                label="What would you like?"
                value={kind || undefined}
                onChange={(v) => {
                  form.setValue('kind', v as 'return' | 'replacement');
                  form.clearErrors('kind');
                  form.setValue('reason', '');
                }}
                choices={options.map((o) => ({
                  value: o.kind,
                  title: kindLabel(o.kind),
                  detail:
                    o.kind === 'return'
                      ? 'Send it back for a refund to your original payment method.'
                      : 'We swap it for the same item.',
                }))}
              />
              {form.formState.errors.kind ? (
                <p className="text-sm text-danger">{form.formState.errors.kind.message}</p>
              ) : null}
            </fieldset>
          ) : null}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Reason</legend>
            <ChoiceList
              label="Reason"
              value={reason || undefined}
              onChange={(v) => {
                form.setValue('reason', v as ReturnReason);
                form.clearErrors('reason');
                setPhotoError(undefined);
              }}
              choices={reasons.map((r) => ({
                value: r,
                title: RETURN_REASONS[r],
                ...(needsPhotos(r) ? { detail: 'Photos needed' } : {}),
              }))}
            />
            {form.formState.errors.reason ? (
              <p className="text-sm text-danger">{form.formState.errors.reason.message}</p>
            ) : null}
          </fieldset>
          {needsPhotos(reason) ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold" id="photos-label">
                Photos{' '}
                <span className="font-normal text-ink-muted">
                  (1–{RETURN_PHOTO_MAX}, up to 2 MB each)
                </span>
              </p>
              {photos.length ? (
                <ul className="space-y-1.5" aria-labelledby="photos-label">
                  {photos.map((p, n) => (
                    <li
                      key={`${p.name}-${n}`}
                      className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 text-sm"
                    >
                      <span className="truncate">{p.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => setPhotos(photos.filter((_, i) => i !== n))}
                      >
                        <XIcon aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {photos.length < RETURN_PHOTO_MAX ? (
                <Label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-brand px-5 text-brand hover:bg-brand-soft focus-within:outline-2 focus-within:outline-brand">
                  <ImagePlusIcon className="size-4" aria-hidden />
                  Add photos
                  <input
                    type="file"
                    accept={ACCEPT}
                    multiple
                    className="sr-only"
                    onChange={addPhotos}
                  />
                </Label>
              ) : null}
              {photoError ? <p className="text-sm text-danger">{photoError}</p> : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="return-details">
              Details <span className="font-normal text-ink-muted">Optional</span>
            </Label>
            <textarea
              id="return-details"
              maxLength={1000}
              rows={3}
              className="w-full rounded-md border border-line bg-surface px-4 py-3 text-[15px] outline-none focus-visible:border-brand focus-visible:outline-2 focus-visible:outline-brand"
              {...form.register('details')}
            />
          </div>
          {mutation.isError ? <FormAlert>{errorMessage(mutation.error)}</FormAlert> : null}
          <Button type="submit" loading={mutation.isPending} className="w-full sm:w-auto">
            Send request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
