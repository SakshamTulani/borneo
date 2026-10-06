import { QueryClient } from '@tanstack/react-query';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { apiError, sentTo, stubApi } from '@/test/api';
import { renderWithRouter } from '@/test/router';
import { toAddressCard, toFormValues } from '../mappers/toAddressCard';
import { AddressBook } from './AddressBook';
import { AddressForm } from './AddressForm';

// Leaflet needs a real browser; the stand-in reports a centre like a moved map would.
vi.mock('@/shared/ui/map/LeafletMap', () => ({
  LeafletMap: ({
    onCentreChange,
  }: {
    onCentreChange: (c: { lat: number; lng: number }) => void;
  }) => (
    <button type="button" onClick={() => onCentreChange({ lat: 12.9352, lng: 77.6245 })}>
      Fake map
    </button>
  ),
}));

afterEach(() => vi.unstubAllGlobals());

const home = {
  id: 'a1',
  name: 'Asha Rao',
  phone: '9876543210',
  line1: '12, 4th Cross',
  line2: 'Koramangala',
  landmark: 'Forum Mall',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560034',
  lat: 12.9352,
  lng: 77.6245,
  isDefault: true,
};
const office = {
  ...home,
  id: 'a2',
  line1: '5th Floor, MG Road',
  line2: null,
  landmark: null,
  isDefault: false,
};
const tiles = { url: 'https://tiles.example/{z}/{x}/{y}.png', attribution: '' };
const blank = toFormValues(undefined, { name: 'Asha Rao', phone: '9876543210' });
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('AddressBook', () => {
  it('D-188: default first with a badge; every address shows its lines and phone; axe clean', async () => {
    const { container } = await renderWithRouter(
      <AddressBook
        status="ready"
        addresses={[home, office].map(toAddressCard)}
        onMakeDefault={() => {}}
        onDelete={() => {}}
      />,
    );
    const [first, second] = screen.getAllByRole('listitem');
    expect(within(first!).getByText('Default')).toBeTruthy();
    expect(first!.textContent).toContain('Near Forum Mall');
    expect(first!.textContent).toContain('Bengaluru, Karnataka 560034');
    expect(first!.textContent).toContain('98765 43210');
    expect(within(first!).queryByRole('button', { name: 'Make default' })).toBeNull();
    expect(within(second!).getByRole('button', { name: 'Make default' })).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('asks before deleting', async () => {
    const onDelete = vi.fn();
    await renderWithRouter(
      <AddressBook
        status="ready"
        addresses={[toAddressCard(office)]}
        onMakeDefault={() => {}}
        onDelete={onDelete}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete 5th Floor, MG Road' }));
    expect(screen.getByText('Delete this address?')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Keep' }));
    expect(onDelete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Delete 5th Floor, MG Road' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith('a2');
  });

  it('loading, error and empty states; axe clean', async () => {
    const onRetry = vi.fn();
    const { container, unmount } = await renderWithRouter(
      <AddressBook status="error" onRetry={onRetry} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(onRetry).toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
    unmount();
    const empty = await renderWithRouter(
      <AddressBook status="ready" addresses={[]} onMakeDefault={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByRole('link', { name: 'Add an address' }).getAttribute('href')).toBe(
      '/account/addresses/new',
    );
    expect(await axe(empty.container)).toHaveNoViolations();
    empty.unmount();
    await renderWithRouter(<AddressBook status="loading" />);
    expect(screen.getByLabelText('Loading addresses')).toBeTruthy();
  });
});

describe('AddressForm', () => {
  const fillStreet = async () => {
    await userEvent.type(screen.getByLabelText('House, flat and street'), '12, 4th Cross');
  };

  it('D-53: refuses to save without a map pin; axe clean', async () => {
    stubApi({
      'GET /pincodes/560034': [
        200,
        { pincode: '560034', city: 'Bengaluru', state: 'Karnataka', lat: 12.93, lng: 77.63 },
      ],
    });
    const onSubmit = vi.fn();
    const { container } = await renderWithRouter(
      <AddressForm
        initial={blank}
        defaultChoice="first"
        tiles={tiles}
        submitLabel="Save address"
        saving={false}
        error={null}
        onSubmit={onSubmit}
      />,
      { queryClient: client() },
    );
    await userEvent.type(screen.getByLabelText('Pincode'), '560034');
    await fillStreet();
    await userEvent.click(screen.getByRole('button', { name: 'Save address' }));
    expect((await screen.findAllByRole('alert'))[0]!.textContent).toBe('Place the pin on the map');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-189: a known pincode fills city and state; placing the pin saves its exact position', async () => {
    stubApi({
      'GET /pincodes/560034': [
        200,
        { pincode: '560034', city: 'Bengaluru', state: 'Karnataka', lat: 12.93, lng: 77.63 },
      ],
    });
    const onSubmit = vi.fn();
    await renderWithRouter(
      <AddressForm
        initial={blank}
        defaultChoice="first"
        tiles={tiles}
        submitLabel="Save address"
        saving={false}
        error={null}
        onSubmit={onSubmit}
      />,
      { queryClient: client() },
    );
    await userEvent.type(screen.getByLabelText('Pincode'), '560 034');
    await waitFor(() =>
      expect((screen.getByLabelText('City') as HTMLInputElement).value).toBe('Bengaluru'),
    );
    expect((screen.getByLabelText('State') as HTMLInputElement).value).toBe('Karnataka');
    await fillStreet();

    await userEvent.click(screen.getByRole('button', { name: 'Place pin on map' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Fake map' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save pin' }));
    expect(screen.getByText('Pin placed')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Save address' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      pincode: '560034',
      city: 'Bengaluru',
      lat: 12.9352,
      lng: 77.6245,
      line2: null,
      phone: '9876543210',
    });
  });

  it('D-188: the first address is the default; later ones offer an unticked choice (D-06)', async () => {
    stubApi({});
    const props = {
      initial: blank,
      tiles,
      submitLabel: 'Save',
      saving: false,
      error: null,
      onSubmit: () => {},
    };
    const { unmount } = await renderWithRouter(<AddressForm {...props} defaultChoice="first" />, {
      queryClient: client(),
    });
    expect(screen.getByText('This will be your default address.')).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    unmount();
    await renderWithRouter(<AddressForm {...props} defaultChoice="choose" />, {
      queryClient: client(),
    });
    expect(
      (screen.getByRole('checkbox', { name: 'Make this my default address' }) as HTMLInputElement)
        .checked,
    ).toBe(false);
  });

  it('D-189: a pin far from the pincode is shown at the pin', async () => {
    stubApi({ 'GET /pincodes/560034': [200, null] });
    const error = Object.assign(new Error('The map pin is more than 50 km from pincode 560034.'), {
      status: 422,
      code: 'PIN_FAR_FROM_PINCODE',
    });
    await renderWithRouter(
      <AddressForm
        initial={toFormValues(home, null)}
        defaultChoice="current"
        tiles={tiles}
        submitLabel="Save"
        saving={false}
        error={error}
        onSubmit={() => {}}
      />,
      { queryClient: client() },
    );
    const fieldset = screen.getByRole('group', { name: 'Map pin' });
    expect((await within(fieldset).findByRole('alert')).textContent).toContain('more than 50 km');
    expect(screen.getByRole('button', { name: 'Move pin' })).toBeTruthy();
  });

  it('D-187: without a map provider the pincode centre is the pin', async () => {
    stubApi({
      'GET /pincodes/560034': [
        200,
        { pincode: '560034', city: 'Bengaluru', state: 'Karnataka', lat: 12.93, lng: 77.63 },
      ],
    });
    const onSubmit = vi.fn();
    await renderWithRouter(
      <AddressForm
        initial={blank}
        defaultChoice="first"
        tiles={null}
        submitLabel="Save address"
        saving={false}
        error={null}
        onSubmit={onSubmit}
      />,
      { queryClient: client() },
    );
    expect(screen.queryByRole('button', { name: 'Place pin on map' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Pincode'), '560034');
    await fillStreet();
    expect(await screen.findByText(/Using the centre of your pincode/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Save address' }));
    await waitFor(() =>
      expect(onSubmit.mock.calls[0]![0]).toMatchObject({ lat: 12.93, lng: 77.63 }),
    );
  });

  it('a save problem is announced', async () => {
    stubApi({});
    await renderWithRouter(
      <AddressForm
        initial={toFormValues(home, null)}
        defaultChoice="current"
        tiles={tiles}
        submitLabel="Save"
        saving={false}
        error={Object.assign(new Error('You can save up to 20 addresses.'), {
          status: 422,
          code: 'ADDRESS_LIMIT',
        })}
        onSubmit={() => {}}
      />,
      { queryClient: client() },
    );
    expect(screen.getByRole('alert').textContent).toBe('You can save up to 20 addresses.');
  });
});

describe('address API', () => {
  it('D-53: the saved address goes to the API with its pin', async () => {
    const api = stubApi({ 'POST /me/addresses': [201, { ...home, id: 'new' }] });
    const { saveAddress } = await import('../repository/addressesRepository');
    await saveAddress({ input: { ...home, line2: null } });
    expect(sentTo(api, 'POST /me/addresses')[0]).toMatchObject({ lat: 12.9352, lng: 77.6245 });
  });

  it('reports a failed save with its code', async () => {
    stubApi({
      'POST /me/addresses': apiError(422, 'ADDRESS_LIMIT', 'You can save up to 20 addresses.'),
    });
    const { saveAddress } = await import('../repository/addressesRepository');
    await expect(saveAddress({ input: home })).rejects.toMatchObject({
      code: 'ADDRESS_LIMIT',
      status: 422,
    });
  });
});
