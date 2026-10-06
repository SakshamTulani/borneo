// Design tokens (docs/DESIGN.md). Source of truth: src/index.css must match (tokens.test.ts).

export type ColorToken = { name: string; hex: string; use: string };

export const colors: ColorToken[] = [
  { name: 'canvas', hex: '#f5f5f7', use: 'Page background (parchment)' },
  { name: 'surface', hex: '#ffffff', use: 'Cards, sheets, header' },
  { name: 'muted', hex: '#ececf0', use: 'Skeletons, hover, image wells, quiet fills' },
  { name: 'ink', hex: '#1d1d1f', use: 'Primary text' },
  { name: 'ink-muted', hex: '#636366', use: 'Secondary text' },
  { name: 'line', hex: '#e3e3e8', use: 'Hairlines, card borders' },
  { name: 'line-strong', hex: '#86868b', use: 'Input and control borders (≥ 3:1)' },
  { name: 'brand', hex: '#0f5b4e', use: 'The one accent: actions, links, focus, selection' },
  { name: 'brand-ink', hex: '#ffffff', use: 'Text on brand' },
  { name: 'brand-soft', hex: '#e6f2ee', use: 'Selected, highlights' },
  { name: 'tile', hex: '#1d1d1f', use: 'Dark section tiles (home hero)' },
  { name: 'on-tile', hex: '#f5f5f7', use: 'Text on dark tiles' },
  { name: 'on-tile-muted', hex: '#a1a1a6', use: 'Secondary text on dark tiles' },
  { name: 'brand-on-tile', hex: '#5cc9aa', use: 'Links on dark tiles' },
  { name: 'offer', hex: '#9c4a1e', use: 'Savings text (never alarm red)' },
  { name: 'offer-soft', hex: '#f7e8df', use: 'Offer chips' },
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
  { fg: 'brand', bg: 'canvas', min: 4.5 },
  { fg: 'ink-muted', bg: 'brand-soft', min: 4.5 },
  { fg: 'on-tile', bg: 'tile', min: 4.5 },
  { fg: 'on-tile-muted', bg: 'tile', min: 4.5 },
  { fg: 'brand-on-tile', bg: 'tile', min: 4.5 },
  { fg: 'offer', bg: 'canvas', min: 4.5 },
];

/** Display sizes carry tight tracking and weight 600; body is 17px / 1.47 (Apple reference). */
export const typeScale = [
  { name: 'xs', px: 12, use: 'Fine print' },
  { name: 'sm', px: 14, use: 'Captions, controls' },
  { name: 'base', px: 17, use: 'Body' },
  { name: 'tagline', px: 21, use: 'Card titles, sub-heads' },
  { name: 'headline', px: 28, use: 'Section heads' },
  { name: 'title', px: 40, use: 'Page titles' },
  { name: 'display', px: 56, use: 'Home hero' },
];

export const spacing = [4, 8, 12, 16, 24, 32, 48, 64, 80];

export const radii = [
  { name: 'sm', px: 8, use: 'Compact utility controls, inline images' },
  { name: 'md', px: 11, use: 'Inputs, selects' },
  { name: 'xl', px: 18, use: 'Cards, image wells' },
  { name: 'full', px: 9999, use: 'Buttons (pills), chips, badges' },
];

/** The only shadow: under product imagery resting on a surface. Never on cards, buttons or text. */
export const productShadow = '3px 5px 30px rgba(0, 0, 0, 0.22)';
