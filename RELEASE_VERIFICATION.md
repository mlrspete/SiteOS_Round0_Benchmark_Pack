# Release verification

Version 1.0.3 is the corrective recovery release produced after inspection of the first eight-model v1.0.2 execution on 14 July 2026.

## Corrected defects

- Removes the local/serverless Chromium arguments that caused the browser to terminate between alternating Playwright tests.
- Detects browser/runtime failures inside individual Playwright results and marks the entire evaluation invalid instead of scoring them as model failures.
- Settles finite entrance animations before static functional, geometry, accessibility and screenshot inspection.
- Keeps global structural accessibility analysis while limiting open-modal colour-contrast analysis to the visible dialog rather than the inert dimmed page behind it.
- Changes the negative-control reference from the crash-masked 23/60 to the expected settled-runtime score of 26/60.
- Enforces the 40-step limit in the runner. OpenCode's own maximum-step message remains useful, but a model can no longer ignore it and continue receiving tools.
- Prevents manual finalization of invalid evaluator records or failed/provider-outage runs.

## Verification completed

- Every JavaScript module passes Node syntax validation.
- Every JSON manifest and schema parses.
- The release manifest contains eight active and six disclosed excluded candidates.
- The task prompt and starter-directory hashes exactly match the frozen v1.0.2 experimental units; the corrective release changes the harness/evaluator, not the task received by models.
- The corrected negative control completed all 15 scored checks with zero infrastructure failures and the expected 26/60 score.
- All six preserved v1.0.2 model worktrees were re-evaluated without new inference; every evaluation completed all 15 checks with `validEvaluation: true` and zero infrastructure failures.
- The release archive excludes dependencies, generated worktrees, credentials and execution artifacts and passes ZIP integrity validation.

## Operator verification required

Repeat `npm ci` and `npm run calibrate` in the benchmark WSL environment after overlaying this release. Calibration must report `passed: true`, `automatedScore: 26`, `noInfrastructureFailure: true` and all 15 scored checks executed. Then follow `RECOVERY_V1.0.3.md`; six preserved model worktrees require evaluation only, while OpenAI and MiniMax require documented replacement runs.
