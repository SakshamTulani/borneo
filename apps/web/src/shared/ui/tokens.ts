// Design tokens (docs/DESIGN.md). Source of truth: src/index.css must match (tokens.test.ts).

export type ColorToken = { name: string; hex: string; use: string };

export const colors: ColorToken[] = [
  { name: 'canvas', hex: '#faf8f5', use: 'Page background' },
  { name: 'surface', hex: '#ffffff', use: 'Cards, sheets' },
  { name: 'muted', hex: '#f2eee8', use: 'Skeletons, hover, quiet fills' },
  { name: 'ink', hex: '#1d1b19', use: 'Primary text' },
  { name: 'ink-muted', hex: '#5e5953', use: 'Secondary text' },
  { name: 'line', hex: '#e7e2db', use: 'Dividers, card borders' },
  { name: 'line-strong', hex: '#8c857c', use: 'Input and control borders (≥ 3:1)' },
  { name: 'brand', hex: '#0f5b4e', use: 'Primary actions, links, focus' },
  { name: 'brand-ink', hex: '#ffffff', use: 'Text on brand' },
  { name: 'brand-soft', hex: '#e3f0ec', use: 'Selected, highlights' },
  { name: 'offer', hex: '#9c4a1e', use: 'Offers, savings (never alarm red)' },
  { name: 'offer-soft', hex: '#f7e8df', use: 'Offer chips and cards' },
  { name: 'success', hex: '#1f7a44', use: 'In stock, delivered' },
  { name: 'success-soft', hex: '#e4f2ea', use: 'Success fills' },
  { name: 'warning', hex: '#9a6200', use: 'Real low stock, delays' },
  { name: 'warning-soft', hex: '#fbf0d9', use: 'Warning fills' },
  { name: 'danger', hex: '#b3261e', use: 'Errors, not deliverable' },
  { name: 'danger-soft', hex: '#fbe7e5', use: 'Error fills' },
  { name: 'info', hex: '#2b5c9e', use: 'Neutral notices' },
  { name: 'info-soft', hex: '#e6eef8', use: 'Notice fills' },
  { name: 'demo', hex: '#6b4fa0', use: 'Demo-mode labels only' },
  { name: 'demo-soft', hex: '#efeaf7', use: 'Demo-mode box' },
];

/** Text/background pairs that must meet WCAG AA. min 4.5 = text, 3 = UI boundary. */
export const contrastPairs: { fg: string; bg: string; min: number }[] = [
  { fg: 'ink', bg: 'canvas', min: 4.5 },
  { fg: 'ink', bg: 'muted', min: 4.5 },
  { fg: 'ink-muted', bg: 'canvas', min: 4.5 },
  { fg: 'ink-muted', bg: 'surface', min: 4.5 },
  { fg: 'ink-muted', bg: 'muted', min: 4.5 },
  { fg: 'brand-ink', bg: 'brand', min: 4.5 },
  { fg: 'brand', bg: 'surface', min: 4.5 },
  { fg: 'brand', bg: 'brand-soft', min: 4.5 },
  { fg: 'offer', bg: 'surface', min: 4.5 },
  { fg: 'offer', bg: 'offer-soft', min: 4.5 },
  { fg: 'success', bg: 'success-soft', min: 4.5 },
  { fg: 'warning', bg: 'warning-soft', min: 4.5 },
  { fg: 'danger', bg: 'surface', min: 4.5 },
  { fg: 'danger', bg: 'danger-soft', min: 4.5 },
  { fg: 'info', bg: 'info-soft', min: 4.5 },
  { fg: 'demo', bg: 'demo-soft', min: 4.5 },
  { fg: 'line-strong', bg: 'surface', min: 3 },
];

export const typeScale = [
  { name: 'xs', px: 12 },
  { name: 'sm', px: 14 },
  { name: 'base', px: 16 },
  { name: 'lg', px: 18 },
  { name: 'xl', px: 20 },
  { name: '2xl', px: 24 },
  { name: '3xl', px: 30 },
  { name: '4xl', px: 36 },
  { name: '5xl', px: 48 },
];

export const spacing = [4, 8, 12, 16, 24, 32, 48, 64];

export const radii = [
  { name: 'md', px: 6, use: 'Inputs, buttons' },
  { name: 'xl', px: 12, use: 'Cards' },
  { name: 'full', px: 999, use: 'Chips, badges' },
];
