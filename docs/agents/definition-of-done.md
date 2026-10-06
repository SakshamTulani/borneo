# Definition of done

A change is done when all of these hold.

## Automated (`pnpm check` must be green)

Format, lint, typecheck, dependency boundaries + canaries, ADR structure, hook naming, customer scoping, boundary anchors, all tests.

## Reviewer checks (prose-only rules, not machine-enforced)

1. Business rules live in `@borneo/shared` as pure functions; UI and routes only call them.
2. Every new rule function has tests named after its `D-xx` ID; DECISIONS.md updated if a rule changed (latest wins, conflict logged).
3. Money is integer paise end to end; formatting only at render.
4. Headline price is the selling price; effective price only as a secondary line when it applies to everyone (D-30–33).
5. No fake urgency, fake scarcity, fake discount or pre-ticked option (D-06, D-140).
6. Compatibility claims come only from filled structured attributes (D-22).
7. Every cross-sell suggestion shows a reason and respects surface limits (D-123–124); none in payment.
8. Services/repositories get dependencies injected; external effects only via adapters.
9. Stock changes are single conditional updates; holds go through pg-boss expiry.
10. UI is SSR-safe; head tags via `pageHead()`; filters in URL.
11. Components meet DESIGN.md: tokens only, all states (loading, empty, error, disabled), ≥ 44px targets, keyboard path, axe test.
12. Demo-only behaviour is behind `DEMO_MODE` and listed as a production blocker in DECISIONS.md.
13. New technical choice ⇒ ADR written as `proposed`, not used until accepted.
14. ROADMAP status and PROGRESS log updated at phase end.
