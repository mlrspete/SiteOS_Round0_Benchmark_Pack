# SiteOS Round 0 benchmark pack

This pack compares 14 coding models from 14 companies on one small, production-shaped website slice. Every entrant runs through the same pinned OpenCode harness and OpenRouter gateway with the same starter, prompt, tools, step limit, 30-minute ceiling and evaluator.

Round 0 answers a narrow question: **which models are the strongest base candidates for the later SiteOS stack tests?** It does not compare native coding products, specification systems, image models or the complete SiteOS workflow.

## What is tested

The fictional Gridline Field Services page requires intentional visual design, responsive composition, URL-backed filters, a keyboard-operable service detail, an accessible modal form, reduced-motion support, long-copy resilience and an intentional missing-media state.

Scoring is 60 points automated and 40 points independently reviewed/objective. A core gate failure caps the total at 49. The deliberately incomplete starter is included as the evaluator's negative control.

## Prerequisites

- Node.js 22 or newer;
- ffmpeg available on `PATH` for deterministic interaction-video evidence;
- one OpenRouter API key with access to all cohort routes;
- enough OpenRouter credit and an account-level spend limit;
- two reviewers who can review anonymized packets independently.

Copy `.env.example` values into your shell or an untracked `.env` file. Never commit credentials. The runner's dollar ceilings are safeguards based on reported usage, not a replacement for OpenRouter's account limit.

## Frozen workflow

```bash
npm ci
npm run preflight
npm run calibrate
npm run adapter:preflight -- --all --confirm-paid
npm run freeze:order
npm run run:round0 -- --confirm-paid
npm run review:packet -- --all
```

Give each reviewer only the folders under `review-packets/`. For every candidate, record two independent reviews:

```bash
npm run review:record -- --candidate C-0000 --reviewer R1 --visual 16 --code 8 --confidence high --notes "Concise factual notes"
npm run review:record -- --candidate C-0000 --reviewer R2 --visual 15 --code 7 --confidence medium --notes "Concise factual notes"
```

A third review is required when the first two visual totals differ by more than 4 points or code totals by more than 3. Finalize each model and build the report:

```bash
npm run score -- --model <model-slug>
npm run report
```

Use the frozen order in `benchmark/run-order.json` and the slugs in `benchmark/models.json`. `run:round0` executes sequentially and continues after an individual failure. For a controlled single-run diagnosis, use `prepare:run`, `run:model` and `evaluate` in that order.

## Repository map

- `benchmark/` — frozen cohort, task, rules, schemas and scorecard;
- `app-starter/` — identical clean repository copied into every run;
- `evaluator/` — hidden-from-agent Playwright and axe checks;
- `scripts/` — preflight, execution, evidence, blinding, scoring and reporting;
- `artifacts/`, `runs/`, `review-packets/` — generated locally.

See `METHODOLOGY.md` for validity rules and interpretation limits. See `benchmark/access-handoff.md` for the five-minute gateway setup.
