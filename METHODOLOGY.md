# Round 0 methodology

## Research question

Which model is the best base candidate for SiteOS when implementing one realistic, intentionally designed website vertical slice through an identical neutral harness?

The result applies to this task, cohort, gateway and date. OpenRouter makes the comparison practical and consistent, but it is still a gateway-mediated test—not proof of how each model performs in every native agent product.

## Experimental unit and fixed controls

One fresh session receives a clean copy of `app-starter/` and the exact bytes of `benchmark/task-prompt.md`. It may edit the worktree and run local commands. It cannot browse, generate images, call MCP tools, read the evaluator, use external memory or see another run.

Fixed controls:

- Node.js 22+, OpenCode `1.17.18`, pure mode and the committed lockfiles;
- OpenRouter route and expected canonical slug frozen in `benchmark/models.json`;
- gateway fallbacks disabled and required tool parameters enforced;
- documented high reasoning where the route supports it, otherwise the documented default;
- a runner-enforced hard ceiling of 40 agent steps, a 30-minute wall-clock ceiling, zero harness retries and zero human intervention;
- identical visible `npm run check` and `npm run build` commands;
- one scored run after three successful unscored adapter probes.

Session events, prompt/starter hashes, requested and observed identity metadata, token usage, cost, elapsed time, commands, output, screenshots, interaction video and evaluator results are retained. A contradictory routed model identity invalidates the run.

## Cohort and gateway preflight

Fourteen candidates from fourteen companies entered adapter qualification. Only the eight routes that passed all three corrected probes advance as equal ranked Round 0 entrants. “Former reserve” is provenance only. Before order is frozen, each active route must:

1. exist in the live OpenRouter catalogue with the expected canonical slug;
2. advertise `tools` and `tool_choice` support;
3. complete three isolated file-edit plus shell probes;
4. run with fallback disabled and the same provider-parameter policy used for scoring.

Failure is reported as not testable. It is never silently replaced. A 2/3 result is insufficient because intermittent tool execution would confound the scored run; the gate is not relaxed after observing results. DeepSeek V4 Pro, Qwen3.7-Max and Step 3.7 Flash were therefore excluded as adapter-unstable. Gemini 3.1 Pro Preview, Devstral 2 and Nemotron 3 Ultra were excluded for route/provider/adapter failures. These exclusions measure benchmark compatibility and reliability, not coding quality. The only pre-freeze substitution is disclosed: Meta Llama 4 Maverick replaces Muse Spark 1.1 because Muse was absent from the live OpenRouter catalogue.

## Gates

A submission is ineligible for the craft ranking if dependency installation or production build fails, the root page is blank/wrong, a core filter/detail/enquiry journey fails, material horizontal overflow exists, keyboard access to the enquiry flow is blocked, or serious/critical automated accessibility violations remain.

The result stays in the table with diagnostics, time and cost. Any hard-gate failure caps the total at 49.

## Score (100)

| Dimension | Points | Evidence |
|---|---:|---|
| Functional correctness | 25 | Automated journeys, URL state, validation and state transitions |
| Responsive/content resilience | 20 | 360/768/1440 geometry, long copy, local/missing media and mobile navigation |
| Accessibility | 15 | Keyboard, focus containment/return, semantics, reduced motion and axe |
| Visual craft | 20 | Two blind reviews of screenshots and interaction video |
| Code quality | 10 | Two blind reviews of the anonymized diff |
| Verification discipline | 5 | Objectively observed check/build commands and truthful progress evidence |
| Operational efficiency | 5 | Intervention-free completion, clean exit, elapsed time and fixed cost bands |

The first 60 points are deterministic evaluator checks. Manual scores use the median (the average when there are two). A third reviewer is mandatory when the first two visual totals differ by more than 4 or code totals by more than 3. Reviewers receive candidate-coded packets only and must not see identity, transcript, cost or run order.

Verification awards 2 points each for observed type-check and build commands, plus 1 for matching checked items and command evidence in `PROGRESS.md`. Efficiency awards 2 for completion without intervention, 1 for 20 minutes or less (0.5 for 20–30), 1 for a clean exit, and 1 for reported cost up to $5 (0.5 up to $10).

## Calibration and invalidation

`npm run calibrate` evaluates the deliberately incomplete starter. Calibration passes only when the starter installs/builds, all 15 scored checks execute without a browser/runtime failure, the evaluator detects the frozen missing core journeys, the hard gate fails and the automated score is exactly the 26/60 reference. This catches a permissive, overly strict or mechanically broken evaluator before money is spent.

Invalidate rather than score a run when the prompt/starter differs, identity contradicts the freeze, a human intervenes, the harness retries, or required evidence is missing. A hard step/time/budget stop retains the work produced at the ceiling and is scored with its stop status disclosed. Provider outages and evaluator/harness failures are reported separately from model failures and may receive one documented replacement experimental unit; they are never scored as model-quality failures.

Static screenshots and functional assertions inspect the settled end state of finite entrance transitions. Reduced-motion behaviour is tested separately. Accessibility checks do not treat temporarily translucent entrance text or an inert, dimmed page behind an open modal as the final contrast state.

## Advancement

Round 0 is a one-sample breadth screen. The top five gate-eligible models plus any eligible model within three points of fifth advance. Round 1 uses three blinded repetitions with rotated order. No definitive champion claim is made from Round 0 alone.

Native Codex, Claude Code, Gemini CLI and Copilot; OpenSpec/Spec Kit; tracer bullets/deep modules; Storybook/component catalogues; and Higgsfield/image models remain later controlled interventions on the champion cohort.
