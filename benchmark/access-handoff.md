# Execution access handoff

The benchmark pack can run only after each entrant is reachable through the frozen OpenCode harness. Keep credentials in local environment secrets; never commit them or paste them into issues, logs or chat.

## Required access

The most defensible route is each company's official API because it makes model identity and billing easiest to audit. Required variables are listed in `.env.example` and `models.json`.

A unified gateway may reduce account setup for the providers it supports, but only use it when all of the following are true:

- the exact non-alias requested model is listed;
- routing can be pinned to one provider with fallback disabled;
- the returned provider/model identity is recorded;
- tool-call and reasoning semantics match the official endpoint;
- cost telemetry is available.

Do not mix official and third-party endpoints opportunistically after runs begin. Endpoint choice is part of the frozen run manifest.

## Budget gate

Before paid preflights, set both:

```text
SITEOS_TOTAL_BUDGET_USD=<approved total ceiling>
SITEOS_PER_RUN_BUDGET_USD=<approved single-run ceiling>
```

The runner checks recorded prior spend and watches OpenCode's per-step cost telemetry. A paid adapter is not eligible unless cost telemetry has itself passed preflight; an external provider/account spending cap remains the final backstop.

A practical initial authorization is **US$100 total / US$15 per run**, with the expectation that preflights will produce a tighter estimate before the 14 scored invocations. This is a ceiling, not an expected charge.

## Adapter freeze checklist

For every model:

1. list models from the authenticated endpoint and copy the exact ID;
2. disable aliases, automatic routing and fallbacks;
3. run three small isolated tool/edit/stream probes;
4. confirm high-reasoning semantics and unsupported sampling parameters;
5. confirm context, output, rate and regional limits;
6. confirm returned identity, request IDs, token counts and cost telemetry;
7. update only `harnessModel`, `variant` and `adapterStatus` in `models.json`;
8. freeze a commit before randomizing run order.

