# 0003. Adapters for external services

- Status: accepted
- Date: 2026-10-06

## Context

Demo sends nothing outside the system, but production needs email, payments, analytics, courier, bot protection.

## Options

1. Port interfaces with demo implementations, chosen by `DEMO_MODE`.
2. Integrate real providers in sandbox mode now.
3. Hardcode demo behaviour in pages.

## Decision

Option 1. Ports: `NotificationAdapter` (demo: on-screen box + log + inbox), `PaymentGateway` (mock: success/fail/late success), `Analytics` (console + log), `CourierTracking`, `BotProtection`.

## Consequences

- \+ Real providers replace adapters without touching pages or services.
- \+ Mock gateway can simulate edge cases (late success after hold expiry).
- − Real-provider quirks discovered later; each is a production blocker.
- Production start refuses `DEMO_MODE=true`.
