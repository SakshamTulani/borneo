import {
  gstRateLabel,
  gstSplit,
  sumPaise,
  type AddressSnapshot,
  type GstSplit,
} from '@borneo/shared';
import { A4, renderPdf, type PdfPage, type PdfText } from './pdf';

/** Everything printed on a B2C GST invoice (D-173, D-209), from the order's snapshots. */
export type InvoiceDocument = {
  number: string;
  issuedAt: number;
  orderNumber: string;
  placedAt: number;
  supplier: { name: string; warehouse: string; state: string; gstin: string | null };
  buyer: AddressSnapshot;
  placeOfSupply: string;
  lines: {
    name: string;
    sku: string;
    hsnCode: string | null;
    qty: number;
    unitPricePaise: number;
    discountPaise: number;
    gstRateBps: number;
    /** Shipped from a warehouse in the delivery state: CGST + SGST, else IGST (D-209). */
    intraState: boolean;
  }[];
  paymentMethod: string;
  /** Demo invoices say plainly they are not tax documents (D-210). */
  demo: boolean;
  /** The order was cancelled after invoicing: marked, pending a credit note (D-216). */
  cancelled?: boolean;
};

const rupees = (paise: number) =>
  `Rs. ${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100)}`;

const istDay = (ms: number) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(ms);

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 3)}...` : text;

/** Each line's GST-inclusive value after discounts, split into taxable value and tax (D-209). */
export function invoiceLines(doc: InvoiceDocument) {
  return doc.lines.map((l) => {
    const valuePaise = l.unitPricePaise * l.qty - l.discountPaise;
    return {
      ...l,
      valuePaise,
      tax: gstSplit({ valuePaise, rateBps: l.gstRateBps }, l.intraState),
    };
  });
}

const MARGIN = 40;
const ROW = 26;
const COLS = { qty: 268, rate: 328, discount: 384, taxable: 440, tax: 496, total: 555 };

/** Lays the invoice out on A4 pages and returns the PDF (D-102, D-173). */
export function renderInvoicePdf(doc: InvoiceDocument): Uint8Array {
  const lines = invoiceLines(doc);
  const pages: PdfPage[] = [];
  let page: PdfPage = { texts: [], rules: [] };
  let y = 0;
  const text = (t: PdfText) => page.texts.push(t);
  const rule = (at: number, width = 0.5) =>
    page.rules.push({ x1: MARGIN, y1: at, x2: A4.width - MARGIN, y2: at, width });

  const tableHeader = () => {
    const h = { y, size: 8, bold: true } as const;
    text({ ...h, x: MARGIN, text: '#' });
    text({ ...h, x: MARGIN + 18, text: 'Item' });
    text({ ...h, x: COLS.qty, text: 'Qty', align: 'right' });
    text({ ...h, x: COLS.rate, text: 'Rate', align: 'right' });
    text({ ...h, x: COLS.discount, text: 'Discount', align: 'right' });
    text({ ...h, x: COLS.taxable, text: 'Taxable', align: 'right' });
    text({ ...h, x: COLS.tax, text: 'GST', align: 'right' });
    text({ ...h, x: COLS.total, text: 'Total', align: 'right' });
    rule(y - 6);
    y -= 22;
  };

  const newPage = (first: boolean) => {
    if (!first) pages.push(page);
    page = { texts: [], rules: [] };
    y = A4.height - MARGIN - 10;
    text({
      x: MARGIN,
      y,
      text: doc.demo ? 'DEMO INVOICE - NOT A TAX DOCUMENT' : 'TAX INVOICE',
      size: 14,
      bold: true,
    });
    text({ x: A4.width - MARGIN, y, text: doc.number, size: 11, bold: true, align: 'right' });
    if (doc.cancelled) {
      y -= 16;
      text({
        x: MARGIN,
        y,
        text: 'CANCELLED - ORDER CANCELLED AND REFUNDED',
        size: 11,
        bold: true,
      });
    }
    y -= 26;
    if (!first) return tableHeader();

    text({ x: MARGIN, y, text: doc.supplier.name, size: 11, bold: true });
    text({ x: 320, y, text: 'Invoice date', size: 8, bold: true });
    text({ x: 400, y, text: istDay(doc.issuedAt), size: 9 });
    y -= 13;
    text({ x: MARGIN, y, text: `Ships from: ${doc.supplier.warehouse}, ${doc.supplier.state}` });
    text({ x: 320, y, text: 'Order', size: 8, bold: true });
    text({ x: 400, y, text: `${doc.orderNumber}, ${istDay(doc.placedAt)}` });
    y -= 13;
    text({
      x: MARGIN,
      y,
      text: `GSTIN: ${doc.supplier.gstin ?? 'not registered (demo)'}`,
    });
    text({ x: 320, y, text: 'Place of supply', size: 8, bold: true });
    text({ x: 400, y, text: doc.placeOfSupply });
    y -= 13;
    text({ x: 320, y, text: 'Payment', size: 8, bold: true });
    text({ x: 400, y, text: doc.paymentMethod });
    y -= 24;

    const b = doc.buyer;
    text({ x: MARGIN, y, text: 'Bill to / Ship to', size: 8, bold: true });
    y -= 13;
    for (const part of [
      b.name,
      b.line1,
      b.line2,
      b.landmark,
      `${b.city}, ${b.state} ${b.pincode}`,
      `Phone ${b.phone}`,
    ]) {
      if (!part) continue;
      text({ x: MARGIN, y, text: clip(part, 90) });
      y -= 12;
    }
    y -= 14;
    tableHeader();
  };

  newPage(true);
  lines.forEach((l, i) => {
    if (y < MARGIN + 120) newPage(false);
    const tax = l.tax.cgstPaise + l.tax.sgstPaise + l.tax.igstPaise;
    text({ x: MARGIN, y, text: String(i + 1) });
    text({ x: MARGIN + 18, y, text: clip(l.name, 36) });
    text({ x: COLS.qty, y, text: String(l.qty), align: 'right' });
    text({ x: COLS.rate, y, text: rupees(l.unitPricePaise).slice(4), align: 'right' });
    text({ x: COLS.discount, y, text: rupees(l.discountPaise).slice(4), align: 'right' });
    text({ x: COLS.taxable, y, text: rupees(l.tax.taxablePaise).slice(4), align: 'right' });
    text({ x: COLS.tax, y, text: rupees(tax).slice(4), align: 'right' });
    text({ x: COLS.total, y, text: rupees(l.valuePaise).slice(4), align: 'right' });
    text({
      x: MARGIN + 18,
      y: y - 11,
      size: 7.5,
      text: `SKU ${l.sku}${l.hsnCode ? `  HSN ${l.hsnCode}` : ''}  GST ${gstRateLabel(l.gstRateBps)} ${l.intraState ? '(CGST + SGST)' : '(IGST)'}`,
    });
    y -= ROW;
  });

  rule(y + 12);
  const sum = (pick: (t: GstSplit) => number) => sumPaise(lines.map((l) => pick(l.tax)));
  const totals: [string, number][] = [
    ['Taxable value', sum((t) => t.taxablePaise)],
    ...(
      [
        ['CGST', sum((t) => t.cgstPaise)],
        ['SGST', sum((t) => t.sgstPaise)],
        ['IGST', sum((t) => t.igstPaise)],
      ] as [string, number][]
    ).filter(([, paise]) => paise > 0),
    ['Total (incl. GST)', sumPaise(lines.map((l) => l.valuePaise))],
  ];

  y -= 6;
  for (const [label, paise] of totals) {
    const strong = label.startsWith('Total');
    text({ x: COLS.taxable, y, text: label, bold: strong, align: 'right', size: strong ? 10 : 9 });
    text({
      x: COLS.total,
      y,
      text: rupees(paise),
      bold: strong,
      align: 'right',
      size: strong ? 10 : 9,
    });
    y -= 15;
  }
  y -= 10;
  text({
    x: MARGIN,
    y,
    size: 8,
    text: 'Prices include GST. Discounts (bundle, coupon, payment offer) are taken before tax. Amounts in Indian rupees.',
  });
  if (doc.demo) {
    y -= 12;
    text({
      x: MARGIN,
      y,
      size: 8,
      text: 'Demo store: no goods are supplied, no tax is charged and this document has no legal effect.',
    });
  }
  pages.push(page);
  return renderPdf(pages, `Invoice ${doc.number}`);
}
