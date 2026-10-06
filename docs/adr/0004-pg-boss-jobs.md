# 0004. Background jobs on pg-boss

- Status: accepted
- Date: 2026-10-06

## Context

Need timed and async work: 5-min stock hold expiry, late payment reconciliation, flash sale start/end, review prompts after delivery, pre-order date updates.

## Options

1. pg-boss (queue on Postgres).
2. BullMQ + Redis.
3. In-process timers.

## Decision

Option 1.

## Consequences

- \+ No Redis; jobs and data share transactions (enqueue with the hold).
- \+ Survives restarts, unlike in-process timers.
- − Lower throughput than Redis queues; fine at demo/MVP scale. Revisit if flash-sale load needs it.
