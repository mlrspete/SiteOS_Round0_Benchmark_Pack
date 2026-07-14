# OpenRouter execution handoff

Use one dedicated OpenRouter API key with an account-level spending limit. Keep it in the shell or secret manager; never commit it or paste it into a report.

## Required environment

```text
OPENROUTER_API_KEY=<secret>
SITEOS_TOTAL_BUDGET_USD=75
SITEOS_PER_RUN_BUDGET_USD=10
SITEOS_PREFLIGHT_BUDGET_USD=5
```

The defaults are authorization ceilings, not expected spend. The benchmark runner also watches per-step cost telemetry, but the OpenRouter key limit is the final backstop because a streaming step can cross a local ceiling before it ends.

## Frozen routing policy

- Exact OpenRouter model IDs and expected canonical slugs live in `benchmark/models.json`.
- OpenRouter model fallback is disabled.
- Providers must support every requested parameter.
- OpenRouter Auto Exacto supplies the same quality-first tool-routing policy to every entrant.
- Router metadata, returned model identity, token counts and cost are retained when the gateway exposes them.
- OpenCode retries are disabled. A transport failure is reported separately from a model-quality failure.

## Required preflight

1. `npm run preflight` validates the pack and current OpenRouter catalog.
2. `npm run adapter:preflight -- --all --confirm-paid` performs three tiny isolated edit/shell/stream probes for every model.
3. `npm run freeze:order` refuses to randomize until all 14 adapters have passed.
4. Any catalog revision, alias resolution, missing tool support or unknown returned model invalidates that entrant until reviewed.

Meta Muse Spark 1.1 was not listed by OpenRouter at the gateway freeze. The manifest transparently substitutes Meta Llama 4 Maverick so the single-gateway cohort remains runnable; reports retain this disclosure.
