# Release verification

Validated on 13 July 2026 before packaging.

## Passed

- Root dependency lock installs with the pinned evaluator and OpenCode `1.17.18`.
- Every JavaScript module passes Node syntax validation; all JSON manifests and schemas parse.
- The starter installs, type-checks and builds from its committed lockfile.
- All 14 frozen OpenRouter routes are present in the live catalogue, match the expected canonical slugs and declare `tools` plus `tool_choice` support.
- The ffmpeg evidence runtime is available.
- Negative-control calibration executed all 15 scored checks without an infrastructure failure. The deliberately incomplete starter scored 23/60, failed the core journey gate as intended, and produced screenshots plus a 2.75-second interaction-evidence video.
- The release archive is checked for excluded dependencies, generated worktrees and credential material, then integrity-tested after creation.

## Deliberately pending for the operator

Paid adapter probes and scored model runs are not executed in the release pack because no OpenRouter credential is embedded. After setting the three budget variables and `OPENROUTER_API_KEY`, run `npm run adapter:preflight -- --all --confirm-paid`. The run order cannot be frozen until all 14 three-probe records pass.

This pending state protects credentials and spend; it is the first documented execution step, not an unfinished implementation.
