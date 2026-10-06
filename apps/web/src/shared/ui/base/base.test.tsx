import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Input } from './input';
import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Separator } from './separator';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

describe('base components', () => {
  it('Button: default, disabled and loading', async () => {
    const { container } = render(
      <>
        <Button>Add to cart</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Placing order</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Placing order' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Placing order' }).getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Badge: tones', async () => {
    const { container } = render(
      <>
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
      </>,
    );
    expect(screen.getByText('offer')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Card', async () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
      </Card>,
    );
    expect(screen.getByText('Order summary')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Input with Label, including invalid', async () => {
    const { container } = render(
      <>
        <Label htmlFor="pin">Pincode</Label>
        <Input id="pin" aria-invalid />
      </>,
    );
    expect(screen.getByLabelText('Pincode')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('RadioGroup', async () => {
    const { container } = render(
      <RadioGroup aria-label="Storage" defaultValue="128">
        <RadioGroupItem value="128" aria-label="128 GB" />
        <RadioGroupItem value="256" aria-label="256 GB" disabled />
      </RadioGroup>,
    );
    expect(screen.getByRole('radio', { name: '128 GB' }).getAttribute('aria-checked')).toBe('true');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Separator and Skeleton', async () => {
    const { container } = render(
      <>
        <Separator />
        <Skeleton className="h-4 w-20" />
      </>,
    );
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('Table', async () => {
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Spec</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Battery</TableCell>
            <TableCell>5000 mAh</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole('table')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });
});
