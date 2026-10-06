import { colors, productShadow, radii, spacing, typeScale } from '@/shared/ui/tokens';
import { Logo } from '@/shared/ui/brand/Logo';

export function TokensSection() {
  return (
    <section aria-labelledby="tokens" className="space-y-6">
      <h2 id="tokens" className="text-headline">
        Tokens
      </h2>

      <div className="space-y-2">
        <h3 className="text-tagline">Logo (draft)</h3>
        <Logo />
      </div>

      <div className="space-y-2">
        <h3 className="text-tagline">Colour</h3>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {colors.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-xl border border-line bg-surface">
              <span
                className="block h-14 border-b border-line"
                style={{ background: `var(--${c.name})` }}
                aria-hidden
              />
              <span className="block p-2 text-sm">
                <span className="block font-medium">{c.name}</span>
                <span className="block font-mono text-xs text-ink-muted">{c.hex}</span>
                <span className="block text-xs text-ink-muted">{c.use}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-tagline">Type</h3>
        <p className="text-sm text-ink-muted">
          System SF Pro on Apple devices, Inter elsewhere. Headings 600 with tight tracking; body
          17px / 1.47. Prices and timers use tabular numerals.
        </p>
        <ul className="space-y-2">
          {typeScale.map((t) => (
            <li key={t.name} className="flex items-baseline gap-4">
              <span className="w-28 shrink-0 font-mono text-xs text-ink-muted">
                {t.name} · {t.px}px
              </span>
              <span
                className={t.px >= 21 ? 'font-heading font-semibold tracking-tight' : ''}
                style={{ fontSize: t.px }}
              >
                Confident, clear, warm
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-tagline">Spacing (4px grid, 80px between sections)</h3>
          <ul className="space-y-1">
            {spacing.map((s) => (
              <li key={s} className="flex items-center gap-3">
                <span className="w-10 font-mono text-xs text-ink-muted">{s}px</span>
                <span className="h-3 rounded-sm bg-brand" style={{ width: s }} aria-hidden />
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-tagline">Radius</h3>
          <ul className="flex gap-4">
            {radii.map((r) => (
              <li key={r.name} className="text-center text-xs text-ink-muted">
                <span
                  className="mb-1 block size-14 border-2 border-brand bg-brand-soft"
                  style={{ borderRadius: Math.min(r.px, 28) }}
                  aria-hidden
                />
                {r.name} · {r.use}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-tagline">Elevation</h3>
        <p className="text-sm text-ink-muted">
          No shadows on cards, buttons or text. Surfaces separate by colour (parchment, white, dark
          tile). The only shadow sits under product imagery.
        </p>
        <div className="flex flex-wrap gap-4">
          <span className="flex h-24 w-40 items-center justify-center rounded-xl bg-surface text-sm">
            Surface
          </span>
          <span className="flex h-24 w-40 items-center justify-center rounded-xl bg-tile text-sm text-on-tile">
            Dark tile
          </span>
          <span className="flex h-24 w-40 items-center justify-center rounded-xl bg-surface">
            <span
              className="size-12 rounded-sm bg-muted"
              style={{ boxShadow: productShadow }}
              aria-hidden
            />
          </span>
        </div>
      </div>
    </section>
  );
}
