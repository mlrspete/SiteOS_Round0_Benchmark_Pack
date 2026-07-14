# SiteOS Round 0 results

Generated: 2026-07-14T03:10:00.000Z

Harness: OpenCode 1.17.18 pure mode through OpenRouter; 30-minute ceiling; one scored attempt per model.

Scored runs: 0 / 8. Recorded scored-run cost: $0.0000 USD (adapter probes excluded).

> A blank score means the model has not completed the frozen run and blind review. “Not testable” is preferable to silently substituting a route or harness.

| Rank | Company | Model | Status | Gate | Auto /60 | Visual /20 | Code /10 | Verify /5 | Efficiency /5 | Minutes | Cost USD | Total /100 |
|---:|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| — | OpenAI | GPT-5.6 Sol | not run | — | — | — | — | — | — | — | — | — |
| — | Anthropic | Claude Fable 5 | not run | — | — | — | — | — | — | — | — | — |
| — | xAI / SpaceXAI | Grok 4.5 | not run | — | — | — | — | — | — | — | — | — |
| — | Moonshot AI | Kimi K2.7 Code | not run | — | — | — | — | — | — | — | — | — |
| — | Z.ai / Zhipu AI | GLM-5.2 | not run | — | — | — | — | — | — | — | — | — |
| — | MiniMax | MiniMax-M3 | not run | — | — | — | — | — | — | — | — | — |
| — | Xiaomi MiMo | MiMo-V2.5-Pro | not run | — | — | — | — | — | — | — | — | — |
| — | Meta | Llama 4 Maverick | not run | — | — | — | — | — | — | — | — | — |

## Cohort disclosure

The original 14 candidates were filtered by a frozen 3/3 adapter gate. These six candidates did not enter the ranked benchmark; their outcomes are compatibility/reliability findings, not coding-quality scores.

| Company | Model | Probe result | Disposition |
|---|---|---:|---|
| Google | Gemini 3.1 Pro Preview | 0/3 | route-incompatible |
| DeepSeek | DeepSeek V4 Pro | 2/3 | adapter-unstable |
| Alibaba Cloud / Qwen | Qwen3.7-Max | 2/3 | adapter-unstable |
| Mistral AI | Devstral 2 2512 | 0/3 | provider-error |
| StepFun | Step 3.7 Flash | 2/3 | adapter-unstable |
| NVIDIA | Nemotron 3 Ultra | 0/3 | adapter-incompatible |

Meta Muse Spark 1.1 was replaced before the original freeze because it was absent from the live OpenRouter model catalogue. Meta Llama 4 Maverick is the disclosed Meta entrant; it is not presented as the same model.

## Advancement

Round 0 advancement is decided only after every testable model finishes blind review. The top five gate-eligible models plus any eligible model within three points of fifth advance to three-run Round 1. This breadth screen does not establish a universal coding-model champion.
