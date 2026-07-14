# Recover the v1.0.2 Round 0 execution

The first v1.0.2 model outputs are preserved, but its automated scores and screenshots are invalid. Chromium terminated between alternating tests, entrance transitions were inspected before settling, OpenAI received a provider 502 before making an edit, and MiniMax continued beyond the soft 40-step message.

Version 1.0.3 salvages the six valid model worktrees without new inference and creates documented replacement experimental units only for OpenAI and MiniMax.

## 1. Preserve invalid experimental units

From the execution branch, create a local audit directory and move the two invalid runs. Do not delete them.

```bash
mkdir -p invalid-runs/v1.0.2
mv runs/openai-gpt-5-6-sol invalid-runs/v1.0.2/
mv runs/minimax-m3 invalid-runs/v1.0.2/
```

The original diagnostics archive should also remain in Downloads.

## 2. Calibrate the corrected evaluator

```bash
npm ci
npm run calibrate
```

Do not continue unless calibration reports `passed: true`, `automatedScore: 26`, and `noInfrastructureFailure: true`.

## 3. Re-evaluate the six preserved worktrees

```bash
for model in \
  anthropic-claude-fable-5 \
  meta-llama-4-maverick \
  moonshot-kimi-k2-7-code \
  xai-grok-4-5 \
  xiaomi-mimo-v2-5-pro \
  zai-glm-5-2
do
  npm run evaluate -- --model "$model" || true
done
```

An evaluator exit of 1 is expected when a model genuinely fails a hard gate. It is not acceptable if `validEvaluation` is false or `infrastructureFailures` is non-empty.

## 4. Run replacement units for OpenAI and MiniMax

These use the original frozen prompt, starter, model route, candidate code and run-order record. They are executed later than their original positions and must be disclosed as replacements.

```bash
for model in openai-gpt-5-6-sol minimax-m3
do
  npm run prepare:run -- --model "$model"
  npm run run:model -- --model "$model" --confirm-paid || true
  npm run evaluate -- --model "$model" || true
done
```

`step-limited` is a valid, disclosed MiniMax outcome if the hard 40-step ceiling is reached. A provider/runtime failure is not valid and must remain unscored.

## 5. Audit before blind review

```bash
node - <<'NODE'
const fs = require('fs')
const manifest = require('./benchmark/models.json')
const rows = manifest.models.map((model) => {
  const root = `runs/${model.slug}/artifacts`
  const run = JSON.parse(fs.readFileSync(`${root}/run-record.json`, 'utf8'))
  const evaluation = JSON.parse(fs.readFileSync(`${root}/evaluation-summary.json`, 'utf8'))
  return {
    model: model.slug,
    run: run.status,
    steps: run.agentStepsObserved,
    evaluationValid: evaluation.validEvaluation,
    infrastructureFailures: evaluation.infrastructureFailures.length,
    automated: evaluation.automatedScore,
    gate: evaluation.hardGatePassed,
  }
})
console.table(rows)
if (rows.some((row) => !['completed', 'step-limited'].includes(row.run)
  || row.evaluationValid !== true
  || row.infrastructureFailures !== 0)) process.exit(1)
NODE
```

Only after this audit passes should review packets be regenerated and blind manual review begin.
