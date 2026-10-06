import { describe, expect, it } from 'vitest';
import { attributeDefSchema, type AttributeDef } from '../contracts/catalog';
import { compatibilityFacts, isFilled } from './compatibility';

const defs: AttributeDef[] = [
  { key: 'works_with_alexa', label: 'Alexa', type: 'bool', compat: true },
  { key: 'works_with_iphone', label: 'iPhone', type: 'bool', compat: true },
  {
    key: 'connector',
    label: 'Connector',
    type: 'enum',
    options: ['usb_c', 'USB-C'],
    optionLabels: { usb_c: 'USB-C' },
    compat: true,
  },
  { key: 'bluetooth', label: 'Bluetooth', type: 'number', unit: '', compat: true },
  { key: 'protocols', label: 'Protocols', type: 'list', compat: true },
  { key: 'colour', label: 'Colour', type: 'enum', compat: false },
];

describe('compatibility', () => {
  it('D-22: facts only from filled structured attributes; missing means no claim', () => {
    expect(
      compatibilityFacts(
        { works_with_alexa: true, works_with_iphone: false, connector: '', colour: 'Forest' },
        defs,
      ),
    ).toEqual([{ key: 'works_with_alexa', text: 'Works with Alexa' }]);
    expect(compatibilityFacts({}, defs)).toEqual([]);
  });

  it('D-22: boolean facts need exactly true; free text never counts', () => {
    const withText = [
      ...defs,
      { key: 'notes', label: 'Notes', type: 'text' as const, compat: true },
    ];
    expect(
      compatibilityFacts(
        { works_with_alexa: 'false', works_with_iphone: 1, notes: 'works with everything' },
        withText,
      ),
    ).toEqual([]);
    expect(
      attributeDefSchema.safeParse({ key: 'notes', label: 'Notes', type: 'text', compat: true })
        .success,
    ).toBe(false);
  });

  it('D-23: non-boolean facts are stated plainly', () => {
    expect(
      compatibilityFacts(
        { connector: 'USB-C', bluetooth: 5.3, protocols: ['Matter', 'Thread'] },
        defs,
      ).map((f) => f.text),
    ).toEqual(['Connector: USB-C', 'Bluetooth: 5.3', 'Protocols: Matter, Thread']);
  });

  it('D-23: coded options read by their label', () => {
    expect(compatibilityFacts({ connector: 'usb_c' }, defs)).toEqual([
      { key: 'connector', text: 'Connector: USB-C' },
    ]);
  });

  it('D-22: a malformed value makes no claim', () => {
    expect(compatibilityFacts({ bluetooth: 'five' }, defs)).toEqual([]);
  });

  it('D-22: what counts as filled', () => {
    expect([undefined, null, false, '', '  ', []].map(isFilled)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect([true, 0, 'x', ['a']].map(isFilled)).toEqual([true, true, true, true]);
  });
});
