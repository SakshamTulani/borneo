import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { PINCODE_STORAGE_KEY } from '../hooks/useDeliveryForm';
import { ProductDelivery } from './ProductDelivery';

// Leaflet needs a real browser; the stand-in reports a fixed centre like a moved map would.
vi.mock('@/shared/ui/map/LeafletMap', () => ({
  LeafletMap: ({
    onCentreChange,
  }: {
    onCentreChange: (c: { lat: number; lng: number }) => void;
  }) => (
    <button type="button" onClick={() => onCentreChange({ lat: 12.93, lng: 77.625 })}>
      Fake map
    </button>
  ),
}));

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const estimate = (pincode: string) => ({
  pincode,
  place: { city: 'Bengaluru', state: 'Karnataka' },
  estimate: {
    status: 'deliverable',
    from: '2026-10-07',
    to: '2026-10-08',
    cod: { allowed: true, reasons: [] },
  },
});

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  window.localStorage.clear();
  fetchMock = vi.fn((url: string) => {
    if (url.startsWith('/api/pincodes/at')) {
      return json(200, {
        pincode: '560034',
        city: 'Bengaluru',
        state: 'Karnataka',
        lat: 12.93,
        lng: 77.63,
      });
    }
    const pincode = new URL(url, 'http://x').searchParams.get('pincode')!;
    if (pincode === '171001') {
      return json(200, {
        pincode,
        place: { city: 'Shimla', state: 'Himachal Pradesh' },
        estimate: { status: 'notDeliverable' },
      });
    }
    return json(200, estimate(pincode));
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const renderDelivery = (sku = 'BP4-6-128-FOR', defaultPincode: string | null = null) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ProductDelivery sku={sku} defaultPincode={defaultPincode} />
    </QueryClientProvider>,
  );

const check = (pincode: string) => {
  fireEvent.change(screen.getByLabelText('Delivery pincode'), { target: { value: pincode } });
  fireEvent.click(screen.getByRole('button', { name: 'Check' }));
};

describe('ProductDelivery', () => {
  it('D-52: checks a typed pincode and shows the date range; axe clean', async () => {
    const { container } = renderDelivery();
    check('560 001');
    expect(await screen.findByText(/Estimated delivery/)).toBeTruthy();
    expect(screen.getByText('Bengaluru, Karnataka')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/delivery?sku=BP4-6-128-FOR&pincode=560001',
      expect.anything(),
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('D-51: says plainly when a pincode is not deliverable', async () => {
    renderDelivery();
    check('171001');
    expect(await screen.findByText('Not deliverable to 171001 yet')).toBeTruthy();
    expect(screen.getByText('Shimla, Himachal Pradesh')).toBeTruthy();
  });

  it('D-50: a malformed pincode is flagged without calling the API', () => {
    renderDelivery();
    check('5600');
    expect(screen.getByText('Enter a 6-digit pincode')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('D-185: remembers the last valid pincode in this browser', async () => {
    renderDelivery();
    check('560034');
    await screen.findByText(/Estimated delivery/);
    expect(window.localStorage.getItem(PINCODE_STORAGE_KEY)).toBe('560034');
  });

  it('D-185: signed in, the default address pincode comes before the remembered one', async () => {
    window.localStorage.setItem(PINCODE_STORAGE_KEY, '560001');
    renderDelivery('BP4-6-128-FOR', '560034');
    expect(await screen.findByText(/Estimated delivery/)).toBeTruthy();
    expect((screen.getByLabelText('Delivery pincode') as HTMLInputElement).value).toBe('560034');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/delivery?sku=BP4-6-128-FOR&pincode=560034',
      expect.anything(),
    );
    // Checking another pincode still works.
    check('560001');
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/delivery?sku=BP4-6-128-FOR&pincode=560001',
        expect.anything(),
      ),
    );
  });

  it('D-185: a remembered pincode is checked on arrival', async () => {
    window.localStorage.setItem(PINCODE_STORAGE_KEY, '560001');
    renderDelivery();
    expect(await screen.findByText(/Estimated delivery/)).toBeTruthy();
    expect((screen.getByLabelText('Delivery pincode') as HTMLInputElement).value).toBe('560001');
  });

  it('D-54: rechecks when the variant changes, since stock is per variant', async () => {
    window.localStorage.setItem(PINCODE_STORAGE_KEY, '560001');
    const client = new QueryClient();
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <ProductDelivery sku="A" />
      </QueryClientProvider>,
    );
    await screen.findByText(/Estimated delivery/);
    rerender(
      <QueryClientProvider client={client}>
        <ProductDelivery sku="B" />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/delivery?sku=B&pincode=560001',
        expect.anything(),
      ),
    );
  });

  it('D-184: a map pin fills the pincode and checks it', async () => {
    renderDelivery();
    fireEvent.click(screen.getByRole('button', { name: 'Choose on map' }));
    const dialog = screen.getByRole('dialog', { name: 'Choose delivery location' });
    expect(await axe(dialog)).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button', { name: 'Fake map' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this location' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((screen.getByLabelText('Delivery pincode') as HTMLInputElement).value).toBe('560034');
    expect(await screen.findByText(/Estimated delivery/)).toBeTruthy();
  });

  it('D-184: a pin with no pincode nearby asks to move it or type instead', async () => {
    fetchMock.mockImplementation(() =>
      json(404, { error: { code: 'PINCODE_NOT_FOUND', message: 'No known pincode' } }),
    );
    renderDelivery();
    fireEvent.click(screen.getByRole('button', { name: 'Choose on map' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fake map' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use this location' }));
    expect(await screen.findByText(/We don’t have a pincode for this spot/)).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('ROADMAP H: the keyboard path needs no map: type, press Enter', async () => {
    const user = userEvent.setup();
    renderDelivery();
    await user.click(screen.getByLabelText('Delivery pincode'));
    await user.keyboard('560001{Enter}');
    expect(await screen.findByText(/Estimated delivery/)).toBeTruthy();
  });

  it('D-50: a pasted "560 001" is read as 560001', async () => {
    const user = userEvent.setup();
    renderDelivery();
    await user.click(screen.getByLabelText('Delivery pincode'));
    await user.paste('560 001');
    expect((screen.getByLabelText('Delivery pincode') as HTMLInputElement).value).toBe('560001');
  });

  it('D-51: the result names the pincode checked, not a later edit', async () => {
    renderDelivery();
    check('171001');
    await screen.findByText('Not deliverable to 171001 yet');
    fireEvent.change(screen.getByLabelText('Delivery pincode'), { target: { value: '56' } });
    expect(screen.getByText('Not deliverable to 171001 yet')).toBeTruthy();
  });

  it('Check again after a failure asks the API again', async () => {
    fetchMock.mockImplementationOnce(() =>
      json(500, { error: { code: 'INTERNAL', message: 'Something went wrong' } }),
    );
    renderDelivery();
    check('560001');
    expect(await screen.findByText('Couldn’t check delivery. Try again.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText(/Estimated delivery/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
