# OpenRouter adapter preflight

Run this after the local pack and negative-control calibration pass, and before freezing run order:

```bash
npm run adapter:preflight -- --all --confirm-paid
```

For each model, the script checks the live OpenRouter route, canonical slug, tool parameters and expiry, then performs three isolated five-minute probes through the exact scored OpenCode route/variant. Every probe must edit an exact file, use the shell to verify it, exit cleanly and retain usage/identity metadata.

Successful records are written to `artifacts/adapters/<model-slug>.json`. The run order cannot be frozen until all 14 records are verified. Use `--model <slug>` for a single route and `--force` only when deliberately repeating an existing verified adapter.

The gateway policy disables provider fallbacks and requires declared tool parameters. OpenRouter routing metadata is requested and retained when exposed by the harness. If the returned identity conflicts with the frozen route, mark the model not testable and investigate; do not substitute it during the run.

## Frozen cohort note

The live OpenRouter Models API was checked on 13 July 2026. Muse Spark 1.1 was absent, so the disclosed Meta entrant is Llama 4 Maverick. This substitution is frozen before testing and is not described as a Muse result.

Catalogue, routing and usage references:

- <https://openrouter.ai/api/v1/models>
- <https://openrouter.ai/docs/guides/routing/provider-selection>
- <https://openrouter.ai/docs/guides/features/router-metadata>
- <https://openrouter.ai/docs/cookbook/administration/usage-accounting>
