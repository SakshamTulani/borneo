import { describe, expect, it } from 'vitest';
import { invoiceLines, renderInvoicePdf, type InvoiceDocument } from './invoice';
import { renderPdf, textWidth } from './pdf';

const text = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

const doc: InvoiceDocument = {
  number: 'INV2627-000001',
  issuedAt: Date.UTC(2026, 9, 6),
  orderNumber: 'BN-000001',
  placedAt: Date.UTC(2026, 9, 6),
  supplier: { name: 'Borneo', warehouse: 'Mumbai (Bhiwandi)', state: 'Maharashtra', gstin: null },
  buyer: {
    name: 'Asha (Rao)',
    phone: '9876543210',
    line1: '12, 4th Cross',
    line2: null,
    landmark: null,
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
  },
  placeOfSupply: 'Karnataka',
  lines: [
    {
      name: 'Pulse 4',
      sku: 'BP4',
      hsnCode: '8517',
      qty: 1,
      unitPricePaise: 2_000_000,
      discountPaise: 50_000,
      gstRateBps: 1800,
      intraState: false,
    },
  ],
  paymentMethod: 'UPI',
  demo: true,
};

describe('PDF writer', () => {
  it('writes a cross-reference table whose offsets point at each object', () => {
    const out = text(
      renderPdf([{ texts: [{ x: 10, y: 10, text: 'Hi (there) \\ ₹5' }], rules: [] }], 'T'),
    );
    expect(out.startsWith('%PDF-1.4')).toBe(true);
    const xref = Number(/startxref\n(\d+)/.exec(out)![1]);
    expect(out.slice(xref, xref + 4)).toBe('xref');
    const offsets = [...out.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(out.slice(o).startsWith(`${i + 1} 0 obj\n`)).toBe(true));
    // Escaped brackets and backslash; ₹ has no glyph in the standard fonts.
    expect(out).toContain('(Hi \\(there\\) \\\\ Rs.5)');
  });

  it('measures text for right alignment', () => {
    expect(textWidth('10', 10)).toBeCloseTo(11.12);
    expect(textWidth('1,0', 10)).toBeLessThan(textWidth('100', 10));
  });
});

describe('invoice', () => {
  it('D-209: across states the tax is IGST and lines add back to the amount paid', () => {
    const [line] = invoiceLines(doc);
    expect(line!.valuePaise).toBe(1_950_000);
    expect(line!.tax.igstPaise + line!.tax.taxablePaise).toBe(1_950_000);
    expect(line!.tax.cgstPaise).toBe(0);
    const out = text(renderInvoicePdf(doc));
    expect(out).toContain('(IGST)');
    expect(out).not.toContain('(CGST)');
  });

  it('D-209: lines from different states are taxed by their own warehouse', () => {
    const mixed = {
      ...doc,
      lines: [doc.lines[0]!, { ...doc.lines[0]!, sku: 'EB2', intraState: true }],
    };
    const [inter, intra] = invoiceLines(mixed);
    expect(inter!.tax.igstPaise).toBeGreaterThan(0);
    expect(intra!.tax.cgstPaise + intra!.tax.sgstPaise).toBe(inter!.tax.igstPaise);
    const out = text(renderInvoicePdf(mixed));
    for (const label of ['(CGST)', '(SGST)', '(IGST)']) expect(out).toContain(label);
    expect(out).toContain('(DEMO INVOICE - NOT A TAX DOCUMENT)');
    expect(out).toContain('GSTIN: not registered \\(demo\\)');
  });

  it('D-173: a real invoice says TAX INVOICE and long orders run onto more pages', () => {
    const many = { ...doc, demo: false, lines: Array.from({ length: 40 }, () => doc.lines[0]!) };
    const out = text(renderInvoicePdf(many));
    expect(out).toContain('(TAX INVOICE)');
    expect(Number(/\/Count (\d+)/.exec(out)![1])).toBeGreaterThan(1);
  });
});
