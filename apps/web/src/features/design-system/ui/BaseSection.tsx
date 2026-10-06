import { Badge } from '@/shared/ui/base/badge';
import { Button } from '@/shared/ui/base/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/base/card';
import { Input } from '@/shared/ui/base/input';
import { Label } from '@/shared/ui/base/label';
import { Skeleton } from '@/shared/ui/base/skeleton';
import { DemoBox } from '@/shared/ui/feedback/DemoBox';
import { EmptyState } from '@/shared/ui/feedback/EmptyState';
import { ErrorState } from '@/shared/ui/feedback/ErrorState';
import { Specimen, State } from './Specimen';

const noop = () => {};

export function BaseSection() {
  return (
    <section aria-labelledby="base" className="space-y-4">
      <h2 id="base" className="text-2xl font-bold">
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
