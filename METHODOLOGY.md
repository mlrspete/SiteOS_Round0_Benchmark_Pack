# Round 0 methodology

## Question

Which model is the best base candidate for SiteOS when asked to implement one realistic, intentionally designed website vertical slice through an otherwise identical neutral coding-agent harness?

The result is a ranking for this task under these conditions, not a universal ranking of intelligence or software-engineering quality.

## Experimental unit

One fresh agent session receives a clean copy of `app-starter/` and the exact bytes of `benchmark/task-prompt.md`. It may read and edit the worktree and run local shell commands. It has no browser-search, image-generation, MCP, external memory, native-agent skills, hidden evaluator or cross-run context.

Frozen controls:

- Node.js major version and operating environment;
- OpenCode `1.17.18` in pure mode;
- repository and lockfile checksums;
- prompt checksum;
- one standard high reasoning variant where the provider exposes it;
- 45-minute wall-clock ceiling;
- one uninterrupted attempt with no human intervention;
- identical visible verification commands;
- temperature/provider sampling defaults unless the provider supports a documented deterministic setting that works across all entrants.

Every invocation records model ID, provider, timestamps, exit state, prompt/repository hashes, session events, token usage, cost, retries, tool calls, file diff and evaluator output. A provider-side alias, fallback or unknown model revision invalidates the run.

## Cohort

All 14 entries in `benchmark/models.json` are intended to run. The former “reserve” label is retained only as provenance; it does not change scoring or conditions.

Before execution, every entry must pass a small unscored adapter preflight for streaming, multi-turn tool use, file editing, shell use, output length and exact model identity. Failure is reported as `not testable`; it is not silently replaced.

## Gates

A submission is ineligible for the visual-craft ranking if any of these occur:

1. dependency installation or production build fails;
2. `/` is blank, an error page or the wrong route;
3. the core filter, detail or enquiry journey cannot complete;
4. the page has material horizontal overflow at a required width;
5. keyboard access to the enquiry flow is blocked;
6. serious or critical automated accessibility violations remain.

The failure remains in the table with its diagnostics, time and cost. This prevents attractive screenshots from masking broken software.

## Score (100)

| Dimension | Points | Evidence |
|---|---:|---|
| Functional correctness | 25 | Automated user journeys, URL state, validation and state transitions |
| Responsive/content resilience | 20 | 360/768/1440 geometry, long title, missing media and overflow checks |
| Accessibility | 15 | Keyboard journey, focus behaviour, semantics, reduced motion and axe |
| Visual craft and intentionality | 20 | Blind two-reviewer screenshot rubric; median score |
| Code quality | 10 | Blind review of structure, maintainability, unnecessary complexity and errors |
| Verification discipline | 5 | Commands/tests actually run and truthful progress evidence |
| Operational efficiency | 5 | Completion, intervention-free reliability, elapsed time and normalized cost |

Automated checks produce 60 points. Reviewers score anonymized candidates identified only by random codes. Reviewers do not see company, model, cost or transcript. A third reviewer resolves any dimension differing by more than four points.

Operational efficiency is used as a tiebreak-sensitive component, not as a licence for a cheap but broken result to win. A hard-gate failure caps the overall score at 49.

## Repetition and advancement

Round 0 is a breadth screen: one scored run per model after an unscored adapter preflight. Because a single sample has high variance, the top five eligible models plus any model within three points of fifth place advance to Round 1. Round 1 uses three blinded repetitions with rotated order. No “champion” claim is made from Round 0 alone.

## Interpretation controls

- Prompt and starter are published after the freeze so results are reproducible.
- Model order is randomized after all preflights pass.
- Provider outages, quota errors and harness faults are distinguished from model failures.
- Native Codex, Claude Code, Gemini CLI and Copilot are a later product/harness test.
- OpenSpec, Spec Kit, tracer bullets, deep modules, visual generators and component catalogues are later controlled interventions run on the champion set.
- Image models are benchmarked separately because giving only some coding models generated assets would confound the comparison.

