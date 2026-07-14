# Release verification

Validated on 13 July 2026 before packaging. Version 1.0.2 incorporates operator qualification findings from 14 July 2026.

## Passed

- Root dependency lock installs with the pinned evaluator and OpenCode `1.17.18`.
- Every JavaScript module passes Node syntax validation; all JSON manifests and schemas parse.
- The starter installs, type-checks and builds from its committed lockfile.
- The active eight-model manifest contains unique companies and routes, and preserves the six excluded candidates with explicit non-scored dispositions.
- The ffmpeg evidence runtime is available.
- Negative-control calibration executed all 15 scored checks without an infrastructure failure. The deliberately incomplete starter scored 23/60, failed the core journey gate as intended, and produced screenshots plus a 2.75-second interaction-evidence video.
- Calibration requires the exact frozen 23/60 reference score, Linux/WSL setup documents Chromium runtime dependencies, and adapter probes explicitly require the final newline they validate.
- All eight active routes passed 3/3 corrected adapter probes during cohort qualification. Three 2/3 routes and three failed routes were excluded rather than weakening the frozen reliability gate.
- The release archive is checked for excluded dependencies, generated worktrees and credential material, then integrity-tested after creation.

## Deliberately pending for the operator

Scored model runs are not executed in the release pack because no OpenRouter credential is embedded. Adapter records are local generated evidence and are also not embedded. A fresh operator must set the three budget variables and `OPENROUTER_API_KEY`, then run `npm run adapter:preflight -- --all --confirm-paid`; an existing qualified execution worktree can retain its eight verified local records. The run order cannot be frozen until all eight active three-probe records pass.

This pending state protects credentials and spend; it is the first documented execution step, not an unfinished implementation.
