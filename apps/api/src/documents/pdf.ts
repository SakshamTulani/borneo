// A minimal PDF writer for text documents (D-210): A4 pages, the two standard Helvetica fonts,
// text and rules. No embedding, so only WinAnsi characters print; others become "?".

export type PdfText = {
  x: number;
  y: number;
  text: string;
  size?: number;
  bold?: boolean;
  /** `right`: `x` is where the text ends. */
  align?: 'left' | 'right';
};
export type PdfRule = { x1: number; y1: number; x2: number; y2: number; width?: number };
export type PdfPage = { texts: PdfText[]; rules: PdfRule[] };

export const A4 = { width: 595, height: 842 };

// Helvetica advance widths (1/1000 em) for the characters right-aligned columns use.
const WIDTHS: Record<string, number> = {
  ' ': 278,
  ',': 278,
  '.': 278,
  '-': 333,
  '%': 889,
  '/': 278,
  R: 722,
  s: 500,
};
const BOLD_WIDTHS: Record<string, number> = { ...WIDTHS, '-': 333, R: 722, s: 556 };

/** Width of `text` in points; digits and most letters are about 0.556 em. */
export function textWidth(text: string, size: number, bold = false): number {
  const table = bold ? BOLD_WIDTHS : WIDTHS;
  let units = 0;
  for (const ch of text) units += table[ch] ?? 556;
  return (units * size) / 1000;
}

/** WinAnsi-safe text with PDF string escapes. */
function pdfString(text: string): string {
  const safe = [...text]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      if (ch === '₹') return 'Rs.';
      if (ch === '–' || ch === '—') return '-';
      if (ch === '’' || ch === '‘') return "'";
      return code >= 32 && code <= 126 ? ch : '?';
    })
    .join('');
  return `(${safe.replace(/[\\()]/g, (c) => `\\${c}`)})`;
}

const num = (n: number) => (Math.round(n * 100) / 100).toString();

function pageContent(page: PdfPage): string {
  const ops: string[] = [];
  for (const r of page.rules) {
    ops.push(`${num(r.width ?? 0.5)} w ${num(r.x1)} ${num(r.y1)} m ${num(r.x2)} ${num(r.y2)} l S`);
  }
  for (const t of page.texts) {
    const size = t.size ?? 9;
    const x = t.align === 'right' ? t.x - textWidth(t.text, size, t.bold) : t.x;
    ops.push(
      `BT /${t.bold ? 'F2' : 'F1'} ${num(size)} Tf ${num(x)} ${num(t.y)} Td ${pdfString(t.text)} Tj ET`,
    );
  }
  return ops.join('\n');
}

/** Serialises pages into a PDF file. */
export function renderPdf(pages: PdfPage[], title: string): Uint8Array {
  const objects: string[] = [];
  /** Adds an object and returns its (1-based) number. */
  const add = (body: string) => objects.push(body);
  const catalog = add('');
  const pagesObj = add('');
  const regular = add(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  );
  const bold = add(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  );
  const info = add(`<< /Title ${pdfString(title)} /Producer (Borneo) >>`);
  const kids: number[] = [];
  for (const page of pages) {
    const content = pageContent(page);
    const stream = add(
      `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
    );
    kids.push(
      add(
        `<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] ` +
          `/Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${stream} 0 R >>`,
      ),
    );
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objects[pagesObj - 1] =
    `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\n`;
  out += `startxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, 'latin1'));
}
