export type AdrFile = { name: string; content: string };

const FILE = /^(\d{4})-[a-z0-9-]+\.md$/;
const STATUS = /^- Status: (proposed|accepted|rejected|deprecated|superseded by (\d{4}))$/m;
const SECTIONS = ['## Context', '## Options', '## Decision', '## Consequences'];

/** ADRs: MADR sections, valid status, contiguous unique numbers, listed in the index with the same status. */
export function checkAdrs(files: AdrFile[], index: string): string[] {
  const errors: string[] = [];
  const adrs = files.filter((f) => f.name !== 'README.md');
  const numbers: number[] = [];
  const statusByFile = new Map<string, string>();

  for (const { name, content } of adrs) {
    const match = FILE.exec(name);
    if (!match) {
      errors.push(`${name}: file name must be NNNN-kebab-title.md`);
      continue;
    }
    const num = match[1]!;
    numbers.push(Number(num));
    if (!content.startsWith(`# ${num}. `))
      errors.push(`${name}: first line must be "# ${num}. <title>"`);
    if (!/^- Date: \d{4}-\d{2}-\d{2}$/m.test(content))
      errors.push(`${name}: missing "- Date: YYYY-MM-DD"`);
    const status = STATUS.exec(content);
    if (!status) {
      errors.push(`${name}: invalid or missing status`);
    } else {
      statusByFile.set(name, status[1]!);
      const target = status[2];
      if (target && !adrs.some((f) => f.name.startsWith(`${target}-`))) {
        errors.push(`${name}: superseded by missing ADR ${target}`);
      }
    }
    for (const section of SECTIONS) {
      if (!content.split('\n').includes(section))
        errors.push(`${name}: missing section "${section}"`);
    }
  }

  const sorted = [...numbers].sort((a, b) => a - b);
  sorted.forEach((n, i) => {
    if (i > 0 && n === sorted[i - 1])
      errors.push(`duplicate ADR number ${String(n).padStart(4, '0')}`);
  });
  const unique = [...new Set(sorted)];
  unique.forEach((n, i) => {
    if (n !== i + 1)
      errors.push(
        `ADR numbers must be contiguous from 0001: expected ${String(i + 1).padStart(4, '0')}, found ${String(n).padStart(4, '0')}`,
      );
  });

  for (const [name, status] of statusByFile) {
    const row = index.split('\n').find((line) => line.includes(`(${name})`));
    if (!row) errors.push(`${name}: not listed in docs/adr/README.md`);
    else if (
      !row
        .split('|')
        .map((cell) => cell.trim())
        .includes(status)
    )
      errors.push(`${name}: index status differs from file status "${status}"`);
  }
  for (const [, linked] of index.matchAll(/\]\((\d{4}-[^)]+\.md)\)/g)) {
    if (!adrs.some((f) => f.name === linked))
      errors.push(`docs/adr/README.md: links missing file ${linked}`);
  }
  return errors;
}
