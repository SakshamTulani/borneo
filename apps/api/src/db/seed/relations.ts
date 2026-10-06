import type { RelationRule, RelationType } from '@borneo/shared';

/** Attribute rules generate default edges (D-21); every match uses structured attributes (D-22). */
export const relationRules: {
  key: string;
  type: RelationType;
  from: string;
  to: string;
  match: RelationRule['match'];
  reasonTemplate: string;
}[] = [
  {
    key: 'phone-case',
    type: 'accessory',
    from: 'smartphones',
    to: 'accessories',
    match: { kind: 'contains', fromAttr: 'case_fit', toAttr: 'fits_case' },
    reasonTemplate: 'Made for {from}',
  },
  {
    key: 'phone-usb-c',
    type: 'compatible',
    from: 'smartphones',
    to: 'accessories',
    match: { kind: 'equal', fromAttr: 'connector', toAttr: 'connector' },
    reasonTemplate: 'USB-C, works with {from}',
  },
  {
    key: 'phone-qi',
    type: 'compatible',
    from: 'smartphones',
    to: 'accessories',
    match: { kind: 'equal', fromAttr: 'wireless_charging', toAttr: 'qi' },
    reasonTemplate: 'Charges {from} wirelessly',
  },
  {
    key: 'buds-tips',
    type: 'consumable',
    from: 'audio',
    to: 'accessories',
    match: { kind: 'contains', fromAttr: 'tip_fit', toAttr: 'fits_tips' },
    reasonTemplate: 'Spare ear tips for {from}',
  },
  {
    key: 'watch-strap',
    type: 'accessory',
    from: 'wearables',
    to: 'accessories',
    match: { kind: 'equal', fromAttr: 'strap_width_mm', toAttr: 'strap_width_mm' },
    reasonTemplate: 'Fits {from}',
  },
  {
    key: 'vacuum-kit',
    type: 'consumable',
    from: 'robot-vacuums',
    to: 'accessories',
    match: { kind: 'contains', fromAttr: 'vacuum_kit_fit', toAttr: 'fits_vacuum' },
    reasonTemplate: 'Brushes and filters for {from}',
  },
];

/** Manual curation: adds and removes (D-21). */
export const relationOverrides: {
  from: string;
  to: string;
  type: RelationType;
  action: 'add' | 'remove';
  reason?: string;
}[] = [
  {
    from: 'apex-2',
    to: 'echo-buds-2-pro',
    type: 'complementary',
    action: 'add',
    reason: 'Hi-res earbuds with LDAC',
  },
  {
    from: 'nova-3-pro',
    to: 'watch-s2',
    type: 'complementary',
    action: 'add',
    reason: 'Smartwatch with Bluetooth calling and GPS',
  },
  {
    from: 'home-hub-1',
    to: 'smart-plug-16a',
    type: 'complementary',
    action: 'add',
    reason: 'Smart plug to add to your Home Hub setup',
  },
  // Apex phones ship with a 1 m cable, so suggesting one is noise.
  { from: 'apex-2', to: 'cable-usb-c-1m', type: 'compatible', action: 'remove' },
  { from: 'apex-2-premium', to: 'cable-usb-c-1m', type: 'compatible', action: 'remove' },
];
