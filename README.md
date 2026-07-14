# SiteOS Round 0 — model-only vertical-slice benchmark

This repository is the reproducible Round 0 pack for comparing 14 coding models on one deliberately small website vertical slice. It tests the model, not the native IDE or agent product: every entrant receives the same files, prompt, tools, harness version, reasoning policy, wall-clock limit and evaluator.

The benchmark is frozen before any scored run. A run is valid only when the model adapter and immutable model ID pass preflight; aliases and silent fallbacks are forbidden.

## What the slice tests

The fictional Gridline Field Services page combines the things that separated the successful and unsuccessful parts of the earlier Morrow experiment:

- intentional visual design from a short creative contract;
- content-led responsive layout at 360, 768 and 1440 CSS pixels;
- filtering with URL state and service-detail interaction;
- an accessible modal form with deterministic validation/success states;
- restrained motion with reduced-motion support;
- a long-title fixture and a missing-media fixture;
- build quality, keyboard use, accessibility and runtime resilience.

It does **not** test image generation, Storybook, MCP, OpenSpec, Spec Kit, multi-agent strategy or the full SiteOS workflow. Those are held constant or absent so Round 0 can identify a base model champion before testing stack interventions.

## Repository map

- `benchmark/` — frozen cohort, prompt, scoring and run rules;
- `app-starter/` — identical clean repository copied into every run;
- `evaluator/` — evaluator that is not shown to the agent;
- `scripts/` — preflight, isolated-run and reporting commands;
- `runs/` — generated worktrees and immutable run evidence.

## Required workflow

```bash
npm ci
npm run preflight
npm run prepare:run -- --model openai-gpt-5-6-sol
npm run run:model -- --model openai-gpt-5-6-sol --confirm-paid
npm run evaluate -- --model openai-gpt-5-6-sol
npm run report
```

Paid runs additionally require `SITEOS_TOTAL_BUDGET_USD` and the provider credential named in `benchmark/models.json`. The runner refuses to start without explicit confirmation. Keep credentials outside the repository.

See `METHODOLOGY.md` for fairness controls, scoring and interpretation.

