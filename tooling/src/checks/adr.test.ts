import { describe, expect, it } from 'vitest';
import { checkAdrs } from './adr.ts';

const adr = (num: string, status = 'accepted', drop?: string) =>
  [
    `# ${num}. Title`,
    '',
    `- Status: ${status}`,
    '- Date: 2026-10-06',
    '',
    '## Context',
    '## Options',
    '## Decision',
    '## Consequences',
  ]
    .filter((l) => l !== drop)
    .join('\n');
const row = (name: string, status = 'accepted') => `| [x](${name}) | Title | ${status} |`;

describe('checkAdrs', () => {
  it('passes a valid set', () => {
    const files = [
      { name: '0001-a.md', content: adr('0001') },
      { name: '0002-b.md', content: adr('0002', 'superseded by 0001') },
    ];
    expect(
      checkAdrs(files, [row('0001-a.md'), row('0002-b.md', 'superseded by 0001')].join('\n')),
    ).toEqual([]);
  });

  it('reports missing sections, bad status, gaps, duplicates and index drift', () => {
    const files = [
      { name: '0001-a.md', content: adr('0001', 'maybe') },
      { name: '0003-c.md', content: adr('0003', 'accepted', '## Options') },
      { name: '0003-d.md', content: adr('0003', 'proposed') },
    ];
    const index = [row('0001-a.md'), row('0003-c.md', 'proposed'), row('0009-z.md')].join('\n');
    expect(checkAdrs(files, index)).toEqual([
      '0001-a.md: invalid or missing status',
      '0003-c.md: missing section "## Options"',
      'duplicate ADR number 0003',
      'ADR numbers must be contiguous from 0001: expected 0002, found 0003',
      '0003-c.md: index status differs from file status "accepted"',
      '0003-d.md: not listed in docs/adr/README.md',
      'docs/adr/README.md: links missing file 0009-z.md',
    ]);
  });
});
