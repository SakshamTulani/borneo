import { Badge } from '@/shared/ui/base/badge';
import { Button } from '@/shared/ui/base/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/base/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/base/dialog';
import { Input } from '@/shared/ui/base/input';
import { Label } from '@/shared/ui/base/label';
import { Select } from '@/shared/ui/base/select';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { DemoBox } from '@/shared/ui/feedback/DemoBox';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { CheckboxField } from '@/shared/ui/forms/CheckboxField';
import { FormAlert } from '@/shared/ui/forms/FormAlert';
import { PasswordField } from '@/shared/ui/forms/PasswordField';
import { TextField } from '@/shared/ui/forms/TextField';
import { Specimen, State } from './Specimen';

const noop = () => {};

export function BaseSection() {
  return (
    <section aria-labelledby="base" className="space-y-4">
      <h2 id="base" className="text-headline">
        Base components
      </h2>

      <Specimen title="Button" note="All sizes are at least 44px tall.">
        <State label="Variants">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </State>
        <State label="On a dark tile">
          <div className="flex flex-wrap gap-2 rounded-xl bg-tile p-4">
            <Button>Primary</Button>
            <Button variant="onTile">Secondary</Button>
          </div>
        </State>
        <State label="Disabled, loading, destructive">
          <div className="flex flex-wrap gap-2">
            <Button disabled>Disabled</Button>
            <Button loading>Placing order</Button>
            <Button variant="destructive">Cancel order</Button>
          </div>
        </State>
      </Specimen>

      <Specimen title="Badge">
        <State label="Tones" wide>
          <div className="flex flex-wrap gap-2">
            {(
              [
                'brand',
                'offer',
                'success',
                'warning',
                'danger',
                'info',
                'neutral',
                'demo',
                'outline',
              ] as const
            ).map((v) => (
              <Badge key={v} variant={v}>
                {v}
              </Badge>
            ))}
          </div>
        </State>
      </Specimen>

      <Specimen title="Input">
        <State label="Default">
          <div className="space-y-1">
            <Label htmlFor="ds-name">Full name</Label>
            <Input id="ds-name" defaultValue="Demo Customer" />
          </div>
        </State>
        <State label="Invalid and disabled">
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="ds-email">Email</Label>
              <Input
                id="ds-email"
                defaultValue="demo@"
                aria-invalid
                aria-describedby="ds-email-err"
              />
              <p id="ds-email-err" className="text-sm text-danger">
                Enter a valid email
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ds-disabled">Phone</Label>
              <Input id="ds-disabled" disabled defaultValue="+91 98xxxxxx10" />
            </div>
          </div>
        </State>
      </Specimen>

      <Specimen
        title="Form fields"
        note="Label, hint and error are tied to the input for screen readers."
      >
        <State label="Text field with hint">
          <TextField label="Mobile number" type="tel" hint="The courier calls this number." />
        </State>
        <State label="Error">
          <TextField label="Email" defaultValue="asha@" error="Enter a valid email address" />
        </State>
        <State label="Password (show / hide)">
          <PasswordField label="Password" hint="At least 8 characters." />
        </State>
        <State label="Optional field">
          <TextField label="Landmark" aside="Optional" />
        </State>
        <State label="Checkbox (never pre-ticked)">
          <CheckboxField label="Make this my default address" hint="Used first at checkout." />
        </State>
        <State label="Form alert">
          <FormAlert>Email or password is incorrect.</FormAlert>
        </State>
      </Specimen>

      <Specimen title="Select" note="Native select; the chevron sits inside the padding.">
        <State label="Default">
          <div className="space-y-2">
            <Label htmlFor="ds-sort">Sort by</Label>
            <Select id="ds-sort" defaultValue="newest">
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
            </Select>
          </div>
        </State>
        <State label="Disabled">
          <div className="space-y-2">
            <Label htmlFor="ds-sort-off">RAM</Label>
            <Select id="ds-sort-off" disabled defaultValue="">
              <option value="">Any</option>
            </Select>
          </div>
        </State>
      </Specimen>

      <Specimen title="Card">
        <State label="Default">
          <Card>
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
              <CardDescription>2 items · Demo data</CardDescription>
            </CardHeader>
            <CardContent className="text-sm">Card body</CardContent>
          </Card>
        </State>
      </Specimen>

      <Specimen
        title="Dialog"
        note="Bottom sheet on phones, centred on larger screens. Focus is trapped; Escape closes."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Choose delivery location</DialogTitle>
            <DialogDescription>
              Demo content. Dialogs hold one task and end in one primary action.
            </DialogDescription>
            <DialogClose asChild>
              <Button>Done</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </Specimen>

      <Specimen title="Feedback states">
        <State label="Skeleton">
          <div aria-busy="true" className="space-y-2">
            <span className="sr-only">Loading</span>
            <Skeleton className="h-4 w-3/4 bg-muted" />
            <Skeleton className="h-4 w-1/2 bg-muted" />
            <Skeleton className="h-24 w-full bg-muted" />
          </div>
        </State>
        <State label="Empty">
          <EmptyState
            title="Your cart is empty"
            body="Find something that fits your setup."
            action={<Button variant="outline">Browse phones</Button>}
          />
        </State>
        <State label="Error">
          <ErrorState
            title="Couldn't load products"
            body="Check your connection and try again."
            onRetry={noop}
          />
        </State>
        <State label="Demo mode box">
          <DemoBox>
            Password reset code: <strong className="font-mono">482913</strong>
          </DemoBox>
        </State>
      </Specimen>
    </section>
  );
}
