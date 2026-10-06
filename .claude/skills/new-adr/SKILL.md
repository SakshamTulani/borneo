---
name: new-adr
description: Record a technical decision as a MADR in docs/adr with status proposed and add it to the index. Use whenever a new library, pattern, infrastructure or cross-cutting technical choice is made.
---

# New ADR

Rules: [ADR index](../../../docs/adr/README.md) · [git-workflow](../../../docs/agents/git-workflow.md)

1. Next number = highest in `docs/adr/` + 1 (no gaps, no duplicates).
2. File `docs/adr/NNNN-kebab-title.md`, copy the shape of an existing ADR: `# NNNN. Title`, `- Status: proposed`, `- Date: YYYY-MM-DD`, then `## Context`, `## Options`, `## Decision`, `## Consequences`.
3. Status is always `proposed`. Only the owner sets `accepted`. Superseding: owner sets old one to `superseded by NNNN`.
4. Add a row to `docs/adr/README.md` with the same status.
5. No code may depend on it until accepted. Link it from [ARCHITECTURE](../../../docs/ARCHITECTURE.md) if it changes the stack.
6. `pnpm check:rules` (ADR check).
